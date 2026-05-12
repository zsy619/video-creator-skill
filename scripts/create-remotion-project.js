#!/usr/bin/env node
/**
 * create-remotion-project.js
 * 根据 video-config.json 生成完整的 Remotion Native 项目
 *
 * 生成内容：
 *   - src/Root.tsx              Composition + calculateMetadata（动态时长）
 *   - src/Video.tsx             主组件：<Audio> + 6×<Sequence> + <CaptionOverlay>
 *   - src/components/CaptionOverlay.tsx  @remotion/captions 渲染 ASS 字幕
 *   - src/scenes/Scene*.tsx     6个场景组件
 *   - src/themes/index.ts       30主题配置
 *   - public/audio/             音频和字幕 JSON
 *   - package.json              remotion + @remotion/captions + zod@4.3.6
 *   - remotion.config.ts        60fps / 1080×1920 / concurrency=4
 *
 * 关键约束：
 *   - 音频内嵌 Remotion（无需 ffmpeg 混流）
 *   - 字幕通过 @remotion/captions 直接烧录到帧（无需 ffmpeg 烧录）
 *   - calculateMetadata 通过 @remotion/media 获取音频时长
 *   - 严禁 import fs（webpack 无法解析 Node.js 模块）
 */

const fs = require("fs");
const path = require("path");

// ─────────────────────────────────────────────────────────────────────────────
// 30 主题配置（从 THEMES.md 迁移）
// ─────────────────────────────────────────────────────────────────────────────
const THEMES = {
  "tech-modern":     { primary: "#2563EB", secondary: "#7C3AED", accent: "#10B981", bg: "#0F172A", font: "Inter",    particleCount: 80 },
  "cyberpunk":       { primary: "#00FFFF", secondary: "#FF00FF", accent: "#FFFF00", bg: "#0D0221", font: "JetBrains Mono", particleCount: 100 },
  "neon-future":     { primary: "#00FF88", secondary: "#FF0088", accent: "#8800FF", bg: "#000022", font: "Orbitron",  particleCount: 120 },
  "minimal-tech":    { primary: "#1E293B", secondary: "#475569", accent: "#F8FAFC", bg: "#020617", font: "Inter",    particleCount: 40 },
  "particle-tech":   { primary: "#00FFCC", secondary: "#FFCC00", accent: "#CC00FF", bg: "#0F0F23", font: "Inter",    particleCount: 150 },
  "gradient-wave":   { primary: "#06B6D4", secondary: "#8B5CF6", accent: "#EC4899", bg: "#020617", font: "Poppins",  particleCount: 60 },
  "glass-morphism":  { primary: "rgba(255,255,255,0.8)", secondary: "rgba(0,255,204,0.6)", accent: "rgba(0,153,255,0.4)", bg: "rgba(10,10,15,0.9)", font: "Poppins", particleCount: 50 },
  "holographic":    { primary: "#00FFCC", secondary: "#0099FF", accent: "#CC00FF", bg: "#000000", font: "Orbitron",  particleCount: 90 },
  "data-stream":    { primary: "#00FF00", secondary: "#00CCFF", accent: "#FF00FF", bg: "#001122", font: "JetBrains Mono", particleCount: 110 },
  "quantum-tech":   { primary: "#FF00CC", secondary: "#00FFCC", accent: "#CCFF00", bg: "#110011", font: "Orbitron",  particleCount: 130 },
  "vibrant-gradient": { primary: "#F97316", secondary: "#EAB308", accent: "#22C55E", bg: "#1C1917", font: "Poppins",  particleCount: 70 },
  "aurora-gradient": { primary: "#06B6D4", secondary: "#8B5CF6", accent: "#EC4899", bg: "#020617", font: "Poppins",  particleCount: 85 },
  "forest-nature":  { primary: "#059669", secondary: "#10B981", accent: "#F59E0B", bg: "#064E3B", font: "Inter",    particleCount: 60 },
  "deep-ocean":     { primary: "#0891B2", secondary: "#4F46E5", accent: "#06B6D4", bg: "#030712", font: "Inter",    particleCount: 90 },
  "arctic-ice":     { primary: "#38BDF8", secondary: "#818CF8", accent: "#34D399", bg: "#0C1222", font: "Inter",    particleCount: 80 },
  "dark-minimal":   { primary: "#1E293B", secondary: "#475569", accent: "#F8FAFC", bg: "#020617", font: "Inter",    particleCount: 30 },
  "neon-city":      { primary: "#F43F5E", secondary: "#8B5CF6", accent: "#FBBF24", bg: "#18181B", font: "JetBrains Mono", particleCount: 100 },
  "fintech":        { primary: "#059669", secondary: "#10B981", accent: "#FBBF24", bg: "#052E16", font: "Inter",    particleCount: 70 },
  "pure-medical":   { primary: "#0EA5E9", secondary: "#14B8A6", accent: "#FFFFFF", bg: "#F0F9FF", font: "Inter",    particleCount: 50 },
  "autumn-vintage": { primary: "#DC2626", secondary: "#F59E0B", accent: "#2563EB", bg: "#1C1917", font: "Playfair Display", particleCount: 55 },
  "game-elite":     { primary: "#8B5CF6", secondary: "#EC4899", accent: "#F97316", bg: "#0F0F23", font: "Orbitron",  particleCount: 110 },
  "education-blue": { primary: "#3B82F6", secondary: "#06B6D4", accent: "#10B981", bg: "#0F172A", font: "Inter",    particleCount: 65 },
  "food-warm":      { primary: "#F97316", secondary: "#EAB308", accent: "#DC2626", bg: "#1C1917", font: "Poppins",   particleCount: 60 },
  "travel-adventure": { primary: "#059669", secondary: "#10B981", accent: "#F59E0B", bg: "#064E3B", font: "Inter",   particleCount: 70 },
  "music-beat":     { primary: "#EC4899", secondary: "#8B5CF6", accent: "#F97316", bg: "#18181B", font: "Poppins",  particleCount: 90 },
  "news-official":  { primary: "#1E40AF", secondary: "#3B82F6", accent: "#FFFFFF", bg: "#0F172A", font: "Inter",    particleCount: 50 },
  "pet-cute":       { primary: "#F472B6", secondary: "#FB923C", accent: "#34D399", bg: "#1C1917", font: "Poppins",  particleCount: 80 },
  "auto-tech":      { primary: "#1F2937", secondary: "#374151", accent: "#F9FAFB", bg: "#030712", font: "Inter",    particleCount: 70 },
  "startup-energy": { primary: "#10B981", secondary: "#059669", accent: "#F97316", bg: "#022C22", font: "Inter",    particleCount: 80 },
  "luxury-elegant": { primary: "#B8860B", secondary: "#D97706", accent: "#FFFFFF", bg: "#1C1917", font: "Playfair Display", particleCount: 45 },
};

// ─────────────────────────────────────────────────────────────────────────────
// 场景脚本数据（从 docs/video-script.md 读取，或使用默认值）
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_SCENES = [
  { id: 1, name: "Cover",      duration: 3,  title: "主标题",         subtitle: "副标题" },
  { id: 2, name: "PainPoint",  duration: 10, title: "痛点场景",       subtitle: "描述问题" },
  { id: 3, name: "Solution",   duration: 12, title: "解决方案",       subtitle: "介绍产品" },
  { id: 4, name: "Features",   duration: 15, title: "核心功能",       subtitle: "功能列表" },
  { id: 5, name: "Start",      duration: 8,  title: "快速上手",       subtitle: "操作步骤" },
  { id: 6, name: "Ending",     duration: 4,  title: "行动号召",       subtitle: "关注/下载" },
];

// ─────────────────────────────────────────────────────────────────────────────
// ASS → captions.json 转换（用于 @remotion/captions）
// ─────────────────────────────────────────────────────────────────────────────
/**
 * 将 ASS 字幕文件转换为 @remotion/captions 格式的 JSON
 * @param {string} assContent - ASS 文件原始内容
 * @returns {Array} Caption[] 数组
 */
function assToCaptions(assContent) {
  const captions = [];
  const styleMatch = assContent.match(/Style: Default,([^,]+),(\d+),/);
  const fontSize = styleMatch ? parseInt(styleMatch[2]) : 72;

  // 解析 Dialogue 行
  const dialogueRegex = /^Dialogue: (\d+),(\d+):(\d+):(\d+)\.(\d+),(\d+):(\d+):(\d+)\.(\d+),([^,]*),([^,]*),([^,]*),([^,]*),([^,]*),(.+)$/gm;
  let match;

  while ((match = dialogueRegex.exec(assContent)) !== null) {
    const startMs = (parseInt(match[2]) * 3600 + parseInt(match[3]) * 60 + parseInt(match[4])) * 1000 + parseInt(match[5]) * 10;
    const endMs   = (parseInt(match[6]) * 3600 + parseInt(match[7]) * 60 + parseInt(match[8])) * 1000 + parseInt(match[9]) * 10;
    const text = match[15]
      .replace(/\\N/g, " ")
      .replace(/\\n/g, " ")
      .replace(/\{[^}]*\}/g, "")
      .trim();

    if (text) {
      captions.push({
        text,
        startMs,
        endMs,
        timestampMs: null,
        confidence: null,
      });
    }
  }

  return captions;
}

// ─────────────────────────────────────────────────────────────────────────────
// 生成 Remotion 项目文件
// ─────────────────────────────────────────────────────────────────────────────
function createProject(projectDir, config) {
  const videoProjectDir = path.join(projectDir, "video-project");
  const srcDir = path.join(videoProjectDir, "src");
  const componentsDir = path.join(srcDir, "components");
  const scenesDir = path.join(srcDir, "scenes");
  const themesDir = path.join(srcDir, "themes");
  const publicAudioDir = path.join(videoProjectDir, "public", "audio");

  // 创建目录
  for (const dir of [srcDir, componentsDir, scenesDir, themesDir, publicAudioDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const theme = THEMES[config.theme] || THEMES["tech-modern"];
  const fps = config.fps || 60;
  const width = config.width || 1080;
  const height = config.height || 1920;

  // ── 1. package.json ────────────────────────────────────────────────────────
  const packageJson = {
    name: "video-project-remotion",
    version: "1.0.0",
    description: "Remotion Native video rendering",
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
  };
  fs.writeFileSync(path.join(videoProjectDir, "package.json"), JSON.stringify(packageJson, null, 2));

  // ── 2. remotion.config.ts ──────────────────────────────────────────────────
  const remotionConfig = `import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
`;
  fs.writeFileSync(path.join(videoProjectDir, "remotion.config.ts"), remotionConfig);

  // ── 3. tsconfig.json ──────────────────────────────────────────────────────
  const tsconfig = {
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
  };
  fs.writeFileSync(path.join(videoProjectDir, "tsconfig.json"), JSON.stringify(tsconfig, null, 2));

  // ── 4. src/themes/index.ts ─────────────────────────────────────────────────
  const themesIndex = `export interface ThemeConfig {
  id: string;
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  font: string;
  particleCount: number;
}

export const THEMES: Record<string, ThemeConfig> = ${JSON.stringify(THEMES, null, 2).replace(/"([^"]+)":/g, "$1:")};

export function getTheme(id: string): ThemeConfig {
  return THEMES[id] || THEMES["tech-modern"];
}
`;
  fs.writeFileSync(path.join(themesDir, "index.ts"), themesIndex);

  // ── 5. src/components/CaptionOverlay.tsx ───────────────────────────────────
  // TikTok 风格逐字高亮字幕（sentence-level captions.json，无需 word-level timing）
  const captionOverlay = `import React, { useState, useEffect, useMemo } from "react";
import {
  AbsoluteFill,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import type { Caption } from "@remotion/captions";

const HIGHLIGHT_COLOR = "#39E508";
const ACTIVE_COLOR = "#FFFFFF";
const INACTIVE_COLOR = "rgba(255,255,255,0.45)";
const FONT_SIZE = 64;
const LINE_HEIGHT = 1.5;

function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const regex = /[\\u4e00-\\u9fff]+|[\\u3000-\\u303f\\uff00-\\uffef]+|[a-zA-Z0-9]+|[\\u0020-\\u007f]+/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const token = match[0];
    if (token.trim()) tokens.push(token);
  }
  return tokens.length === 0 ? text.split("") : tokens;
}

const TikTokCaptionLine: React.FC<{
  text: string;
  startFrame: number;
  durationInFrames: number;
  fps: number;
}> = ({ text, startFrame, durationInFrames, fps }) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;
  const tokens = useMemo(() => tokenize(text), [text]);
  const msPerToken = (durationInFrames / tokens.length / fps) * 1000;

  const entryProgress = interpolate(localFrame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const entryScale = interpolate(entryProgress, [0, 1], [0.85, 1]);
  const entryOpacity = interpolate(entryProgress, [0, 1], [0, 1]);

  const exitFadeStart = Math.max(0, durationInFrames - 20);
  const exitOpacity = interpolate(localFrame, [exitFadeStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = entryOpacity * exitOpacity;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 56,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        pointerEvents: "none",
        opacity,
        transform: \`scale(\${entryScale})\`,
      }}
    >
      <div
        style={{
          background: "rgba(0,0,0,0.55)",
          borderRadius: 12,
          padding: "12px 36px",
          maxWidth: "92%",
        }}
      >
        <div
          style={{
            fontSize: FONT_SIZE,
            fontWeight: "bold",
            whiteSpace: "pre-wrap",
            textAlign: "center",
            padding: "0 8px",
            fontFamily: "STHeiti Medium, sans-serif",
            lineHeight: LINE_HEIGHT,
            color: ACTIVE_COLOR,
          }}
        >
          {tokens.map((token, i) => {
            const tokenStartMs = i * msPerToken;
            const tokenEndMs = (i + 1) * msPerToken;
            const currentMs = localFrame * (1000 / fps);
            const isActive = currentMs >= tokenStartMs;
            const isPast = currentMs > tokenEndMs;
            return (
              <span
                key={i}
                style={{
                  color: isPast ? INACTIVE_COLOR : isActive ? HIGHLIGHT_COLOR : ACTIVE_COLOR,
                  display: "inline-block",
                  transition: "color 0.08s ease",
                }}
              >
                {token}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const CaptionOverlay: React.FC<{ captionsFile?: string }> = ({
  captionsFile = "audio/captions.json",
}) => {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const { fps } = useVideoConfig();

  useEffect(() => {
    fetch(staticFile(captionsFile))
      .then((res) => res.json())
      .then((data) => setCaptions(data))
      .catch(() => setCaptions([]));
  }, [captionsFile]);

  if (captions.length === 0 || !fps) return null;

  return (
    <AbsoluteFill>
      {captions.map((caption, index) => {
        const nextCaption = captions[index + 1] ?? null;
        const startFrame = Math.floor((caption.startMs / 1000) * fps);
        const endFrame = nextCaption
          ? Math.floor((nextCaption.startMs / 1000) * fps)
          : Math.floor((caption.endMs / 1000) * fps);
        const durationInFrames = endFrame - startFrame;
        if (durationInFrames <= 0) return null;

        return (
          <Sequence key={index} from={startFrame} durationInFrames={durationInFrames}>
            <TikTokCaptionLine
              text={caption.text}
              startFrame={0}
              durationInFrames={durationInFrames}
              fps={fps}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
`;
  fs.writeFileSync(path.join(componentsDir, "CaptionOverlay.tsx"), captionOverlay);

  // ── 6. src/scenes/ ─────────────────────────────────────────────────────────
  const sceneNames = ["Scene1_Cover", "Scene2_PainPoint", "Scene3_Solution", "Scene4_Features", "Scene5_Start", "Scene6_Ending"];
  for (const sceneName of sceneNames) {
    const sceneCode = `import React from "react";
import { AbsoluteFill } from "remotion";

interface SceneProps {
  title: string;
  subtitle: string;
  theme: Record<string, string | number>;
}

export const ${sceneName}: React.FC<SceneProps> = ({ title, subtitle, theme }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: String(theme.bg || "#0F172A"),
        justifyContent: "center",
        alignItems: "center",
        fontFamily: String(theme.font || "Inter"),
      }}
    >
      <div
        style={{
          fontSize: 120,
          fontWeight: 800,
          color: String(theme.primary || "#00FFFF"),
          textAlign: "center",
          textShadow: \`0 0 20px \${String(theme.primary || "#00FFFF")}, 0 0 40px \${String(theme.secondary || "#FF00FF")}\`,
          padding: "0 40px",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 48,
          fontWeight: 600,
          color: String(theme.secondary || "#FF00FF"),
          marginTop: 20,
          textAlign: "center",
        }}
      >
        {subtitle}
      </div>
    </AbsoluteFill>
  );
};
`;
    fs.writeFileSync(path.join(scenesDir, `${sceneName}.tsx`), sceneCode);
  }

  // scenes/index.ts
  const scenesIndex = sceneNames.map((name) => `export { ${name} } from "./${name}";`).join("\n");
  fs.writeFileSync(path.join(scenesDir, "index.ts"), scenesIndex);

  // ── 7. src/Video.tsx ────────────────────────────────────────────────────────
  const videoTsx = `import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import { CaptionOverlay, renderCaptions } from "./components/CaptionOverlay";
import { THEMES } from "./themes";
import { createTikTokStyleCaptions } from "@remotion/captions";
import type { Caption } from "@remotion/captions";

// 导入6个场景
import { Scene1_Cover } from "./scenes/Scene1_Cover";
import { Scene2_PainPoint } from "./scenes/Scene2_PainPoint";
import { Scene3_Solution } from "./scenes/Scene3_Solution";
import { Scene4_Features } from "./scenes/Scene4_Features";
import { Scene5_Start } from "./scenes/Scene5_Start";
import { Scene6_Ending } from "./scenes/Scene6_Ending";

export interface VideoProps {
  title: string;
  subtitle: string;
  theme: string;
  scenes: Array<{
    id: number;
    title: string;
    subtitle: string;
    duration: number;
  }>;
  audioFile: string;
  captionsFile: string;
}

const FPS = 60;

export const VerticalVideo: React.FC<VideoProps> = ({
  title,
  subtitle,
  theme: themeId,
  scenes,
  audioFile,
  captionsFile,
}) => {
  const theme = THEMES[themeId] || THEMES["tech-modern"];
  const { fps } = useVideoConfig();

  // 加载字幕
  const captionsData = useMemo(() => {
    try {
      // 动态加载：返回空让组件自己 fetch
      return null as unknown as Caption[];
    } catch {
      return [] as Caption[];
    }
  }, []);

  const sceneList = scenes.length > 0 ? scenes : ${JSON.stringify(DEFAULT_SCENES)};

  // 计算每个场景的起始帧
  let currentFrame = 0;
  const sceneTimings = sceneList.map((scene) => {
    const startFrame = currentFrame;
    const durationInFrames = Math.ceil(scene.duration * fps);
    currentFrame += durationInFrames;
    return { ...scene, startFrame, durationInFrames };
  });

  const totalFrames = currentFrame;

  return (
    <AbsoluteFill style={{ backgroundColor: String(theme.bg) }}>
      {/* 音频：内嵌 Remotion，直接输出到 MP4 */}
      <Audio src={staticFile(audioFile)} />

      {/* 场景序列 */}
      {sceneTimings.map((scene, idx) => {
        const SceneComponent = [
          Scene1_Cover,
          Scene2_PainPoint,
          Scene3_Solution,
          Scene4_Features,
          Scene5_Start,
          Scene6_Ending,
        ][idx] || Scene1_Cover;

        return (
          <Sequence
            key={scene.id}
            from={scene.startFrame}
            durationInFrames={scene.durationInFrames}
            premountFor={1 * fps}
          >
            <SceneComponent title={scene.title} subtitle={scene.subtitle} theme={theme} />
          </Sequence>
        );
      })}

      {/* 字幕覆盖层：@remotion/captions 直接烧录，无需 ffmpeg */}
      <CaptionOverlay captionsFile={captionsFile} />
    </AbsoluteFill>
  );
};
`;
  fs.writeFileSync(path.join(srcDir, "Video.tsx"), videoTsx);

  // ── 8. src/Root.tsx ───────────────────────────────────────────────────────
  const rootTsx = `import { Composition } from "remotion";
import { VerticalVideo, VideoProps } from "./Video";

const FPS = 60;
const WIDTH = 1080;
const HEIGHT = 1920;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="VerticalVideo"
      component={VerticalVideo}
      durationInFrames={60 * 39} // Placeholder: 39 seconds (~2340 frames)
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{
        title: "Video Title",
        subtitle: "Subtitle",
        theme: "cyberpunk",
        scenes: [] as VideoProps["scenes"],
        audioFile: "audio/neural_1_2x.m4a",
        captionsFile: "audio/captions.json",
      }}
    />
  );
};
`;
  fs.writeFileSync(path.join(srcDir, "Root.tsx"), rootTsx);

  // ── 9. src/index.ts ────────────────────────────────────────────────────────
  const indexTs = `import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
`;
  fs.writeFileSync(path.join(srcDir, "index.ts"), indexTs);

  // ── 10. public/audio/ captions.json（从 ASS 转换）─────────────────────────
  const assPath = path.join(projectDir, "audio", "subtitles.ass");
  const captionsPath = path.join(publicAudioDir, "captions.json");
  if (fs.existsSync(assPath)) {
    const assContent = fs.readFileSync(assPath, "utf8");
    const captions = assToCaptions(assContent);
    fs.writeFileSync(captionsPath, JSON.stringify(captions, null, 2));
  }

  // ── 11. 复制音频文件到 public/audio/ ──────────────────────────────────────
  const audioSrc = path.join(projectDir, "audio", "neural_1_2x.m4a");
  const audioDst = path.join(publicAudioDir, "neural_1_2x.m4a");
  if (fs.existsSync(audioSrc) && !fs.existsSync(audioDst)) {
    fs.copyFileSync(audioSrc, audioDst);
  }

  console.log("✅ Remotion 项目已生成:");
  console.log("   video-project/");
  console.log("   ├── package.json");
  console.log("   ├── remotion.config.ts");
  console.log("   ├── tsconfig.json");
  console.log("   ├── src/");
  console.log("   │   ├── index.ts");
  console.log("   │   ├── Root.tsx");
  console.log("   │   ├── Video.tsx");
  console.log("   │   ├── components/CaptionOverlay.tsx");
  console.log("   │   ├── scenes/Scene*.tsx (6个)");
  console.log("   │   └── themes/index.ts");
  console.log("   └── public/audio/");
  console.log("       ├── neural_1_2x.m4a");
  console.log("       └── captions.json");
  console.log("");
  console.log("下一步:");
  console.log("  1. cd video-project && npm install");
  console.log("  2. npx remotion render VerticalVideo out/final.mp4 --concurrency=4 --fps=60 --disable-gpu");
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI 入口
// ─────────────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const projectDir = process.argv[2];
  if (!projectDir) {
    console.error("用法: node create-remotion-project.js <项目目录>");
    process.exit(1);
  }

  const configPath = path.join(projectDir, "video-config.json");
  let config = { theme: "cyberpunk", fps: 60, width: 1080, height: 1920 };

  if (fs.existsSync(configPath)) {
    try {
      config = { ...config, ...JSON.parse(fs.readFileSync(configPath, "utf8")) };
    } catch (e) {
      console.warn("⚠️ video-config.json 解析失败，使用默认配置");
    }
  }

  createProject(projectDir, config);
}

module.exports = { createProject, assToCaptions, THEMES };
