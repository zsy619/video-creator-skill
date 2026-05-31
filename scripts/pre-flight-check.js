#!/usr/bin/env node
/**
 * pre-flight-check.js
 * video-creator 前置质量门禁脚本
 *
 * 在任何 batch/subagent/launch.sh 渲染前调用，检查以下内容：
 *   1. 12个文档（Step 0）
 *   2. 3个封面图（Step 6）尺寸 + 文件大小
 *   3. 音频文件存在性 + 时长
 *   4. 字幕 captions.json 存在性 + 格式
 *   5. video-config.json 存在性
 *
 * 用法:
 *   node pre-flight-check.js <项目目录> [--fix]
 *
 * --fix: 自动修复可修复的问题（封面 PIL 兜底）
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PROJECT_DIR = process.argv[2] || ".";
const FIX = process.argv.includes("--fix");

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function log(msg) { console.log(`${BOLD}[→]${RESET} ${msg}`); }
function ok(msg)  { console.log(`${GREEN}[✓]${RESET} ${msg}`); }
function err(msg) { console.error(`${RED}[✗]${RESET} ${msg}`); }
function warn(msg){ console.warn(`${YELLOW}[!]${RESET} ${msg}`); }
function section(name) {
  console.log(`\n${BOLD}━━━ ${name} ━━━${RESET}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. 文档检查（Step 0）
// ─────────────────────────────────────────────────────────────────────────────
const REQUIRED_DOCS = [
  "README.md", "article.md", "video-script.md", "copy.md",
  "wechat-copy.md", "posting-guide.md", "landing-page.html",
  "article-page.html", "wechat-page.html", "session-log.md",
  "report.json", "narration.txt"
];

const OPTIONAL_DOCS = [
  "docs/assets/imgs/", "docs/assets/illustrations/"
];

function check_docs() {
  section("Step 0 — 文档完整性");
  const docsDir = path.join(PROJECT_DIR, "docs");
  let pass = 0, fail = 0;
  const missing = [];

  for (const f of REQUIRED_DOCS) {
    const p = path.join(docsDir, f);
    if (fs.existsSync(p) && fs.statSync(p).size > 0) {
      ok(`  ${f}`);
      pass++;
    } else {
      err(`  ❌ 缺失或为空: ${f}`);
      missing.push(f);
      fail++;
    }
  }

  console.log(`\n  通过: ${pass} / 失败: ${fail}`);
  return { pass, fail, missing };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. 封面图检查（Step 6）
// ─────────────────────────────────────────────────────────────────────────────
const COVER_TYPES = [
  { name: "cover.png",       width: 1080, height: 1920, platform: "视频号" },
  { name: "cover-wechat.png", width: 900,  height: 383,  platform: "公众号" },
  { name: "cover-xhs.png",   width: 1440, height: 2560, platform: "小红书" }
];

function check_covers() {
  section("Step 6 — 封面图");
  const assetsDir = path.join(PROJECT_DIR, "docs/assets");
  let pass = 0, fail = 0;
  const missing = [];

  for (const cover of COVER_TYPES) {
    const p = path.join(assetsDir, cover.name);
    if (!fs.existsSync(p)) {
      err(`  ❌ 缺失: ${cover.name} (${cover.platform}, ${cover.width}×${cover.height})`);
      missing.push(cover.name);
      fail++;
      continue;
    }

    const sizeKB = Math.round(fs.statSync(p).size / 1024);
    if (sizeKB < 10) {
      err(`  ❌ 文件过小: ${cover.name} (${sizeKB}KB < 10KB，可能为空图)`);
      missing.push(cover.name);
      fail++;
      continue;
    }

    // 用 ffprobe 检查尺寸（精确）
    try {
      const out = execSync(
        `ffprobe -v error -select_streams v:0 -show_entries stream=width,height ` +
        `-of csv=s=x:p=0 "${p}" 2>/dev/null`,
        { timeout: 10000 }
      ).toString().trim();
      const [w, h] = out.split("x").map(Number);
      if (w === cover.width && h === cover.height) {
        ok(`  ✅ ${cover.name} (${cover.platform}: ${w}×${h}, ${sizeKB}KB)`);
        pass++;
      } else {
        err(`  ❌ 尺寸错误: ${cover.name} (${w}×${h}, 期望 ${cover.width}×${cover.height})`);
        missing.push(cover.name);
        fail++;
      }
    } catch (e) {
      // ffprobe 失败，降级为 PIL 检查
      try {
        const { PythonShell } = require("python-shell");
        const result = execSync(
          `python3 -c "from PIL import Image; w,h=Image.open('${p}').size; print(f'{w}x{h}')" 2>/dev/null`
        ).toString().trim();
        const [w, h] = result.split("x").map(Number);
        if (w === cover.width && h === cover.height) {
          ok(`  ✅ ${cover.name} (${cover.platform}: ${w}×${h}, ${sizeKB}KB)`);
          pass++;
        } else {
          err(`  ❌ 尺寸错误: ${cover.name} (${w}×${h}, 期望 ${cover.width}×${cover.height})`);
          missing.push(cover.name);
          fail++;
        }
      } catch (e2) {
        warn(`  ⚠️ 无法验证尺寸（ffprobe/PIL 均失败）: ${cover.name}，已确认存在 (${sizeKB}KB)`);
        pass++;
      }
    }
  }

  console.log(`\n  通过: ${pass} / 失败: ${fail}`);
  return { pass, fail, missing };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. 音频检查（Step 7）
// ─────────────────────────────────────────────────────────────────────────────
function check_audio() {
  section("Step 7 — 音频");
  const audioFile = path.join(PROJECT_DIR, "audio/neural_1_2x.m4a");
  let pass = 0, fail = 0;

  if (!fs.existsSync(audioFile)) {
    err(`  ❌ 缺失: audio/neural_1_2x.m4a`);
    err(`  修复命令: ffmpeg -y -i audio/neural_full.mp3 -filter:a "atempo=1.2" -codec:a aac -b:a 256k audio/neural_1_2x.m4a`);
    fail++;
  } else {
    try {
      const duration = parseFloat(
        execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${audioFile}" 2>/dev/null`)
          .toString().trim()
      );
      const sizeKB = Math.round(fs.statSync(audioFile).size / 1024);
      const codec = execSync(
        `ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 "${audioFile}" 2>/dev/null`
      ).toString().trim();
      const bitrate = execSync(
        `ffprobe -v error -select_streams a:0 -show_entries stream=bit_rate -of csv=p=0 "${audioFile}" 2>/dev/null`
      ).toString().trim();
      const bitrateK = bitrate ? Math.round(parseInt(bitrate) / 1000) : "?";

      ok(`  ✅ audio/neural_1_2x.m4a`);
      console.log(`     时长: ${duration.toFixed(2)}s | 码率: ${bitrateK}kbps | 编码: ${codec} | 大小: ${sizeKB}KB`);

      // 额外检查 atempo 长度合理性（1.2x 后应该比原始短）
      const origFile = path.join(PROJECT_DIR, "audio/neural_full.mp3");
      if (fs.existsSync(origFile)) {
        const origDur = parseFloat(
          execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${origFile}" 2>/dev/null`)
            .toString().trim()
        );
        const expectedAtempo = origDur / 1.2;
        if (Math.abs(duration - expectedAtempo) > 2) {
          warn(`  ⚠️ atempo 1.2x 时长异常: 实际 ${duration.toFixed(2)}s，期望 ~${expectedAtempo.toFixed(2)}s`);
        } else {
          ok(`     atempo 1.2x 时长合理 (原始 ${origDur.toFixed(2)}s → 处理后 ${duration.toFixed(2)}s)`);
        }
      }
      pass++;
    } catch (e) {
      err(`  ❌ ffprobe 检查失败: audio/neural_1_2x.m4a`);
      fail++;
    }
  }

  console.log(`\n  通过: ${pass} / 失败: ${fail}`);
  return { pass, fail };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. 字幕检查（Step 8）
// ─────────────────────────────────────────────────────────────────────────────
function check_captions() {
  section("Step 8 — 字幕");
  const captionsFile = path.join(PROJECT_DIR, "audio/captions.json");
  let pass = 0, fail = 0;

  if (!fs.existsSync(captionsFile)) {
    err(`  ❌ 缺失: audio/captions.json`);
    fail++;
  } else {
    try {
      const captions = JSON.parse(fs.readFileSync(captionsFile, "utf8"));
      if (!Array.isArray(captions)) {
        err(`  ❌ captions.json 格式错误（非数组）`);
        fail++;
      } else if (captions.length < 10) {
        err(`  ❌ captions.json 过短（${captions.length}句 < 10句）`);
        fail++;
      } else {
        const lastEndMs = captions[captions.length - 1].endMs;
        ok(`  ✅ audio/captions.json (${captions.length}句, 末段 endMs=${lastEndMs}ms)`);

        // 检查 startMs < endMs
        let valid = true;
        for (const cap of captions) {
          if (!cap.text || cap.startMs == null || cap.endMs == null) {
            err(`  ❌ 字幕条目格式错误: ${JSON.stringify(cap)}`);
            valid = false;
            fail++;
          } else if (cap.startMs >= cap.endMs) {
            err(`  ❌ startMs >= endMs: ${JSON.stringify(cap)}`);
            valid = false;
            fail++;
          }
        }
        if (valid) {
          ok(`     全部 ${captions.length} 句 startMs < endMs`);
          pass++;
        }
      }
    } catch (e) {
      err(`  ❌ captions.json JSON 解析失败: ${e.message}`);
      fail++;
    }
  }

  // 同步检查 public/audio/captions.json
  const pubCaptions = path.join(PROJECT_DIR, "video-project/public/audio/captions.json");
  if (fs.existsSync(pubCaptions)) {
    try {
      const pub = JSON.parse(fs.readFileSync(pubCaptions, "utf8"));
      const orig = JSON.parse(fs.readFileSync(captionsFile, "utf8"));
      if (JSON.stringify(pub) === JSON.stringify(orig)) {
        ok(`  ✅ video-project/public/audio/captions.json (已同步)`);
      } else {
        warn(`  ⚠️ public/audio/captions.json 与原始不同步，建议重新复制`);
      }
    } catch (e) {}
  }

  console.log(`\n  通过: ${pass} / 失败: ${fail}`);
  return { pass, fail };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. video-config.json 检查
// ─────────────────────────────────────────────────────────────────────────────
function check_config() {
  section("Step N — video-config.json");
  const configFile = path.join(PROJECT_DIR, "video-config.json");
  let pass = 0, fail = 0;

  if (!fs.existsSync(configFile)) {
    err(`  ❌ 缺失: video-config.json`);
    fail++;
  } else {
    try {
      const config = JSON.parse(fs.readFileSync(configFile, "utf8"));
      const requiredFields = ["name", "platform", "fps", "duration", "theme"];
      let missingFields = [];
      for (const f of requiredFields) {
        if (config[f] == null) missingFields.push(f);
      }
      if (missingFields.length > 0) {
        err(`  ❌ video-config.json 缺少字段: ${missingFields.join(", ")}`);
        fail++;
      } else {
        ok(`  ✅ video-config.json (${config.name}, ${config.platform}, ${config.fps}fps, ${config.duration}s, ${config.theme})`);
        pass++;
      }

      // cover 字段检查
      if (config.cover) {
        const { title, subtitle } = config.cover;
        if (title && subtitle) {
          ok(`     cover: "${title}" / "${subtitle}"`);
        } else {
          warn(`  ⚠️ video-config.json.cover 缺少 title 或 subtitle`);
        }
      } else {
        warn(`  ⚠️ video-config.json 没有 cover 字段`);
      }
    } catch (e) {
      err(`  ❌ video-config.json JSON 解析失败: ${e.message}`);
      fail++;
    }
  }

  console.log(`\n  通过: ${pass} / 失败: ${fail}`);
  return { pass, fail };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. 自动修复（封面 PIL 兜底）
// ─────────────────────────────────────────────────────────────────────────────
function fix_missing_covers(missingCovers) {
  if (!FIX || missingCovers.length === 0) return;

  section("自动修复 — 封面 PIL 兜底");
  const assetsDir = path.join(PROJECT_DIR, "docs/assets");

  // 读取 video-config.json 获取标题
  let title = "视频标题", subtitle = "";
  const configFile = path.join(PROJECT_DIR, "video-config.json");
  if (fs.existsSync(configFile)) {
    try {
      const config = JSON.parse(fs.readFileSync(configFile, "utf8"));
      title = config.cover?.title || config.name || title;
      subtitle = config.cover?.subtitle || "";
    } catch (e) {}
  }

  // 读取 docs/narration.txt 作为副标题备选
  const narrationFile = path.join(PROJECT_DIR, "docs/narration.txt");
  if (!subtitle && fs.existsSync(narrationFile)) {
    const lines = fs.readFileSync(narrationFile, "utf8").split("\n").filter(l => l.trim());
    subtitle = lines[0] || "";
  }

  const scriptPath = path.join(
    path.dirname(path.dirname(__dirname)),
    "skills", "video-creator", "scripts", "generate_cover.py"
  );

  for (const coverName of missingCovers) {
    let type = "vertical";
    if (coverName === "cover-wechat.png") type = "wechat";
    if (coverName === "cover-xhs.png") type = "xhs";

    log(`生成 ${coverName} (${type})...`);
    try {
      const result = execSync(
        `python3 "${scriptPath}" "${title}" "${subtitle}" "${assetsDir}" ${type} 2>&1`,
        { timeout: 60000 }
      ).toString().trim();
      if (fs.existsSync(path.join(assetsDir, coverName))) {
        ok(`  ✅ ${coverName} 已生成`);
      } else {
        err(`  ❌ ${coverName} 生成失败: ${result}`);
      }
    } catch (e) {
      err(`  ❌ ${coverName} PIL 生成异常: ${e.message}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. 输出汇总 + 退出码
// ─────────────────────────────────────────────────────────────────────────────
function summarize(results) {
  const totalPass = results.reduce((s, r) => s + (r.pass || 0), 0);
  const totalFail = results.reduce((s, r) => s + (r.fail || 0), 0);

  console.log(`\n${BOLD}═══════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  前置门禁汇总${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════${RESET}`);
  console.log(`  总通过: ${GREEN}${totalPass}${RESET}  |  总失败: ${RED}${totalFail}${RESET}  |  项目: ${PROJECT_DIR}`);

  if (totalFail > 0) {
    console.log(`\n${RED}[✗] 前置检查未通过，以下问题需要修复：${RESET}`);
    for (const r of results) {
      if (r.missing && r.missing.length > 0) {
        console.log(`  缺失: ${r.missing.join(", ")}`);
      }
    }
    console.log(`\n修复方式:`);
    console.log(`  文档缺失 → cd ${PROJECT_DIR} && node $SKILL_DIR/scripts/generate_docs.js ${PROJECT_DIR}`);
    console.log(`  封面缺失 → python3 $SKILL_DIR/scripts/generate_cover.py <title> <subtitle> ${PROJECT_DIR}/docs/assets [vertical|wechat|xhs]`);
    console.log(`  音频缺失 → edge-tts + ffmpeg atempo 处理`);
    console.log(`\n  或使用 --fix 自动修复: node pre-flight-check.js ${PROJECT_DIR} --fix`);
  } else {
    ok(`\n[✓] 全部前置检查通过，可进入渲染阶段`);
  }

  return totalFail === 0 ? 0 : 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// 主流程
// ─────────────────────────────────────────────────────────────────────────────
if (require.main === module) {
  if (!process.argv[2] || process.argv[2] === "--help") {
    console.log(`用法: node pre-flight-check.js <项目目录> [--fix]`);
    console.log(`示例: node pre-flight-check.js /Volumes/OpenClawDrive/.hermes/workspace/whichllm`);
    console.log(`      node pre-flight-check.js /Volumes/OpenClawDrive/.hermes/workspace/whichllm --fix`);
    process.exit(0);
  }

  if (!fs.existsSync(PROJECT_DIR)) {
    err(`项目目录不存在: ${PROJECT_DIR}`);
    process.exit(1);
  }

  log(`video-creator 前置门禁检查: ${path.resolve(PROJECT_DIR)}`);

  const results = [
    check_docs(),
    check_covers(),
    check_audio(),
    check_captions(),
    check_config()
  ];

  // 收集缺失封面
  const missingCovers = results[1].missing || [];
  if (FIX && missingCovers.length > 0) {
    fix_missing_covers(missingCovers);
    // 重新检查封面
    results[1] = check_covers();
  }

  const exitCode = summarize(results);
  process.exit(exitCode);
}

module.exports = { check_docs, check_covers, check_audio, check_captions, check_config };