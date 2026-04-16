/**
 * 粒子背景动画组件
 *
 * 新增组件 - 基于 Remotion 最佳实践
 * - 使用帧驱动动画实现流畅的粒子效果
 * - 支持自定义粒子数量和颜色
 * - 性能优化：使用 useMemo 缓存粒子数据
 */

import React, {useMemo} from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export interface ParticleBackgroundProps {
  particleCount?: number;
  primaryColor?: string;
  secondaryColor?: string;
  speed?: number;
  minSize?: number;
  maxSize?: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
  phase: number;
}

export const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
  particleCount = 50,
  primaryColor = '#00ffcc',
  secondaryColor = '#0099ff',
  speed = 1,
  minSize = 2,
  maxSize = 6,
}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();

  // 使用 useMemo 缓存粒子数据，避免每次渲染都重新生成
  const particles = useMemo<Particle[]>(() => {
    return Array.from({length: particleCount}, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: minSize + Math.random() * (maxSize - minSize),
      color: Math.random() > 0.5 ? primaryColor : secondaryColor,
      speed: 0.2 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
    }));
  }, [particleCount, width, height, primaryColor, secondaryColor, minSize, maxSize]);

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
      }}
    >
      {particles.map((particle, index) => {
        // 计算粒子位置（上下浮动效果）
        const floatOffset = Math.sin((frame * speed * particle.speed + particle.phase)) * 20;
        const x = particle.x + Math.cos(frame * 0.01 + particle.phase) * 10;
        const y = (particle.y + floatOffset + height) % height;

        // 计算透明度（脉冲效果）
        const opacity = 0.3 + 0.3 * Math.sin(frame * 0.05 + particle.phase);

        // 计算大小变化
        const size = particle.size * (0.8 + 0.4 * Math.sin(frame * 0.03 + particle.phase));

        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: '50%',
              backgroundColor: particle.color,
              opacity,
              boxShadow: `0 0 ${size * 2}px ${particle.color}`,
            }}
          />
        );
      })}

      {/* 连接线效果（可选） */}
      <Connections particles={particles} frame={frame} primaryColor={primaryColor} />
    </AbsoluteFill>
  );
};

/**
 * 粒子连接线组件
 */
const Connections: React.FC<{
  particles: Particle[];
  frame: number;
  primaryColor: string;
}> = ({particles, frame, primaryColor}) => {
  const {width, height} = useVideoConfig();
  const maxDistance = 150;

  // 筛选出需要画线的粒子对
  const connections = useMemo(() => {
    const result: {x1: number; y1: number; x2: number; y2: number; opacity: number}[] = [];

    for (let i = 0; i < Math.min(particles.length, 20); i++) {
      for (let j = i + 1; j < Math.min(particles.length, 20); j++) {
        const p1 = particles[i];
        const p2 = particles[j];

        // 简化计算：使用初始位置判断距离
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < maxDistance) {
          result.push({
            x1: p1.x,
            y1: p1.y,
            x2: p2.x,
            y2: p2.y,
            opacity: 1 - distance / maxDistance,
          });
        }
      }
    }

    return result.slice(0, 30); // 限制连接线数量
  }, [particles]);

  return (
    <>
      {connections.map((conn, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: Math.min(conn.x1, conn.x2),
            top: Math.min(conn.y1, conn.y2),
            width: Math.sqrt(Math.pow(conn.x2 - conn.x1, 2) + Math.pow(conn.y2 - conn.y1, 2)),
            height: 1,
            backgroundColor: primaryColor,
            opacity: conn.opacity * 0.2,
            transform: `rotate(${Math.atan2(conn.y2 - conn.y1, conn.x2 - conn.x1)}rad)`,
            transformOrigin: 'left center',
          }}
        />
      ))}
    </>
  );
};

export default ParticleBackground;
