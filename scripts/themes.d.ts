/**
 * themes.js TypeScript 声明文件
 * 
 * 为 themes.js 提供类型提示
 * @version 1.1.0
 * @date 2026-04-21
 */

/**
 * 主题配置
 */
interface Theme {
  name: string;
  id: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  colors: string[];
  gradient: string;
  particleCount: number;
  fontFamily: string;
  适用场景: string;
  animation: ThemeAnimation;
}

/**
 * 主题动画配置
 */
interface ThemeAnimation {
  spring: {
    damping: number;
    stiffness: number;
    mass: number;
  };
  fade: {
    duration: number;
  };
  slide: {
    duration: number;
  };
  scale: {
    from: number;
    to: number;
  };
  glow: {
    intensity: number;
    color: string;
  };
  particle: {
    speed: number;
    count: number;
  };
  special: string[];
}

/**
 * 平台规格
 */
interface PlatformSpec {
  width: number;
  height: number;
  fps: number;
  bitrate: string;
}

/**
 * THEMES 对象类型
 */
declare const THEMES: Record<string, Theme>;

/**
 * 获取主题配置
 * @param styleId 主题ID
 * @returns 主题配置对象
 */
declare function getTheme(styleId: string): Theme;

/**
 * 获取主题动画配置
 * @param styleId 主题ID
 * @returns 动画配置对象
 */
declare function getThemeAnimation(styleId: string): ThemeAnimation;

/**
 * 获取主题光晕配置
 * @param styleId 主题ID
 * @returns 光晕配置 { intensity, color }
 */
declare function getGlowConfig(styleId: string): { intensity: number; color: string };

/**
 * 检查主题是否有指定特殊效果
 * @param styleId 主题ID
 * @param effect 效果名称
 * @returns 是否有该效果
 */
declare function hasSpecialEffect(styleId: string, effect: string): boolean;

/**
 * 获取粒子速度
 * @param styleId 主题ID
 * @returns 粒子速度
 */
declare function getParticleSpeed(styleId: string): number;

/**
 * 获取平台规格
 * @param platform 平台ID
 * @returns 平台规格
 */
declare function getPlatformSpec(platform: string): PlatformSpec;

export {
  Theme,
  ThemeAnimation,
  PlatformSpec,
  THEMES,
  getTheme,
  getThemeAnimation,
  getGlowConfig,
  hasSpecialEffect,
  getParticleSpeed,
  getPlatformSpec,
};
