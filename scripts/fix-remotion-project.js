#!/usr/bin/env node
/**
 * fix-remotion-project.js
 * 修复 create-remotion-project.js 生成的 Remotion 项目中的兼容性问题
 *
 * 必须在此脚本运行后执行 npm install
 *
 * 修复内容：
 * 1. themes/index.ts — 连字符key加引号（esbuild 不支持 bare hyphenated keys）
 * 2. CaptionOverlay.tsx — 移除 useDelayRender（Remotion 4.x 返回值不是函数）
 *
 * 用法：
 *   node scripts/fix-remotion-project.js <project-dir>
 */

const fs = require("fs");
const path = require("path");

function fixThemesIndex(tsPath) {
  let content = fs.readFileSync(tsPath, "utf8");
  // 匹配连字符 key 未加引号的情况: tech-modern: { → "tech-modern": {
  // 需要同时处理行首和非行首两种情况
  let fixed = content.replace(
    /([\n\r\t ])([a-z][a-z0-9]*-[a-z0-9-]+):(\s*\{)/g,
    (match, ws, key, rest) => {
      return `${ws}"${key}"${rest}`;
    }
  );
  // 匹配行首的连字符 key 未加引号: ^tech-modern: {
  fixed = fixed.replace(
    /^([a-z][a-z0-9]*-[a-z0-9-]+):(\s*\{)/gm,
    (match, key, rest) => {
      return `"${key}"${rest}`;
    }
  );
  if (fixed !== content) {
    fs.writeFileSync(tsPath, fixed, "utf8");
    console.log("✅ themes/index.ts 已修复连字符 key 引号");
  } else {
    console.log("ℹ️ themes/index.ts 无需修复（key 已带双引号）");
  }
}

function fixCaptionOverlay(tsxPath) {
  let content = fs.readFileSync(tsxPath, "utf8");

  // 移除 useDelayRender import
  content = content.replace(
    /,\s*useDelayRender\s*(?=\})/,
    ""
  ).replace(
    /useDelayRender,\s*/,
    ""
  );

  // 移除 delayRender 变量声明和所有相关调用
  content = content.replace(
    /\s*const delayRender = useDelayRender\(\);/,
    ""
  );
  content = content.replace(
    /\s*const handle = useCallback\(\(\) => delayRender\(\), \[delayRender\]\);/,
    ""
  );
  content = content.replace(
    /\s*delayRender\(\);/g,
    ""
  );
  content = content.replace(
    /handle\(\)/g,
    ""
  );

  // 移除 useCallback import（如果不再需要）
  // keep useCallback since it's still used by other parts

  fs.writeFileSync(tsxPath, content, "utf8");
  console.log(`✅ CaptionOverlay.tsx 已移除 useDelayRender`);
}

function fixSceneScales(sceneDir) {
  // 修复所有 Scene*.tsx 中的 spring() 调用（改为 interpolate）
  const files = fs.readdirSync(sceneDir).filter(f => f.match(/^Scene\d_/));
  for (const file of files) {
    const filePath = path.join(sceneDir, file);
    let content = fs.readFileSync(filePath, "utf8");

    // 替换 spring import 为 interpolate
    content = content.replace(
      /import\s+\{([^}]+),\s*spring([^}]*)\}\s+from\s+"remotion"/,
      (m, before, after) => {
        const keep = before.split(",").filter(s => s.trim());
        keep.push("useCurrentFrame", "interpolate");
        return `import { ${keep.join(", ")} } from "remotion"`;
      }
    ).replace(
      /import\s+\{([^}]+)\}\s+from\s+"remotion";/,
      (m, imports) => {
        const list = imports.split(",").map(s => s.trim());
        if (list.includes("spring")) {
          return m; // 已被上面处理
        }
        return m;
      }
    );

    // spring({ frame, config: {...} }) → interpolate(frame, [0, 30], [0.85, 1], { extrapolateRight: "clamp" })
    content = content.replace(
      /spring\(\{\s*frame,\s*config:\s*\{\s*damping:\s*\d+,\s*stiffness:\s*\d+\s*\}\s*\}\)/g,
      "interpolate(frame, [0, 30], [0.85, 1], { extrapolateRight: \"clamp\" })"
    );

    // 移除 useVideoConfig 如果不再需要（spring 是唯一需要的）
    content = content.replace(
      /,\s*useVideoConfig\s*(?=\})/,
      ""
    ).replace(
      /useVideoConfig,\s*/,
      ""
    );

    fs.writeFileSync(filePath, content, "utf8");
  }
}

if (require.main === module) {
  const projectDir = process.argv[2];
  if (!projectDir) {
    console.error("用法: node scripts/fix-remotion-project.js <project-dir>");
    process.exit(1);
  }

  const themesPath = path.join(projectDir, "video-project", "src", "themes", "index.ts");
  const captionPath = path.join(projectDir, "video-project", "src", "components", "CaptionOverlay.tsx");
  const scenesDir = path.join(projectDir, "video-project", "src", "scenes");

  if (fs.existsSync(themesPath)) fixThemesIndex(themesPath);
  if (fs.existsSync(captionPath)) fixCaptionOverlay(captionPath);
  if (fs.existsSync(scenesDir)) fixSceneScales(scenesDir);

  console.log("\n✅ 修复完成。下一步:");
  console.log("  cd video-project && npm install");
  console.log("  npx remotion render VerticalVideo out/final.mp4 --concurrency=4 --fps=60 --disable-gpu");
}

module.exports = { fixThemesIndex, fixCaptionOverlay, fixSceneScales };
