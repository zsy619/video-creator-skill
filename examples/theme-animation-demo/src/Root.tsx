import React from 'react';
import { Composition, Folder } from 'remotion';
import { ThemeAnimationDemo } from './ThemeAnimationDemo';

export const RemotionRoot: React.FC = () => {
  return (
    <Folder name="Theme-Animation-Demo">
      <Composition
        id="ThemeAnimationDemo"
        component={ThemeAnimationDemo}
        durationInFrames={300} // 5秒演示
        fps={60}
        width={1080}
        height={1920}
        defaultProps={{
          theme: 'tech-modern',
        }}
      />
    </Folder>
  );
};
