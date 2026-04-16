/**
 * 公共主题配置模块
 * 消除 main.js 和 main-supervised.js 之间的代码重复
 */

const THEMES = {
  'tech-modern': {
    name: '现代科技风',
    colors: ['#00ffcc', '#0099ff', '#cc00ff'],
    gradient: 'linear-gradient(45deg, #00ffcc, #0099ff, #cc00ff)',
    particleCount: 80,
    background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
    coverStyle: 'digital',
    illustrationStyle: 'blueprint',
    infographicLayout: 'vertical'
  },
  'cyberpunk': {
    name: '赛博朋克风',
    colors: ['#ff00ff', '#00ffff', '#ffff00'],
    gradient: 'linear-gradient(45deg, #ff00ff, #00ffff, #ffff00)',
    particleCount: 100,
    background: 'linear-gradient(135deg, #000000 0%, #330033 100%)',
    coverStyle: 'digital',
    illustrationStyle: 'digital',
    infographicLayout: 'comparison'
  },
  'neon-future': {
    name: '霓虹未来风',
    colors: ['#00ff88', '#ff0088', '#8800ff'],
    gradient: 'linear-gradient(45deg, #00ff88, #ff0088, #8800ff)',
    particleCount: 120,
    background: 'linear-gradient(135deg, #000022 0%, #220044 100%)',
    coverStyle: 'digital',
    illustrationStyle: 'digital',
    infographicLayout: 'timeline'
  },
  'minimal-tech': {
    name: '极简科技风',
    colors: ['#ffffff', '#888888', '#000000'],
    gradient: 'linear-gradient(45deg, #ffffff, #888888, #000000)',
    particleCount: 40,
    background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
    coverStyle: 'flat-vector',
    illustrationStyle: 'minimal',
    infographicLayout: 'hierarchical'
  },
  'gradient-wave': {
    name: '渐变波纹风',
    colors: ['#ff6b6b', '#4ecdc4', '#45b7d1'],
    gradient: 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1)',
    particleCount: 60,
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    coverStyle: 'painterly',
    illustrationStyle: 'watercolor',
    infographicLayout: 'vertical'
  },
  'particle-tech': {
    name: '粒子科技风',
    colors: ['#00ffcc', '#ffcc00', '#cc00ff'],
    gradient: 'linear-gradient(45deg, #00ffcc, #ffcc00, #cc00ff)',
    particleCount: 150,
    background: 'linear-gradient(135deg, #0f0f23 0%, #1e1e3a 100%)',
    coverStyle: 'digital',
    illustrationStyle: 'blueprint',
    infographicLayout: 'vertical'
  },
  'glass-morphism': {
    name: '玻璃拟态风',
    colors: ['rgba(255,255,255,0.8)', 'rgba(0,255,204,0.6)', 'rgba(0,153,255,0.4)'],
    gradient: 'linear-gradient(135deg, rgba(255,255,255,0.8), rgba(0,255,204,0.6), rgba(0,153,255,0.4))',
    particleCount: 50,
    background: 'linear-gradient(135deg, rgba(10, 10, 15, 0.9) 0%, rgba(26, 26, 46, 0.9) 100%)',
    coverStyle: 'flat-vector',
    illustrationStyle: 'elegant',
    infographicLayout: 'vertical'
  },
  'holographic': {
    name: '全息投影风',
    colors: ['#00ffcc', '#0099ff', '#cc00ff'],
    gradient: 'linear-gradient(45deg, #00ffcc 0%, #0099ff 50%, #cc00ff 100%)',
    particleCount: 90,
    background: 'linear-gradient(135deg, #000000 0%, #003333 100%)',
    coverStyle: 'digital',
    illustrationStyle: 'digital',
    infographicLayout: 'timeline'
  },
  'data-stream': {
    name: '数据流风',
    colors: ['#00ff00', '#00ccff', '#ff00ff'],
    gradient: 'linear-gradient(90deg, #00ff00, #00ccff, #ff00ff)',
    particleCount: 110,
    background: 'linear-gradient(135deg, #001122 0%, #003344 100%)',
    coverStyle: 'digital',
    illustrationStyle: 'blueprint',
    infographicLayout: 'vertical'
  },
  'quantum-tech': {
    name: '量子科技风',
    colors: ['#ff00cc', '#00ffcc', '#ccff00'],
    gradient: 'linear-gradient(45deg, #ff00cc, #00ffcc, #ccff00)',
    particleCount: 130,
    background: 'linear-gradient(135deg, #110011 0%, #330033 100%)',
    coverStyle: 'digital',
    illustrationStyle: 'digital',
    infographicLayout: 'hierarchical'
  }
};

const CONFIG = {
  outputDir: './video-output',
  defaultDuration: 30,
  minDuration: 10,
  maxDuration: 120,
  fps: 60,
  width: 1080,
  height: 1920,
  quality: 'high',
  defaultStyle: 'tech-modern'
};

const VALID_STYLES = Object.keys(THEMES);

const VALID_PLATFORMS = ['xhs', 'wechat', 'all'];

module.exports = { THEMES, CONFIG, VALID_STYLES, VALID_PLATFORMS };
