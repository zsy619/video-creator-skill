// 续接上面的代码...

  /**
   * 生成根组件
   */
  async generateRootComponent(projectDir, duration) {
    const rootContent = `import React from 'react';
import {Composition} from 'remotion';
import {Video} from './Video';

export const RemotionVideo: React.FC = () => {
  return (
    <>
      <Composition
        id="Video"
        component={Video}
        durationInFrames={${duration} * ${this.options.fps}}
        fps={${this.options.fps}}
        width={${this.options.width}}
        height={${this.options.height}}
        defaultProps={{}}
      />
    </>
  );
};`;
    
    await fs.writeFile(
      path.join(projectDir, 'src', 'Root.tsx'),
      rootContent
    );
  }

  /**
   * 渲染视频
   */
  async renderVideo(projectDir) {
    console.log('🔄 开始渲染视频...');
    
    const outputPath = path.join(this.options.outputDir, 'video', 'output.mp4');
    
    try {
      // 安装依赖
      console.log('📦 安装依赖...');
      await execAsync('npm install', { cwd: projectDir });
      
      // 渲染视频
      console.log('🎬 渲染视频中...');
      const renderCmd = `npx remotion render src/index.ts Video --codec=h264 --quality=100 --overwrite "${outputPath}"`;
      await execAsync(renderCmd, { cwd: projectDir });
      
      console.log(`✅ 视频渲染完成: ${outputPath}`);
      return outputPath;
      
    } catch (error) {
      console.error('❌ 视频渲染失败:', error.message);
      
      // 创建占位视频文件
      await this.createPlaceholderVideo(outputPath);
      return outputPath;
    }
  }

  /**
   * 创建占位视频
   */
  async createPlaceholderVideo(outputPath) {
    const placeholder = `# 视频渲染失败，请检查Remotion配置\n\n输出路径: ${outputPath}`;
    await fs.writeFile(outputPath.replace('.mp4', '.txt'), placeholder);
  }

  /**
   * 转义JavaScript字符串
   */
  escapeJsString(str) {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  /**
   * 主题定义
   */
  
  getTechModernTheme() {
    return {
      name: '现代科技风',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
      gradient: 'linear-gradient(45deg, #00ffcc, #0099ff, #cc00ff)',
      colors: ['#00ffcc', '#0099ff', '#cc00ff', '#ff9900'],
      textColor: '#ffffff',
      accentColor: '#00ffcc',
      textShadow: '0 0 50px rgba(0, 255, 204, 0.7), 0 0 100px rgba(0, 153, 255, 0.5)',
      boxShadow: '0 0 30px rgba(0, 255, 204, 0.5)',
      lightEffect: 'radial-gradient(ellipse at center, rgba(0, 255, 204, 0.15) 0%, rgba(0, 153, 255, 0.1) 25%, rgba(204, 0, 255, 0.05) 50%, transparent 70%)',
      particleCount: 80
    };
  }

  getCyberpunkTheme() {
    return {
      name: '赛博朋克风',
      background: 'linear-gradient(135deg, #000000 0%, #330033 100%)',
      gradient: 'linear-gradient(45deg, #ff00ff, #00ffff, #ffff00)',
      colors: ['#ff00ff', '#00ffff', '#ffff00', '#ff6600'],
      textColor: '#ffffff',
      accentColor: '#ff00ff',
      textShadow: '0 0 50px rgba(255, 0, 255, 0.7), 0 0 100px rgba(0, 255, 255, 0.5)',
      boxShadow: '0 0 30px rgba(255, 0, 255, 0.5)',
      lightEffect: 'radial-gradient(ellipse at center, rgba(255, 0, 255, 0.2) 0%, rgba(0, 255, 255, 0.15) 25%, rgba(255, 255, 0, 0.1) 50%, transparent 70%)',
      particleCount: 100
    };
  }

  getNeonFutureTheme() {
    return {
      name: '霓虹未来风',
      background: 'linear-gradient(135deg, #000022 0%, #220044 100%)',
      gradient: 'linear-gradient(45deg, #00ff88, #ff0088, #8800ff)',
      colors: ['#00ff88', '#ff0088', '#8800ff', '#ffaa00'],
      textColor: '#ffffff',
      accentColor: '#00ff88',
      textShadow: '0 0 50px rgba(0, 255, 136, 0.7), 0 0 100px rgba(255, 0, 136, 0.5)',
      boxShadow: '0 0 30px rgba(0, 255, 136, 0.5)',
      lightEffect: 'radial-gradient(ellipse at center, rgba(0, 255, 136, 0.2) 0%, rgba(255, 0, 136, 0.15) 25%, rgba(136, 0, 255, 0.1) 50%, transparent 70%)',
      particleCount: 120
    };
  }

  getMinimalTechTheme() {
    return {
      name: '极简科技风',
      background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
      gradient: 'linear-gradient(45deg, #000000, #666666, #999999)',
      colors: ['#000000', '#666666', '#999999', '#cccccc'],
      textColor: '#000000',
      accentColor: '#000000',
      textShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
      boxShadow: '0 2px 20px rgba(0, 0, 0, 0.1)',
      lightEffect: 'radial-gradient(ellipse at center, rgba(0, 0, 0, 0.05) 0%, rgba(102, 102, 102, 0.03) 25%, rgba(153, 153, 153, 0.01) 50%, transparent 70%)',
      particleCount: 40
    };
  }

  getGradientWaveTheme() {
    return {
      name: '渐变波纹风',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      gradient: 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1)',
      colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'],
      textColor: '#ffffff',
      accentColor: '#4ecdc4',
      textShadow: '0 0 40px rgba(255, 107, 107, 0.6), 0 0 80px rgba(78, 205, 196, 0.4)',
      boxShadow: '0 0 25px rgba(78, 205, 196, 0.4)',
      lightEffect: 'radial-gradient(ellipse at center, rgba(255, 107, 107, 0.15) 0%, rgba(78, 205, 196, 0.1) 25%, rgba(69, 183, 209, 0.05) 50%, transparent 70%)',
      particleCount: 60
    };
  }

  getParticleTechTheme() {
    return {
      name: '粒子科技风',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1e1e3a 100%)',
      gradient: 'linear-gradient(45deg, #00ffcc, #ffcc00, #cc00ff)',
      colors: ['#00ffcc', '#ffcc00', '#cc00ff', '#00ccff'],
      textColor: '#ffffff',
      accentColor: '#ffcc00',
      textShadow: '0 0 60px rgba(0, 255, 204, 0.8), 0 0 120px rgba(255, 204, 0, 0.6)',
      boxShadow: '0 0 35px rgba(255, 204, 0, 0.5)',
      lightEffect: 'radial-gradient(ellipse at center, rgba(0, 255, 204, 0.2) 0%, rgba(255, 204, 0, 0.15) 25%, rgba(204, 0, 255, 0.1) 50%, transparent 70%)',
      particleCount: 150
    };
  }

  getGlassMorphismTheme() {
    return {
      name: '玻璃拟态风',
      background: 'linear-gradient(135deg, rgba(10, 10, 15, 0.9) 0%, rgba(26, 26, 46, 0.9) 100%)',
      gradient: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(0, 255, 204, 0.6), rgba(0, 153, 255, 0.4))',
      colors: ['rgba(255, 255, 255, 0.8)', 'rgba(0, 255, 204, 0.6)', 'rgba(0, 153, 255, 0.4)', 'rgba(204, 0, 255, 0.3)'],
      textColor: 'rgba(255, 255, 255, 0.9)',
      accentColor: 'rgba(0, 255, 204, 0.8)',
      textShadow: '0 2px 20px rgba(255, 255, 255, 0.3)',
      boxShadow: '0 8px 32px rgba(0, 255, 204, 0.2)',
      lightEffect: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.1) 0%, rgba(0, 255, 204, 0.08) 25%, rgba(0, 153, 255, 0.05) 50%, transparent 70%)',
      particleCount: 50
    };
  }

  getHolographicTheme() {
    return {
      name: '全息投影风',
      background: 'linear-gradient(135deg, #000000 0%, #003333 100%)',
      gradient: 'linear-gradient(45deg, #00ffcc 0%, #0099ff 50%, #cc00ff 100%)',
      colors: ['#00ffcc', '#0099ff', '#cc00ff', '#ff9900'],
      textColor: '#ffffff',
      accentColor: '#00ffcc',
      textShadow: '0 0 40px rgba(0, 255, 204, 0.9), 0 0 80px rgba(0, 153, 255, 0.7), 0 0 120px rgba(204, 0, 255, 0.5)',
      boxShadow: '0 0 30px rgba(0, 255, 204, 0.6), 0 0 60px rgba(0, 153, 255, 0.4)',
      lightEffect: 'radial-gradient(ellipse at center, rgba(0, 255, 204, 0.25) 0%, rgba(0, 153, 255, 0.2) 25%, rgba(204, 0, 255, 0.15) 50%, transparent 70%)',
      particleCount: 90
    };
  }

  getDataStreamTheme() {
    return {
      name: '数据流风',
      background: 'linear-gradient(135deg, #001122 0%, #003344 100%)',
      gradient: 'linear-gradient(90deg, #00ff00, #00ccff, #ff00ff)',
      colors: ['#00ff00', '#00ccff', '#ff00ff', '#ffff00'],
      textColor: '#ffffff',
      accentColor: '#00ff00',
      textShadow: '0 0 50px rgba(0, 255, 0, 0.7), 0 0 100px rgba(0, 204, 255, 0.5)',
      boxShadow: '0 0 30px rgba(0, 255, 0, 0.5)',
      lightEffect: 'radial-gradient(ellipse at center, rgba(0, 255, 0, 0.2) 0%, rgba(0, 204, 255, 0.15) 25%, rgba(255, 0, 255, 0.1) 50%, transparent 70%)',
      particleCount: 110
    };
  }

  getQuantumTechTheme() {
    return {
      name: '量子科技风',
      background: 'linear-gradient(135deg, #110011 0%, #330033 100%)',
      gradient: 'linear-gradient(45deg, #ff00cc, #00ffcc, #ccff00)',
      colors: ['#ff00cc', '#00ffcc', '#ccff00', '#ff6600'],
      textColor: '#ffffff',
      accentColor: '#ff00cc',
      textShadow: '0 0 60px rgba(255, 0, 204, 0.8), 0 0 120px rgba(0, 255, 204, 0.6), 0 0 180px rgba(204, 255, 0, 0.4)',
      boxShadow: '0 0 40px rgba(255, 0, 204, 0.6), 0 0 80px rgba(0, 255, 204, 0.4)',
      lightEffect: 'radial-gradient(ellipse at center, rgba(255, 0, 204, 0.25) 0%, rgba(0, 255, 204, 0.2) 25%, rgba(204, 255, 0, 0.15) 50%, transparent 70%)',
      particleCount: 130
    };
  }
}

module.exports = VideoComposer;