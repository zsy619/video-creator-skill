/**
 * 主题动画 Hook - 用于 Remotion 组件
 * 
 * 提供主题适配的动画函数
 * 
 * @version 1.1.0
 * @date 2026-04-21
 */

import { useMemo } from 'react';
import { spring, interpolate, useCurrentFrame, useVideoConfig, Extrapolate } from 'remotion';
import { getThemeAnimation, getGlowConfig, hasSpecialEffect as checkSpecialEffect } from './themes';

/**
 * 主题动画 Hook 返回类型
 */
export interface UseThemeAnimationReturn {
  // 基础动画值
  opacity: number;
  scale: number;
  translateY: number;
  
  // 弹簧动画配置
  springConfig: {
    damping: number;
    stiffness: number;
    mass: number;
  };
  
  // 光晕配置
  glow: {
    intensity: number;
    color: string;
  };
  
  // 特殊效果
  hasSpecialEffect: (effect: string) => boolean;
  
  // 动画时间参数
  fadeDuration: number;
  slideDuration: number;
  
  // 缩放范围
  scaleRange: { from: number; to: number };
  
  // 粒子速度
  particleSpeed: number;
}

/**
 * 使用主题动画
 * 
 * @param themeId 主题ID
 * @param options 配置选项
 * @param options.startFrame 动画开始帧（默认 0）
 * @param options.delay 延迟帧数（默认 0）
 * @param options.entranceOnly 是否仅入场动画（默认 true）
 * @returns 主题动画 Hook 返回值
 */
export const useThemeAnimation = (
  themeId: string,
  options: {
    startFrame?: number;
    delay?: number;
    entranceOnly?: boolean;
  } = {}
): UseThemeAnimationReturn => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  const { startFrame = 0, delay = 0, entranceOnly = true } = options;
  
  // 获取主题动画配置
  const themeAnim = useMemo(() => {
    return getThemeAnimation(themeId);
  }, [themeId]);
  
  // 实际动画起始帧
  const animFrame = Math.max(0, frame - startFrame - delay);
  
  // 弹簧动画配置
  const springConfig = themeAnim.spring;
  
  // 入场弹簧动画
  const entranceSpring = spring({
    frame: animFrame,
    fps,
    config: springConfig,
  });
  
  // 出场弹簧动画（如果不禁用）
  const exitSpring = !entranceOnly
    ? spring({
        frame: frame - (durationInFrames - 30),
        fps,
        config: springConfig,
      })
    : { value: 1 };
  
  // 透明度动画
  const opacity = interpolate(
    animFrame,
    [0, themeAnim.fade.duration],
    [0, 1],
    {
      extrapolateRight: Extrapolate.CLAMP,
    }
  );
  
  // 缩放动画
  const scale = interpolate(
    entranceSpring.value,
    [0, 1],
    [themeAnim.scale.from, themeAnim.scale.to],
    { extrapolateRight: Extrapolate.CLAMP }
  );
  
  // Y轴位移动画（滑入）
  const translateY = interpolate(
    entranceSpring.value,
    [0, 1],
    [50, 0],
    { extrapolateRight: Extrapolate.CLAMP }
  );
  
  // 检查特殊效果
  const hasSpecialEffect = (effect: string) => {
    return themeAnim.special.includes(effect);
  };
  
  return {
    opacity,
    scale,
    translateY,
    springConfig,
    glow: themeAnim.glow,
    hasSpecialEffect,
    fadeDuration: themeAnim.fade.duration,
    slideDuration: themeAnim.slide.duration,
    scaleRange: themeAnim.scale,
    particleSpeed: themeAnim.particle.speed,
  };
};

/**
 * 使用主题脉冲动画（用于循环效果）
 * 
 * @param themeId 主题ID
 * @param options 配置选项
 * @param options.startFrame 动画开始帧
 * @param options.period 脉冲周期（默认 60 帧 = 1 秒）
 * @returns 脉冲动画值 0-1
 */
export const useThemePulse = (
  themeId: string,
  options: {
    startFrame?: number;
    period?: number;
  } = {}
) => {
  const frame = useCurrentFrame();
  const { startFrame = 0, period = 60 } = options;
  
  const animFrame = Math.max(0, frame - startFrame);
  
  const pulse = interpolate(
    animFrame % period,
    [0, period / 2, period],
    [0, 1, 0],
    { extrapolateRight: Extrapolate.CLAMP }
  );
  
  return pulse;
};

/**
 * 使用主题光晕动画
 * 
 * @param themeId 主题ID
 * @param baseIntensity 基础光晕强度（默认 0.5）
 * @returns 光晕效果 { opacity, scale, blur, color }
 */
export const useThemeGlow = (
  themeId: string,
  baseIntensity: number = 0.5
) => {
  const glowConfig = getGlowConfig(themeId);
  const { intensity, color } = glowConfig;
  
  const pulse = useThemePulse(themeId);
  
  // 光晕透明度
  const opacity = interpolate(
    pulse,
    [0, 1],
    [intensity * baseIntensity * 0.5, intensity * baseIntensity],
    { extrapolateRight: Extrapolate.CLAMP }
  );
  
  // 光晕缩放
  const scale = interpolate(
    pulse,
    [0, 1],
    [0.9, 1.1],
    { extrapolateRight: Extrapolate.CLAMP }
  );
  
  return {
    opacity,
    scale,
    color,
    blur: 20,
  };
};

/**
 * 预设动画钩子 - 用于常见动画模式
 */
export const useEntranceAnimation = (themeId: string) => {
  return useThemeAnimation(themeId, { entranceOnly: true });
};

export const useLoopAnimation = (themeId: string) => {
  return useThemePulse(themeId);
};

export const useGlowAnimation = (themeId: string) => {
  return useThemeGlow(themeId);
};

/**
 * 获取主题动画配置（纯函数版本，用于非 Hook 场景）
 */
export const getThemeAnimConfig = (themeId: string) => {
  return getThemeAnimation(themeId);
};

/**
 * 检查主题是否有特殊效果（纯函数版本）
 */
export const themeHasSpecialEffect = (themeId: string, effect: string) => {
  return checkSpecialEffect(themeId, effect);
};
