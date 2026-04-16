/**
 * 柱状图动画组件
 *
 * 基于远程 remotion 技能的最佳实践实现
 * - 使用 spring 动画实现柱状图弹入效果
 * - 支持自定义颜色和尺寸
 * - 支持 Y 轴刻度和标签
 */

import React from 'react';
import {spring, useCurrentFrame, useVideoConfig, AbsoluteFill} from 'remotion';

export interface BarChartProps {
  data: {label: string; value: number}[];
  barColor?: string;
  labelColor?: string;
  mutedColor?: string;
  backgroundColor?: string;
  width?: number;
  height?: number;
  title?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  barColor = '#D4AF37',
  labelColor = '#ffffff',
  mutedColor = '#888888',
  backgroundColor = '#0a0a0a',
  width = 1280,
  height = 720,
  title,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const minValue = Math.min(...data.map((d) => d.value));
  const maxValue = Math.max(...data.map((d) => d.value));
  const valueRange = maxValue - minValue || 1;
  const chartHeight = height - 280;

  const yAxisSteps = calculateAxisSteps(minValue, maxValue, 4);

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        padding: 60,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'sans-serif',
      }}
    >
      {title && <Title text={title} labelColor={labelColor} />}

      <div style={{display: 'flex', flex: 1}}>
        <YAxis steps={yAxisSteps} height={chartHeight} mutedColor={mutedColor} />
        <XAxis height={chartHeight} labels={data.map((d) => d.label)} barColor={barColor}>
          {data.map((item, i) => {
            const progress = spring({
              frame: frame - i * 5 - 10,
              fps,
              config: {damping: 18, stiffness: 80},
            });

            const barHeight = ((item.value - minValue) / valueRange) * chartHeight * progress;

            return <Bar key={item.label} height={barHeight} progress={progress} color={barColor} />;
          })}
        </XAxis>
      </div>
    </AbsoluteFill>
  );
};

const Title: React.FC<{text: string; labelColor: string}> = ({text, labelColor}) => (
  <div style={{textAlign: 'center', marginBottom: 40}}>
    <div style={{color: labelColor, fontSize: 48, fontWeight: 600}}>{text}</div>
  </div>
);

const YAxis: React.FC<{steps: number[]; height: number; mutedColor: string}> = ({steps, height, mutedColor}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      height,
      paddingRight: 16,
    }}
  >
    {steps.slice().reverse().map((step) => (
      <div
        key={step}
        style={{
          color: mutedColor,
          fontSize: 20,
          textAlign: 'right',
        }}
      >
        {step.toLocaleString()}
      </div>
    ))}
  </div>
);

const Bar: React.FC<{height: number; progress: number; color: string}> = ({height, progress, color}) => (
  <div
    style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
    }}
  >
    <div
      style={{
        width: '100%',
        height,
        backgroundColor: color,
        borderRadius: '8px 8px 0 0',
        opacity: progress,
      }}
    />
  </div>
);

const XAxis: React.FC<{
  children: React.ReactNode;
  labels: string[];
  height: number;
  barColor: string;
}> = ({children, labels, height, barColor}) => {
  const axisColor = '#333333';

  return (
    <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 16,
          height,
          borderLeft: `2px solid ${axisColor}`,
          borderBottom: `2px solid ${axisColor}`,
          paddingLeft: 16,
        }}
      >
        {children}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 16,
          paddingLeft: 16,
          marginTop: 12,
        }}
      >
        {labels.map((label) => (
          <div
            key={label}
            style={{
              flex: 1,
              textAlign: 'center',
              color: '#888888',
              fontSize: 20,
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
};

function calculateAxisSteps(min: number, max: number, count: number): number[] {
  const step = (max - min) / (count - 1);
  return Array.from({length: count}, (_, i) => Math.round(min + i * step));
}

export default BarChart;
