#!/usr/bin/env node
/**
 * create-remotion-project.js
 * 生成完整的 Remotion Native 项目
 *
 * 工作流程：launch.sh all → Step 4 调用本脚本
 *   launch.sh init     → 生成项目结构
 *   launch.sh audio    → edge-tts 配音
 *   launch.sh subtitle → ASS 字幕
 *   launch.sh render   → Remotion 渲染 + ffmpeg 混流
 *
 * 修复记录（Hysteria 项目经验）：
 *   1. themes/index.ts: 所有 key 必须加双引号（esbuild 要求 JSON key 是字符串）
 *   2. CaptionOverlay.tsx: 不使用 useDelayRender（Remotion 4.x 不存在此 API）
 *   3. Scene 组件：必须使用 AbsoluteFill 居中布局，内容必须垂直水平居中
 *   4. 帧数匹配：FPS=60 而非 60，避免 52.824s 音频被拉伸
 */

const fs = require("fs");
const path = require("path");

// ─────────────────────────────────────────────────────────────────────────────
// 30 主题配置（key 带双引号，esbuild 兼容）
// ─────────────────────────────────────────────────────────────────────────────
const THEMES = {
  "tech-modern":     { primary: "#2563EB", secondary: "#7C3AED", accent: "#10B981", bg: "#0F172A", font: "Inter",            particleCount: 80 },
  "cyberpunk":       { primary: "#00FFFF", secondary: "#FF00FF", accent: "#FFFF00", bg: "#0D0221", font: "JetBrains Mono", particleCount: 100 },
  "neon-future":     { primary: "#00FF88", secondary: "#FF0088", accent: "#8800FF", bg: "#000022", font: "Orbitron",       particleCount: 120 },
  "minimal-tech":     { primary: "#1E293B", secondary: "#475569", accent: "#F8FAFC", bg: "#020617", font: "Inter",         particleCount: 40 },
  "particle-tech":    { primary: "#00FFCC", secondary: "#FFCC00", accent: "#CC00FF", bg: "#0F0F23", font: "Inter",         particleCount: 150 },
  "gradient-wave":    { primary: "#06B6D4", secondary: "#8B5CF6", accent: "#EC4899", bg: "#020617", font: "Poppins",        particleCount: 60 },
  "glass-morphism":   { primary: "rgba(255,255,255,0.8)", secondary: "rgba(0,255,204,0.6)", accent: "rgba(0,153,255,0.4)", bg: "rgba(10,10,15,0.9)", font: "Poppins", particleCount: 50 },
  "holographic":      { primary: "#00FFCC", secondary: "#0099FF", accent: "#CC00FF", bg: "#000000", font: "Orbitron",       particleCount: 90 },
  "data-stream":      { primary: "#00FF00", secondary: "#00CCFF", accent: "#FF00FF", bg: "#001122", font: "JetBrains Mono", particleCount: 110 },
  "quantum-tech":      { primary: "#FF00CC", secondary: "#00FFCC", accent: "#CCFF00", bg: "#110011", font: "Orbitron",       particleCount: 130 },
  "vibrant-gradient": { primary: "#F97316", secondary: "#EAB308", accent: "#22C55E", bg: "#1C1917", font: "Poppins",        particleCount: 70 },
  "aurora-gradient":   { primary: "#06B6D4", secondary: "#8B5CF6", accent: "#EC4899", bg: "#020617", font: "Poppins",        particleCount: 85 },
  "forest-nature":     { primary: "#059669", secondary: "#10B981", accent: "#F59E0B", bg: "#064E3B", font: "Inter",         particleCount: 60 },
  "deep-ocean":        { primary: "#0891B2", secondary: "#4F46E5", accent: "#06B6D4", bg: "#030712", font: "Inter",         particleCount: 90 },
  "arctic-ice":        { primary: "#38BDF8", secondary: "#818CF8", accent: "#34D399", bg: "#0C1222", font: "Inter",         particleCount: 80 },
  "dark-minimal":      { primary: "#1E293B", secondary: "#475569", accent: "#F8FAFC", bg: "#020617", font: "Inter",         particleCount: 30 },
  "neon-city":         { primary: "#F43F5E", secondary: "#8B5CF6", accent: "#FBBF24", bg: "#18181B", font: "JetBrains Mono", particleCount: 100 },
  "fintech":           { primary: "#059669", secondary: "#10B981", accent: "#FBBF24", bg: "#052E16", font: "Inter",         particleCount: 70 },
  "pure-medical":      { primary: "#0EA5E9", secondary: "#14B8A6", accent: "#FFFFFF", bg: "#F0F9FF", font: "Inter",         particleCount: 50 },
  "autumn-vintage":    { primary: "#DC2626", secondary: "#F59E0B", accent: "#2563EB", bg: "#1C1917", font: "Playfair Display", particleCount: 55 },
  "game-elite":        { primary: "#8B5CF6", secondary: "#EC4899", accent: "#F97316", bg: "#0F0F23", font: "Orbitron",      particleCount: 110 },
  "education-blue":    { primary: "#3B82F6", secondary: "#06B6D4", accent: "#10B981", bg: "#0F172A", font: "Inter",         particleCount: 65 },
  "food-warm":         { primary: "#F97316", secondary: "#EAB308", accent: "#DC2626", bg: "#1C1917", font: "Poppins",       particleCount: 60 },
  "travel-adventure":  { primary: "#059669", secondary: "#10B981", accent: "#F59E0B", bg: "#064E3B", font: "Inter",         particleCount: 70 },
  "music-beat":        { primary: "#EC4899", secondary: "#8B5CF6", accent: "#F97316", bg: "#18181B", font: "Poppins",       particleCount: 90 },
  "news-official":      { primary: "#1E40AF", secondary: "#3B82F6", accent: "#FFFFFF", bg: "#0F172A", font: "Inter",         particleCount: 50 },
  "pet-cute":          { primary: "#F472B6", secondary: "#FB923C", accent: "#34D399", bg: "#1C1917", font: "Poppins",       particleCount: 80 },
  "auto-tech":         { primary: "#1F2937", secondary: "#374151", accent: "#F9FAFB", bg: "#030712", font: "Inter",         particleCount: 70 },
  "startup-energy":    { primary: "#10B981", secondary: "#059669", accent: "#F97316", bg: "#022C22", font: "Inter",         particleCount: 80 },
  "luxury-elegant":    { primary: "#B8860B", secondary: "#D97706", accent: "#FFFFFF", bg: "#1C1917", font: "Playfair Display", particleCount: 45 },
};

// 场景类型枚举（用于 DynamicScene 渲染逻辑）
const SCENE_TYPES = {
  COVER: "Cover",
  PAIN_POINT: "PainPoint",
  SOLUTION: "Solution",
  FEATURES: "Features",
  START: "Start",
  ENDING: "Ending",
  GENERIC: "Generic", // 动态 N 场景时的兜底类型
};

// 根据 sceneIndex 和 total 推断场景名称（用于 launch.sh SCENES_JSON 生成）
// 策略：首尾固定，中间按索引均分
function inferSceneName(sceneIndex, total) {
  if (total === 1) return SCENE_TYPES.COVER;
  if (sceneIndex === 0) return SCENE_TYPES.COVER;
  if (sceneIndex === total - 1) return SCENE_TYPES.ENDING;
  const middleTypes = [SCENE_TYPES.PAIN_POINT, SCENE_TYPES.SOLUTION, SCENE_TYPES.FEATURES, SCENE_TYPES.START];
  const ratio = sceneIndex / (total - 1);
  const typeIndex = Math.floor(ratio * (middleTypes.length - 1));
  return middleTypes[typeIndex];
}

const DEFAULT_SCENES = [
  { id: 1, name: "Cover",      duration: 3,  title: "视频标题",    subtitle: "一分钟了解核心内容" },
  { id: 2, name: "PainPoint", duration: 10, title: "痛点场景",    subtitle: "目前面临的主要问题" },
  { id: 3, name: "Solution",   duration: 12, title: "解决方案",    subtitle: "高速 · 稳定 · 低延迟" },
  { id: 4, name: "Features",   duration: 15, title: "核心功能",    subtitle: "核心优势全面解析" },
  { id: 5, name: "Start",     duration: 8,  title: "快速上手",    subtitle: "快速上手指南" },
  { id: 6, name: "Ending",    duration: 4,  title: "行动号召",    subtitle: "总结与行动号召" },
];

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// 创建 Remotion 项目
// ─────────────────────────────────────────────────────────────────────────────
function createProject(projectDir, config) {
  const vpDir = path.join(projectDir, "video-project");
  const srcDir = path.join(vpDir, "src");
  const compDir = path.join(srcDir, "components");
  const scenesDir = path.join(srcDir, "scenes");
  const themesDir = path.join(srcDir, "themes");
  const pubAudio = path.join(vpDir, "public", "audio");

  for (const d of [srcDir, compDir, scenesDir, themesDir, pubAudio]) {
    fs.mkdirSync(d, { recursive: true });
  }

  // ── 从 report.json 读取 sceneContent（动态场景内容） ───────────────────
  const reportPath = path.join(projectDir, "docs", "report.json");
  let sceneContent = null;
  if (fs.existsSync(reportPath)) {
    try {
      const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
      sceneContent = report.sceneContent || null;
      if (sceneContent) {
        console.log(`   [create-remotion] 读取 sceneContent:`);
        console.log(`     painPoints: ${sceneContent.painPoints.join(', ')}`);
        console.log(`     tags: ${sceneContent.tags.join(', ')}`);
        console.log(`     features: ${sceneContent.features.map(f => f.name).join(', ')}`);
        console.log(`     steps: ${sceneContent.steps.map(s => s.cmd).join(', ')}`);
        console.log(`     url: ${sceneContent.url}`);
        console.log(`     license: ${sceneContent.license}`);
      }
    } catch (e) {
      console.warn(`   [create-remotion] report.json 读取失败，使用硬编码兜底: ${e.message}`);
    }
  }

  // ── 动态场景内容（无 report.json 时使用硬编码兜底） ───────────────────
  const PAIN_POINTS = sceneContent?.painPoints || ["网络延迟高，游戏卡顿", "视频缓冲，转圈圈", "访问缓慢，工作效率低"];
  const TAGS = sceneContent?.tags || ["QUIC 协议", "智能加速", "多平台支持"];
  const FEATURES = sceneContent?.features || [
    { icon: "🚀", name: "极致速度", desc: "QUIC 协议优化" },
    { icon: "🛡️", name: "安全加密", desc: "端到端传输加密" },
    { icon: "⚡", name: "低延迟", desc: "智能路由选择" },
    { icon: "🌐", name: "全球节点", desc: "覆盖 50+ 地区" },
  ];
  const STEPS = sceneContent?.steps || [
    { cmd: "brew install hysteria", desc: "一键安装" },
    { cmd: "hysteria server -c config.yaml", desc: "启动服务" },
    { cmd: "配置客户端连接", desc: "开始使用" },
  ];
  const SCENE_URL = sceneContent?.url || (config && config.repo) || "https://github.com/project";
  const SCENE_LICENSE = sceneContent?.license || "Open Source · Free Forever";

  // ── package.json ──────────────────────────────────────────────────────────
  fs.writeFileSync(path.join(vpDir, "package.json"), JSON.stringify({
    name: "video-project-remotion",
    version: "1.0.0",
    dependencies: {
      remotion: "4.0.459",
      "@remotion/cli": "4.0.459",
      "@remotion/media": "4.0.459",
      "@remotion/captions": "4.0.459",
      react: "18.2.0",
      "react-dom": "18.2.0",
      zod: "4.3.6",
    },
    devDependencies: {
      "@types/react": "^18.2.0",
      typescript: "^5.0.0",
    },
    scripts: {
      start: "remotion studio",
      build: "remotion render VerticalVideo out/final.mp4 --concurrency=4 --fps=60",
    },
  }, null, 2));

  // ── remotion.config.ts ───────────────────────────────────────────────────
  fs.writeFileSync(path.join(vpDir, "remotion.config.ts"),
    'import { Config } from "@remotion/cli/config";\n' +
    'Config.setVideoImageFormat("jpeg");\n' +
    'Config.setOverwriteOutput(true);\n');

  // ── tsconfig.json ────────────────────────────────────────────────────────
  fs.writeFileSync(path.join(vpDir, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2020",
      module: "ESNext",
      moduleResolution: "bundler",
      jsx: "react-jsx",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      allowImportingTsExtensions: true,
      noEmit: true,
    },
    include: ["src/**/*"],
  }, null, 2));

  // ── themes/index.ts ──────────────────────────────────────────────────────
  // 关键：JSON.stringify 的 key 必须是双引号字符串
  // THEMES 对象的 key 已经是双引号（如 "cyberpunk"）
  const themesJson = JSON.stringify(THEMES, null, 2);
  fs.writeFileSync(path.join(themesDir, "index.ts"),
    "export interface ThemeConfig {\n" +
    "  id: string;\n" +
    "  primary: string;\n" +
    "  secondary: string;\n" +
    "  accent: string;\n" +
    "  bg: string;\n" +
    "  font: string;\n" +
    "  particleCount: number;\n" +
    "}\n\n" +
    "export const THEMES: Record<string, ThemeConfig> = " + themesJson + ";\n\n" +
    'export function getTheme(id: string): ThemeConfig {\n' +
    '  return THEMES[id] || THEMES["cyberpunk"];\n' +
    "}\n");

  // ── CaptionOverlay.tsx ────────────────────────────────────────────────────
  // TikTok 风格逐字高亮字幕
  // 关键：无 useDelayRender（Remotion 4.x 不存在此 API）
  fs.writeFileSync(path.join(compDir, "CaptionOverlay.tsx"),
    "import React, { useState, useEffect, useMemo } from \"react\";\n" +
    "import {\n" +
    "  AbsoluteFill,\n" +
    "  Sequence,\n" +
    "  staticFile,\n" +
    "  useCurrentFrame,\n" +
    "  useVideoConfig,\n" +
    "  interpolate,\n" +
    "} from \"remotion\";\n" +
    "import type { Caption } from \"@remotion/captions\";\n\n" +
    "const HIGHLIGHT_COLOR = \"#39E508\";\n" +
    "const FONT_SIZE = 64;\n\n" +
    "// 分词：中文按字符，英文按单词\n" +
    "function tokenize(text) {\n" +
    "  const tokens = [];\n" +
    "  const regex = /[\\u4e00-\\u9fff]+|[a-zA-Z0-9]+|[\\u0020-\\u007f]+/g;\n" +
    "  let match;\n" +
    "  while ((match = regex.exec(text)) !== null) {\n" +
    "    const t = match[0];\n" +
    "    if (t.trim()) tokens.push(t);\n" +
    "  }\n" +
    "  return tokens.length > 0 ? tokens : [text];\n" +
    "}\n\n" +
    "// 单行字幕（逐字高亮）\n" +
    "const TikTokCaptionLine = ({ text, startFrame, durationInFrames, fps }) => {\n" +
    "  const frame = useCurrentFrame();\n" +
    "  const localFrame = frame - startFrame;\n" +
    "  const tokens = useMemo(() => tokenize(text), [text]);\n" +
    "  const msPerToken = (durationInFrames / tokens.length / fps) * 1000;\n\n" +
    "  // 入场 0→1（15帧）+ 出场 fadeout（最后20帧）\n" +
    "  const entry = interpolate(localFrame, [0, 15], [0, 1], { extrapolateLeft: \"clamp\", extrapolateRight: \"clamp\" });\n" +
    "  const exitFadeStart = Math.max(0, durationInFrames - 20);\n" +
    "  const exitOpacity = interpolate(localFrame, [exitFadeStart, durationInFrames], [1, 0], { extrapolateLeft: \"clamp\", extrapolateRight: \"clamp\" });\n\n" +
    "  return (\n" +
    '    <div style={{\n' +
    "      position: \"absolute\",\n" +
    "      bottom: 56,\n" +
    "      left: 0,\n" +
    "      right: 0,\n" +
    "      display: \"flex\",\n" +
    "      justifyContent: \"center\",\n" +
    "      alignItems: \"center\",\n" +
    "      pointerEvents: \"none\",\n" +
    "      opacity: entry * exitOpacity,\n" +
    '    }}>\n' +
    '      <div style={{\n' +
    "        background: \"rgba(0,0,0,0.55)\",\n" +
    "        borderRadius: 12,\n" +
    "        padding: \"12px 36px\",\n" +
    "        maxWidth: \"92%\",\n" +
    '      }}>\n' +
    '        <div style={{\n' +
    "          fontSize: FONT_SIZE,\n" +
    "          fontWeight: \"bold\",\n" +
    "          whiteSpace: \"pre-wrap\",\n" +
    "          textAlign: \"center\",\n" +
    "          padding: \"0 8px\",\n" +
    "          fontFamily: \"STHeiti Medium, sans-serif\",\n" +
    "          lineHeight: 1.5,\n" +
    "          color: \"#FFFFFF\",\n" +
    '        }}>\n' +
    "          {tokens.map((token, i) => {\n" +
    "            const tokenStartMs = i * msPerToken;\n" +
    "            const tokenEndMs = (i + 1) * msPerToken;\n" +
    "            const currentMs = localFrame * (1000 / fps);\n" +
    "            const isPast = currentMs > tokenEndMs;\n" +
    '            return (\n' +
    '              <span\n' +
    "                key={i}\n" +
    '                style={{\n' +
    '                  color: isPast ? "rgba(255,255,255,0.45)" : "#FFFFFF",\n' +
    '                  display: "inline-block",\n' +
    "                }}\n" +
    "              >\n" +
    "                {token}\n" +
    "              </span>\n" +
    "            );\n" +
    "          })}\n" +
    "        </div>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "  );\n" +
    "};\n\n" +
    "export const CaptionOverlay = ({ captionsFile = \"audio/captions.json\" }) => {\n" +
    "  const [captions, setCaptions] = useState([]);\n" +
    "  const { fps } = useVideoConfig();\n\n" +
    "  useEffect(() => {\n" +
    "    fetch(staticFile(captionsFile))\n" +
    "      .then((r) => r.json())\n" +
    "      .then((d) => setCaptions(d))\n" +
    "      .catch(() => setCaptions([]));\n" +
    "  }, [captionsFile]);\n\n" +
    "  if (captions.length === 0 || !fps) return null;\n\n" +
    "  return (\n" +
    "    <AbsoluteFill>\n" +
    "      {captions.map((caption, index) => {\n" +
    "        const nextCaption = captions[index + 1] || null;\n" +
    "        const startFrame = Math.floor((caption.startMs / 1000) * fps);\n" +
    "        const endFrame = nextCaption\n" +
    "          ? Math.floor((nextCaption.startMs / 1000) * fps)\n" +
    "          : Math.floor((caption.endMs / 1000) * fps);\n" +
    "        const durationInFrames = endFrame - startFrame;\n" +
    "        if (durationInFrames <= 0) return null;\n\n" +
    "        return (\n" +
    "          <Sequence\n" +
    "            key={index}\n" +
    "            from={startFrame}\n" +
    "            durationInFrames={durationInFrames}\n" +
    "          >\n" +
    "            <TikTokCaptionLine\n" +
    "              text={caption.text}\n" +
    "              startFrame={0}\n" +
    "              durationInFrames={durationInFrames}\n" +
    "              fps={fps}\n" +
    "            />\n" +
    "          </Sequence>\n" +
    "        );\n" +
    "      })}\n" +
    "    </AbsoluteFill>\n" +
    "  );\n" +
    "};\n");

  // ── DynamicScene.tsx ─────────────────────────────────────────────────────
  // 统一动态场景组件：根据 scene.name 渲染不同类型
  // 支持 themes.js 所有 30 个主题，颜色全部从 theme 派生
  fs.writeFileSync(path.join(scenesDir, "DynamicScene.tsx"),
    "import React, { useMemo } from 'react';\\n" +
    "import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';\\n\\n" +
    "// ── 场景类型常量 ──────────────────────────────────────────────────────\\n" +
    "const SCENE_TYPE = {\\n" +
    "  COVER:      'Cover',\\n" +
    "  PAIN_POINT: 'PainPoint',\\n" +
    "  SOLUTION:   'Solution',\\n" +
    "  FEATURES:   'Features',\\n" +
    "  START:       'Start',\\n" +
    "  ENDING:      'Ending',\\n" +
    "  GENERIC:     'Generic',\\n" +
    "};\\n\\n" +
    "// ── 网格背景（科技主题通用）──────────────────────────────────────────\\n" +
    "const GridBackground = ({ color = 'rgba(0,255,255,0.06)', density = 60 }) => {\\n" +
    "  const hLines = useMemo(() => {\\n" +
    "    const arr = [];\\n" +
    "    for (let i = 0; i < 1920; i += density) {\\n" +
    "      arr.push(<div key={'h'+i} style={{ position: 'absolute', top: i, left: 0, right: 0, height: 1, backgroundColor: color }} />);\\n" +
    "    }\\n" +
    "    return arr;\\n" +
    "  }, [color, density]);\\n" +
    "  const vLines = useMemo(() => {\\n" +
    "    const arr = [];\\n" +
    "    for (let i = 0; i < 1080; i += density) {\\n" +
    "      arr.push(<div key={'v'+i} style={{ position: 'absolute', left: i, top: 0, bottom: 0, width: 1, backgroundColor: color }} />);\\n" +
    "    }\\n" +
    "    return arr;\\n" +
    "  }, [color, density]);\\n" +
    "  return <>{{ hLines }}{{ vLines }}</>;\\n" +
    "};\\n\\n" +
    "// ── 入场动画 ──────────────────────────────────────────────────────────\\n" +
    "const useSceneAnimation = (frame, theme) => {\\n" +
    "  const spring = theme.spring || { damping: 15, stiffness: 150, mass: 1 };\\n" +
    "  const fade   = theme.fade   || { duration: 12 };\\n" +
    "  const slide  = theme.slide  || { duration: 20 };\\n\\n" +
    "  const entry = interpolate(frame, [0, fade.duration], [0, 1], { extrapolateRight: 'clamp' });\\n" +
    "  const scale = interpolate(frame, [0, (fade.duration || 12)],\\n" +
    "    [(theme.scale && theme.scale.from) || 0.85, 1], { extrapolateRight: 'clamp' });\\n" +
    "  const slideY = interpolate(frame, [0, slide.duration], [30, 0], { extrapolateRight: 'clamp' });\\n" +
    "  return { entry, scale, slideY };\\n" +
    "};\\n\\n" +
    "// ── 发光条 ────────────────────────────────────────────────────────────\\n" +
    "const GlowBar = ({ top, bottom, gradient, shadow }) => (\\n" +
    "  <>\\n" +
    "    {top && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3,\\n" +
    "      background: gradient, boxShadow: shadow }} />}\\n" +
    "    {bottom && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,\\n" +
    "      background: gradient }} />}\\n" +
    "  </>\\n" +
    ");\\n\\n" +
    "// ── 通用居中容器 ─────────────────────────────────────────────────────\\n" +
    "const CenterLayout = ({ entry, scale, slideY, children, padding = '0 60px' }) => (\\n" +
    "  <div style={{\\n" +
    "    position: 'absolute', inset: 0,\\n" +
    "    display: 'flex', flexDirection: 'column',\\n" +
    "    justifyContent: 'center', alignItems: 'center',\\n" +
    "    padding,\\n" +
    "    opacity: entry,\\n" +
    "    transform: `scale(${scale}) translateY(${slideY}px)`,\\n" +
    "  }}>\\n" +
    "    {children}\\n" +
    "  </div>\\n" +
    ");\\n\\n" +
    "// ── Cover 场景 ────────────────────────────────────────────────────────\\n" +
    "const CoverScene = ({ title, subtitle, theme, frame }) => {\\n" +
    "  const p = theme.primary, s = theme.secondary, bg = theme.bg, font = theme.font;\\n" +
    "  const { entry, scale } = useSceneAnimation(frame, theme);\\n" +
    "  return (\\n" +
    "    <AbsoluteFill style={{ backgroundColor: bg }}>\\n" +
    "      <GridBackground color={`rgba(${p},0.06)`} />\\n" +
    "      <GlowBar top gradient={`linear-gradient(90deg, ${p}, ${s})`} shadow={`0 0 16px ${p}`} bottom />\\n" +
    "      <CenterLayout entry={entry} scale={scale} slideY={0} padding='0 60px'>\\n" +
    "        <div style={{\\n" +
    "          fontSize: 120, fontWeight: 800, color: '#FFFFFF', fontFamily: font,\\n" +
    "          textAlign: 'center', maxWidth: '95%',\\n" +
    "          textShadow: `0 0 10px ${p}, 0 0 20px ${p}, 0 0 40px ${s}`,\\n" +
    "          padding: '0 60px',\\n" +
    "        }}>\\n" +
    "          {title}\\n" +
    "        </div>\\n" +
    "        {subtitle && (\\n" +
    "          <div style={{ fontSize: 48, fontWeight: 600, color: s, fontFamily: font,\\n" +
    "            textAlign: 'center', marginTop: 24, textShadow: `0 0 20px ${s}` }}>\\n" +
    "            {subtitle}\\n" +
    "          </div>\\n" +
    "        )}\\n" +
    "      </CenterLayout>\\n" +
    "    </AbsoluteFill>\\n" +
    "  );\\n" +
    "};\\n\\n" +
    "// ── PainPoint 场景 ─────────────────────────────────────────────────────\\n" +
    "const PainPointScene = ({ title, subtitle, theme, frame, painPoints }) => {\\n" +
    "  const p = theme.primary, s = theme.secondary, bg = theme.bg, font = theme.font;\\n" +
    "  const { entry, slideY } = useSceneAnimation(frame, theme);\\n" +
    "  const PAIN_ICONS = painPoints && painPoints.length >= 3 ? ['⚠️','🔥','💀'] : ['•','•','•'];\\n" +
    "  return (\\n" +
    "    <AbsoluteFill style={{ backgroundColor: bg }}>\\n" +
    "      <GridBackground color={`rgba(255,0,85,0.04)`} />\\n" +
    "      <GlowBar top gradient='linear-gradient(90deg, #FF0055, #FF0055)' shadow='0 0 20px #FF0055' bottom />\\n" +
    "      <CenterLayout entry={entry} scale={1} slideY={slideY} padding='0 60px'>\\n" +
    "        <div style={{ padding: '6px 24px', borderRadius: 20, backgroundColor: 'rgba(255,0,85,0.1)',\\n" +
    "          border: '1px solid rgba(255,0,85,0.3)', fontSize: 18, color: '#FF0055',\\n" +
    "          fontFamily: font, fontWeight: 600, letterSpacing: 3, marginBottom: 32,\\n" +
    "          boxShadow: '0 0 12px rgba(255,0,85,0.2)' }}>\\n" +
    "          痛 点\\n" +
    "        </div>\\n" +
    "        <div style={{ fontSize: 72, fontWeight: 800, color: '#FFFFFF', fontFamily: font,\\n" +
    "          textAlign: 'center', marginBottom: 48, textShadow: '0 0 20px #FF0055' }}>\\n" +
    "          {title}\\n" +
    "        </div>\\n" +
    "        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', maxWidth: 800 }}>\\n" +
    "          {(painPoints || ['暂无痛点数据']).slice(0, 3).map((pain, i) => {\\n" +
    "            const itemEntry = interpolate(frame, [10 + i*8, 30 + i*8], [0, 1], { extrapolateRight: 'clamp' });\\n" +
    "            const itemSlide = interpolate(frame, [10 + i*8, 30 + i*8], [20, 0], { extrapolateRight: 'clamp' });\\n" +
    "            return (\\n" +
    "              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16,\\n" +
    "                background: 'rgba(255,0,85,0.08)', border: '1px solid rgba(255,0,85,0.25)',\\n" +
    "                borderRadius: 12, padding: '16px 24px',\\n" +
    "                opacity: itemEntry, transform: `translateY(${itemSlide}px)` }}>\\n" +
    "                <span style={{ fontSize: 36 }}>{PAIN_ICONS[i]}</span>\\n" +
    "                <span style={{ fontSize: 32, fontWeight: 600, color: '#FFFFFF', fontFamily: font }}>\\n" +
    "                  {pain}\\n" +
    "                </span>\\n" +
    "              </div>\\n" +
    "            );\\n" +
    "          })}\\n" +
    "        </div>\\n" +
    "        {subtitle && (\\n" +
    "          <div style={{ fontSize: 32, fontWeight: 400, color: s, fontFamily: font,\\n" +
    "            textAlign: 'center', marginTop: 40, opacity: 0.8 }}>\\n" +
    "            {subtitle}\\n" +
    "          </div>\\n" +
    "        )}\\n" +
    "      </CenterLayout>\\n" +
    "    </AbsoluteFill>\\n" +
    "  );\\n" +
    "};\\n\\n" +
    "// ── Solution 场景 ─────────────────────────────────────────────────────\\n" +
    "const SolutionScene = ({ title, subtitle, theme, frame, tags }) => {\\n" +
    "  const p = theme.primary, s = theme.secondary, a = theme.accent, bg = theme.bg, font = theme.font;\\n" +
    "  const { entry, scale } = useSceneAnimation(frame, theme);\\n" +
    "  return (\\n" +
    "    <AbsoluteFill style={{ backgroundColor: bg }}>\\n" +
    "      <GridBackground color={`rgba(${p},0.05)`} />\\n" +
    "      <GlowBar top gradient={`linear-gradient(90deg, ${p}, ${s})`} shadow={`0 0 16px ${p}`} bottom />\\n" +
    "      <CenterLayout entry={entry} scale={scale} slideY={0} padding='0 60px'>\\n" +
    "        <div style={{ padding: '6px 24px', borderRadius: 20, backgroundColor: `${p}22`,\\n" +
    "          border: `1px solid ${p}60`, fontSize: 18, color: p,\\n" +
    "          fontFamily: font, fontWeight: 600, letterSpacing: 3, marginBottom: 32,\\n" +
    "          boxShadow: `${p}33` }}>\\n" +
    "          解 决 方 案\\n" +
    "        </div>\\n" +
    "        <div style={{ fontSize: 100, fontWeight: 900, color: '#FFFFFF', fontFamily: font,\\n" +
    "          textAlign: 'center', textShadow: `0 0 20px ${p}, 0 0 40px ${s}`,\\n" +
    "          padding: '0 40px', maxWidth: '95%' }}>\\n" +
    "          {title}\\n" +
    "        </div>\\n" +
    "        <div style={{ fontSize: 44, fontWeight: 600, color: s, fontFamily: font,\\n" +
    "          textAlign: 'center', marginTop: 32, textShadow: `0 0 20px ${s}` }}>\\n" +
    "          {subtitle || '高速 · 稳定 · 低延迟'}\\n" +
    "        </div>\\n" +
    "        <div style={{ display: 'flex', gap: 16, marginTop: 48, flexWrap: 'wrap', justifyContent: 'center' }}>\\n" +
    "          {(tags || []).slice(0, 4).map((tag, i) => {\\n" +
    "            const tagEntry = interpolate(frame, [15 + i*6, 30 + i*6], [0, 1], { extrapolateRight: 'clamp' });\\n" +
    "            return (\\n" +
    "              <div key={i} style={{ padding: '8px 20px', borderRadius: 8, background: `${a}22`,\\n" +
    "                border: `1px solid ${a}60`, fontSize: 24, color: a, fontFamily: font,\\n" +
    "                fontWeight: 500, opacity: tagEntry, boxShadow: `${a}33` }}>\\n" +
    "                {tag}\\n" +
    "              </div>\\n" +
    "            );\\n" +
    "          })}\\n" +
    "        </div>\\n" +
    "      </CenterLayout>\\n" +
    "    </AbsoluteFill>\\n" +
    "  );\\n" +
    "};\\n\\n" +
    "// ── Features 场景 ─────────────────────────────────────────────────────\\n" +
    "const FeaturesScene = ({ title, subtitle, theme, frame, features }) => {\\n" +
    "  const p = theme.primary, s = theme.secondary, bg = theme.bg, font = theme.font;\\n" +
    "  const { entry } = useSceneAnimation(frame, theme);\\n" +
    "  return (\\n" +
    "    <AbsoluteFill style={{ backgroundColor: bg }}>\\n" +
    "      <GridBackground color={`rgba(${p},0.04)`} />\\n" +
    "      <GlowBar top gradient={`linear-gradient(90deg, ${p}, ${s})`} shadow={`0 0 16px ${p}`} bottom />\\n" +
    "      <CenterLayout entry={entry} scale={1} slideY={0} padding='0 60px'>\\n" +
    "        <div style={{ padding: '6px 24px', borderRadius: 20, backgroundColor: `${p}22`,\\n" +
    "          border: `1px solid ${p}60`, fontSize: 18, color: p,\\n" +
    "          fontFamily: font, fontWeight: 600, letterSpacing: 3, marginBottom: 28 }}>\\n" +
    "          核 心 功 能\\n" +
    "        </div>\\n" +
    "        <div style={{ fontSize: 64, fontWeight: 800, color: '#FFFFFF', fontFamily: font,\\n" +
    "          textAlign: 'center', marginBottom: 40, textShadow: `0 0 20px ${p}` }}>\\n" +
    "          {title}\\n" +
    "        </div>\\n" +
    "        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, width: '100%', maxWidth: 880 }}>\\n" +
    "          {(features || []).slice(0, 4).map((item, i) => {\\n" +
    "            const itemEntry = interpolate(frame, [5 + i*6, 20 + i*6], [0, 1], { extrapolateRight: 'clamp' });\\n" +
    "            const itemScale = interpolate(frame, [5 + i*6, 20 + i*6], [0.85, 1], { extrapolateRight: 'clamp' });\\n" +
    "            return (\\n" +
    "              <div key={i} style={{ background: `linear-gradient(135deg, ${p}15, ${s}10)`,\\n" +
    "                border: `1px solid ${p}40`, borderRadius: 16, padding: '28px 20px',\\n" +
    "                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,\\n" +
    "                opacity: itemEntry, transform: `scale(${itemScale})`, boxShadow: `${p}15` }}>\\n" +
    "                <span style={{ fontSize: 52 }}>{item.icon || '•'}</span>\\n" +
    "                <div style={{ fontSize: 32, fontWeight: 700, color: '#FFFFFF', fontFamily: font,\\n" +
    "                  textAlign: 'center' }}>{item.name || item.desc || item}</div>\\n" +
    "                <div style={{ fontSize: 22, fontWeight: 400, color: 'rgba(255,255,255,0.6)',\\n" +
    "                  fontFamily: font, textAlign: 'center' }}>{item.desc || ''}</div>\\n" +
    "              </div>\\n" +
    "            );\\n" +
    "          })}\\n" +
    "        </div>\\n" +
    "        {subtitle && (\\n" +
    "          <div style={{ fontSize: 28, color: s, fontFamily: font, textAlign: 'center',\\n" +
    "            marginTop: 32, opacity: 0.8 }}>\\n" +
    "            {subtitle}\\n" +
    "          </div>\\n" +
    "        )}\\n" +
    "      </CenterLayout>\\n" +
    "    </AbsoluteFill>\\n" +
    "  );\\n" +
    "};\\n\\n" +
    "// ── Start 场景 ─────────────────────────────────────────────────────────\\n" +
    "const StartScene = ({ title, subtitle, theme, frame, steps, url }) => {\\n" +
    "  const p = theme.primary, s = theme.secondary, bg = theme.bg, font = theme.font;\\n" +
    "  const { entry } = useSceneAnimation(frame, theme);\\n" +
    "  return (\\n" +
    "    <AbsoluteFill style={{ backgroundColor: bg }}>\\n" +
    "      <GridBackground color={`rgba(${p},0.04)`} />\\n" +
    "      <GlowBar top gradient={`linear-gradient(90deg, ${p}, ${s})`} shadow={`0 0 16px ${p}`} bottom />\\n" +
    "      <CenterLayout entry={entry} scale={1} slideY={0} padding='0 60px'>\\n" +
    "        <div style={{ padding: '6px 24px', borderRadius: 20, backgroundColor: `${p}22`,\\n" +
    "          border: `1px solid ${p}60`, fontSize: 18, color: p,\\n" +
    "          fontFamily: font, fontWeight: 600, letterSpacing: 3, marginBottom: 28 }}>\\n" +
    "          快 速 上 手\\n" +
    "        </div>\\n" +
    "        <div style={{ fontSize: 64, fontWeight: 800, color: '#FFFFFF', fontFamily: font,\\n" +
    "          textAlign: 'center', marginBottom: 40, textShadow: `0 0 20px ${p}` }}>\\n" +
    "          {title}\\n" +
    "        </div>\\n" +
    "        <div style={{ width: '100%', maxWidth: 760, background: 'rgba(0,0,0,0.6)',\\n" +
    "          border: `1px solid ${p}50`, borderRadius: 12, overflow: 'hidden',\\n" +
    "          boxShadow: `${p}20` }}>\\n" +
    "          <div style={{ display: 'flex', gap: 8, padding: '12px 16px',\\n" +
    "            background: `${p}15`, borderBottom: `1px solid ${p}30` }}>\\n" +
    "            {['#FF5F56','#FFBD2E','#27C93F'].map((c, i) => (\\n" +
    "              <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: c }} />\\n" +
    "            ))}\\n" +
    "            <div style={{ flex: 1, textAlign: 'center', fontSize: 14,\\n" +
    "              color: 'rgba(255,255,255,0.4)', fontFamily: font }}>Terminal</div>\\n" +
    "          </div>\\n" +
    "          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>\\n" +
    "            {(steps || []).slice(0, 4).map((item, i) => {\\n" +
    "              const lineEntry = interpolate(frame, [8 + i*8, 25 + i*8], [0, 1], { extrapolateRight: 'clamp' });\\n" +
    "              return (\\n" +
    "                <div key={i} style={{ opacity: lineEntry }}>\\n" +
    "                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>\\n" +
    "                    <span style={{ fontSize: 24, fontFamily: font, color: p, fontWeight: 600 }}>$</span>\\n" +
    "                    <span style={{ fontSize: 22, fontFamily: font, color: '#FFFFFF' }}>\\n" +
    "                      {item.cmd || item.text || item}\\n" +
    "                    </span>\\n" +
    "                  </div>\\n" +
    "                  <div style={{ fontSize: 18, fontFamily: font, color: 'rgba(255,255,255,0.4)',\\n" +
    "                    marginTop: 4, paddingLeft: 36 }}># {item.desc || ''}</div>\\n" +
    "                </div>\\n" +
    "              );\\n" +
    "            })}\\n" +
    "          </div>\\n" +
    "        </div>\\n" +
    "        {url && (\\n" +
    "          <div style={{ marginTop: 32, padding: '10px 28px', background: `${s}22`,\\n" +
    "            border: `1px solid ${s}50`, borderRadius: 8, fontSize: 24, color: s,\\n" +
    "            fontFamily: font, fontWeight: 600, boxShadow: `${s}30` }}>\\n" +
    "            {url.replace('https://', '')}\\n" +
    "          </div>\\n" +
    "        )}\\n" +
    "        {subtitle && (\\n" +
    "          <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.5)', fontFamily: font,\\n" +
    "            textAlign: 'center', marginTop: 24 }}>\\n" +
    "            {subtitle}\\n" +
    "          </div>\\n" +
    "        )}\\n" +
    "      </CenterLayout>\\n" +
    "    </AbsoluteFill>\\n" +
    "  );\\n" +
    "};\\n\\n" +
    "// ── Ending 场景 ─────────────────────────────────────────────────────────\\n" +
    "const EndingScene = ({ title, subtitle, theme, frame, url, license }) => {\\n" +
    "  const p = theme.primary, s = theme.secondary, a = theme.accent, bg = theme.bg, font = theme.font;\\n" +
    "  const { entry } = useSceneAnimation(frame, theme);\\n" +
    "  const pulse = interpolate(frame, [0, 60], [1, 1.08], { extrapolateRight: 'clamp' });\\n" +
    "  return (\\n" +
    "    <AbsoluteFill style={{ backgroundColor: bg }}>\\n" +
    "      <GridBackground color={`rgba(255,255,255,0.03)`} />\\n" +
    "      <GlowBar top gradient={`linear-gradient(90deg, ${p}, ${s}, ${a})`}\\n" +
    "        shadow={`0 0 20px ${p}`} bottom />\\n" +
    "      <CenterLayout entry={entry} scale={1} slideY={0} padding='0 60px'>\\n" +
    "        <div style={{ fontSize: 80, fontWeight: 900, color: '#FFFFFF', fontFamily: font,\\n" +
    "          textAlign: 'center', textShadow: `0 0 20px ${p}, 0 0 40px ${s}, 0 0 60px ${a}`,\\n" +
    "          transform: `scale(${pulse})`, marginBottom: 32 }}>\\n" +
    "          ⚡\\n" +
    "        </div>\\n" +
    "        <div style={{ fontSize: 80, fontWeight: 900, color: '#FFFFFF', fontFamily: font,\\n" +
    "          textAlign: 'center', textShadow: `0 0 15px ${p}, 0 0 30px ${s}`,\\n" +
    "          maxWidth: '90%' }}>\\n" +
    "          {title}\\n" +
    "        </div>\\n" +
    "        {subtitle && (\\n" +
    "          <div style={{ fontSize: 44, fontWeight: 600, color: s, fontFamily: font,\\n" +
    "            textAlign: 'center', marginTop: 24, textShadow: `0 0 20px ${s}` }}>\\n" +
    "            {subtitle}\\n" +
    "          </div>\\n" +
    "        )}\\n" +
    "        <div style={{ marginTop: 56, padding: '16px 48px',\\n" +
    "          background: `linear-gradient(135deg, ${p}, ${s})`,\\n" +
    "          borderRadius: 12, fontSize: 36, fontWeight: 800, color: '#000000',\\n" +
    "          fontFamily: font, boxShadow: `${p}80` }}>\\n" +
    "          立即开始 →\\n" +
    "        </div>\\n" +
    "        {(url || license) && (\\n" +
    "          <div style={{ position: 'absolute', bottom: 60, fontSize: 20,\\n" +
    "            color: 'rgba(255,255,255,0.3)', fontFamily: font, textAlign: 'center' }}>\\n" +
    "            {license || (url ? url.replace('https://','') : '')}\\n" +
    "          </div>\\n" +
    "        )}\\n" +
    "      </CenterLayout>\\n" +
    "    </AbsoluteFill>\\n" +
    "  );\\n" +
    "};\\n\\n" +
    "// ── Generic 场景（兜底，用于非标准 name 的场景）────────────────────────\\n" +
    "const GenericScene = ({ title, subtitle, theme, frame }) => {\\n" +
    "  const p = theme.primary, s = theme.secondary, bg = theme.bg, font = theme.font;\\n" +
    "  const { entry, scale } = useSceneAnimation(frame, theme);\\n" +
    "  return (\\n" +
    "    <AbsoluteFill style={{ backgroundColor: bg }}>\\n" +
    "      <GridBackground color={`rgba(${p},0.05)`} />\\n" +
    "      <GlowBar top gradient={`linear-gradient(90deg, ${p}, ${s})`} shadow={`0 0 16px ${p}`} bottom />\\n" +
    "      <CenterLayout entry={entry} scale={scale} slideY={0} padding='0 60px'>\\n" +
    "        <div style={{ fontSize: 72, fontWeight: 800, color: '#FFFFFF', fontFamily: font,\\n" +
    "          textAlign: 'center', textShadow: `0 0 20px ${p}` }}>\\n" +
    "          {title}\\n" +
    "        </div>\\n" +
    "        {subtitle && (\\n" +
    "          <div style={{ fontSize: 40, color: s, fontFamily: font, textAlign: 'center',\\n" +
    "            marginTop: 24, opacity: 0.8 }}>\\n" +
    "            {subtitle}\\n" +
    "          </div>\\n" +
    "        )}\\n" +
    "      </CenterLayout>\\n" +
    "    </AbsoluteFill>\\n" +
    "  );\\n" +
    "};\\n\\n" +
    "// ── 主组件 DynamicScene ────────────────────────────────────────────────\\n" +
    "// theme 由 themes.js 注入，支持所有 30 个主题\\n" +
    "// painPoints/tags/features/steps/url/license 从 scenes props 透传\\n" +
    "export const DynamicScene = ({ name, title, subtitle, theme, frame,\\n" +
    "  painPoints, tags, features, steps, url, license,\\n" +
    "}) => {\\n" +
    "  switch (name) {\\n" +
    "    case SCENE_TYPE.COVER:      return <CoverScene      title={title} subtitle={subtitle} theme={theme} frame={frame} />;\\n" +
    "    case SCENE_TYPE.PAIN_POINT: return <PainPointScene  title={title} subtitle={subtitle} theme={theme} frame={frame} painPoints={painPoints} />;\\n" +
    "    case SCENE_TYPE.SOLUTION:   return <SolutionScene   title={title} subtitle={subtitle} theme={theme} frame={frame} tags={tags} />;\\n" +
    "    case SCENE_TYPE.FEATURES:   return <FeaturesScene   title={title} subtitle={subtitle} theme={theme} frame={frame} features={features} />;\\n" +
    "    case SCENE_TYPE.START:      return <StartScene      title={title} subtitle={subtitle} theme={theme} frame={frame} steps={steps} url={url} />;\\n" +
    "    case SCENE_TYPE.ENDING:     return <EndingScene     title={title} subtitle={subtitle} theme={theme} frame={frame} url={url} license={license} />;\\n" +
    "    default:                    return <GenericScene    title={title} subtitle={subtitle} theme={theme} frame={frame} />;\\n" +
    "  }\\n" +
    "};\\n"
  );
  console.log("DynamicScene.tsx written");

  // ── Root.tsx ──────────────────────────────────────────────────────────────
  // 只导出 DynamicScene（统一动态场景组件，支持任意 N 场景）
  fs.writeFileSync(path.join(scenesDir, "index.ts"),
    'export { DynamicScene } from "./DynamicScene";\n');

  // ── Video.tsx ─────────────────────────────────────────────────────────────
  // 关键：音频通过 <Audio> 内嵌，Remotion 渲染的 MP4 直接含音频
  // 关键：只使用 DynamicScene 组件，通过 scene.name 动态路由到不同场景类型
  fs.writeFileSync(path.join(srcDir, "Video.tsx"),
    'import React from "react";\n' +
    'import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";\n' +
    'import { CaptionOverlay } from "./components/CaptionOverlay";\n' +
    'import { THEMES } from "./themes";\n' +
    'import { DynamicScene } from "./scenes";\n\n' +
    "export interface VideoProps {\n" +
    "  title: string;\n" +
    "  subtitle: string;\n" +
    "  theme: string;\n" +
    "  scenes: Array<{ id: number; name: string; title: string; subtitle: string; duration: number;\n" +
    "    painPoints?: string[]; tags?: string[]; features?: Array<{icon?:string; name?:string; desc?:string}>;\n" +
    "    steps?: Array<{cmd?:string; text?:string; desc?:string}>; url?: string; license?: string }>;\n" +
    "  audioFile: string;\n" +
    "  captionsFile: string;\n" +
    "}\n\n" +
    "const DEFAULT_SCENES = " + JSON.stringify(DEFAULT_SCENES) + ";\n\n" +
    "export const VerticalVideo = ({ title, subtitle, theme: themeId, scenes, audioFile, captionsFile }) => {\n" +
    "  const theme = THEMES[themeId] || THEMES[\"cyberpunk\"];\n" +
    "  const { fps } = useVideoConfig();\n\n" +
    "  // 合并场景配置（scene.name 决定渲染类型）\n" +
    "  const sceneList = scenes.length > 0 ? scenes : DEFAULT_SCENES.map(s => ({\n" +
    "    ...s,\n" +
    "    title: title || s.title,\n" +
    "    subtitle: subtitle || s.subtitle,\n" +
    "  }));\n\n" +
    "  // 计算每个场景的帧边界\n" +
    "  let currentFrame = 0;\n" +
    "  const timings = sceneList.map((s) => {\n" +
    "    const startFrame = currentFrame;\n" +
    "    const durationInFrames = Math.ceil(s.duration * (fps || 60));\n" +
    "    currentFrame += durationInFrames;\n" +
    "    return { ...s, startFrame, durationInFrames };\n" +
    "  });\n\n" +
    "  return (\n" +
    '    <AbsoluteFill style={{ backgroundColor: String(theme.bg) }}>\n' +
    "      {/* 音频：内嵌 Remotion，MP4 直接含音频 */}\n" +
    "      <Audio src={staticFile(audioFile)} />\n\n" +
    "      {/* 场景序列：统一使用 DynamicScene，按 scene.name 动态路由 */}\n" +
    "      {timings.map((s, i) => {\n" +
    "        return (\n" +
    "          <Sequence\n" +
    "            key={s.id}\n" +
    "            from={s.startFrame}\n" +
    "            durationInFrames={s.durationInFrames}\n" +
    "          >\n" +
    "            <SceneWrapper scene={s} theme={theme} />\n" +
    "          </Sequence>\n" +
    "        );\n" +
    "      })}\n\n" +
    "      {/* 字幕叠加 */}\n" +
    "      <CaptionOverlay captionsFile={captionsFile} />\n" +
    "    </AbsoluteFill>\n" +
    "  );\n" +
    "};\n\n" +
    "// 场景包装器：提取 scene 字段并传给 DynamicScene\n" +
    "// 同时注入 frame（从 useCurrentFrame 获取当前帧）\n" +
    "const SceneWrapper = ({ scene, theme }) => {\n" +
    "  const frame = useCurrentFrame();\n" +
    "  return (\n" +
    "    <DynamicScene\n" +
    "      name={scene.name}\n" +
    "      title={scene.title}\n" +
    "      subtitle={scene.subtitle}\n" +
    "      theme={theme}\n" +
    "      frame={frame}\n" +
    "      painPoints={scene.painPoints}\n" +
    "      tags={scene.tags}\n" +
    "      features={scene.features}\n" +
    "      steps={scene.steps}\n" +
    "      url={scene.url}\n" +
    "      license={scene.license}\n" +
    "    />\n" +
    "  );\n" +
    "};\n");

  // ── Root.tsx ──────────────────────────────────────────────────────────────
  // fps/duration 从 config 读取（不硬编码），确保与 launch.sh --fps=60 一致
  const fps = config.fps || 60;
  const audioPath = path.join(projectDir, "audio", "neural_1_2x.m4a");
  let totalFrames;
  if (fs.existsSync(audioPath)) {
    // 从音频时长计算帧数
    const { execSync } = require("child_process");
    try {
      const dur = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${audioPath}"`, { encoding: "utf8" });
      totalFrames = Math.ceil(parseFloat(dur.trim()) * fps);
    } catch (e) {
      totalFrames = Math.ceil((config.duration || 52) * fps);
    }
  } else {
    totalFrames = Math.ceil((config.duration || 52) * fps);
  }
  // ── T-3: cover title/subtitle fallback — 从 report.json keywords 读取 ────────
  const coverReportPath = path.join(projectDir, "docs", "report.json");
  let coverReportKeywords = [];
  try {
    if (fs.existsSync(coverReportPath)) {
      const rpt = JSON.parse(fs.readFileSync(coverReportPath, "utf8"));
      coverReportKeywords = rpt.keywords || [];
    }
  } catch (e) { /* ignore */ }
  // 优先级：config.cover.title > config.title > report.keywords[0] > 硬编码
  const coverTitle = (config.cover && config.cover.title)
    ? config.cover.title
    : (config.title || (coverReportKeywords[0] || "视频标题"));
  const coverSubtitle = (config.cover && config.cover.subtitle)
    ? config.cover.subtitle
    : (config.subtitle || "副标题");
  const themeId = config.theme || "cyberpunk";

  fs.writeFileSync(path.join(srcDir, "Root.tsx"),
    "import { Composition } from \"remotion\";\n" +
    "import { VerticalVideo } from \"./Video\";\n\n" +
    "export const RemotionRoot = () => {\n" +
    "  return (\n" +
    "    <Composition\n" +
    '      id="VerticalVideo"\n' +
    "      component={VerticalVideo}\n" +
    `      durationInFrames={${totalFrames}}\n` +
    `      fps={${fps}}\n` +
    "      width={1080}\n" +
    "      height={1920}\n" +
    "      defaultProps={{\n" +
    `        title: "${coverTitle}",\n` +
    `        subtitle: "${coverSubtitle}",\n` +
    `        theme: "${themeId}",\n` +
    "        scenes: [],\n" +
    '        audioFile: "audio/neural_1_2x.m4a",\n' +
    '        captionsFile: "audio/captions.json",\n' +
    "      }}\n" +
    "    />\n" +
    "  );\n" +
    "};\n");

  // ── index.ts ──────────────────────────────────────────────────────────────
  fs.writeFileSync(path.join(srcDir, "index.ts"),
    "import { registerRoot } from \"remotion\";\n" +
    "import { RemotionRoot } from \"./Root\";\n\n" +
    "registerRoot(RemotionRoot);\n");

  // ── 复制音频到 public/audio/ ──────────────────────────────────────────
  // ⚠️ 必须同时复制 audio 文件和 captions.json，否则渲染时 CaptionOverlay 404
  const audioSrc = path.join(projectDir, "audio", "neural_1_2x.m4a");
  const audioDst = path.join(pubAudio, "neural_1_2x.m4a");
  if (fs.existsSync(audioSrc)) {
    fs.copyFileSync(audioSrc, audioDst);
    console.log("Audio copied to public/audio/");
  }

  // captions.json 也必须复制（已知问题： captions.json 未复制导致 CaptionOverlay 404）
  const captionsSrc = path.join(projectDir, "audio", "captions.json");
  const captionsDst = path.join(pubAudio, "captions.json");
  if (fs.existsSync(captionsSrc)) {
    fs.copyFileSync(captionsSrc, captionsDst);
    console.log("captions.json copied to public/audio/");
  } else {
    // captions.json 尚未生成（launch.sh render 时才生成），创建空文件占位
    fs.writeFileSync(captionsDst, "[]");
    console.log("captions.json 占位文件已创建（等待 Step 8 生成）");
  }

  console.log("\n=== Remotion Project Structure ===");
  console.log("video-project/");
  console.log("  package.json              (remotion@4.0.459)");
  console.log("  remotion.config.ts        (jpeg, overwrite)");
  console.log("  tsconfig.json             (bundler, strict)");
  console.log("  src/");
  console.log("    index.ts               (registerRoot)");
  console.log("    Root.tsx               (Composition, dynamic duration from audio)");
  console.log("    Video.tsx              (Audio + Sequence + DynamicScene)");
  console.log("    components/");
  console.log("      CaptionOverlay.tsx   (TikTok 逐字高亮)");
  console.log("    scenes/");
  console.log("      DynamicScene.tsx     (统一动态场景，支持任意 N 场景类型)");
  console.log("      index.ts             (只导出 DynamicScene)");
  console.log("    themes/index.ts       (30 主题)");
  console.log("  public/audio/");
  console.log("    neural_1_2x.m4a");
  console.log("    captions.json");
  console.log("");
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const projectDir = process.argv[2];
  if (!projectDir) {
    console.error("Usage: node create-remotion-project.js <project-dir>");
    process.exit(1);
  }

  const configPath = path.join(projectDir, "video-config.json");
  let config = { theme: "cyberpunk" };
  if (fs.existsSync(configPath)) {
    try {
      config = { ...config, ...JSON.parse(fs.readFileSync(configPath, "utf8")) };
    } catch (e) {
      console.warn("video-config.json parse failed, using defaults");
    }
  }

  createProject(projectDir, config);
}
