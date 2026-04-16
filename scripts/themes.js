/**
 * 公共主题配置模块
 * 统一管理所有视觉主题配置
 * 与 THEMES.md 文档保持同步
 */

const THEMES = {
  // 科技类主题
  'tech-modern': {
    name: '科技现代风',
    id: 'tech-modern',
    primaryColor: '#2563EB',
    secondaryColor: '#7C3AED',
    accentColor: '#10B981',
    backgroundColor: '#0F172A',
    textColor: '#F8FAFC',
    colors: ['#2563EB', '#7C3AED', '#10B981'],
    gradient: 'linear-gradient(135deg, #2563EB, #7C3AED, #10B981)',
    particleCount: 80,
    fontFamily: 'Inter, sans-serif',
   适用场景: '科技产品、SaaS、AI工具、开发者内容'
  },
  'cyberpunk': {
    name: '赛博朋克风',
    id: 'cyberpunk',
    primaryColor: '#00FFFF',
    secondaryColor: '#FF00FF',
    accentColor: '#FFFF00',
    backgroundColor: '#0D0221',
    textColor: '#F8FAFC',
    colors: ['#00FFFF', '#FF00FF', '#FFFF00'],
    gradient: 'linear-gradient(135deg, #00FFFF, #FF00FF, #FFFF00)',
    particleCount: 100,
    fontFamily: 'JetBrains Mono, monospace',
    适用场景: '科技新品发布，游戏、潮流科技'
  },
  'neon-future': {
    name: '霓虹未来风',
    id: 'neon-future',
    primaryColor: '#00FF88',
    secondaryColor: '#FF0088',
    accentColor: '#8800FF',
    backgroundColor: '#000022',
    textColor: '#F8FAFC',
    colors: ['#00FF88', '#FF0088', '#8800FF'],
    gradient: 'linear-gradient(135deg, #00FF88, #FF0088, #8800FF)',
    particleCount: 120,
    fontFamily: 'Orbitron, sans-serif',
    适用场景: '创新、前沿、趋势'
  },
  'minimal-tech': {
    name: '极简科技风',
    id: 'minimal-tech',
    primaryColor: '#1E293B',
    secondaryColor: '#475569',
    accentColor: '#F8FAFC',
    backgroundColor: '#020617',
    textColor: '#F8FAFC',
    colors: ['#1E293B', '#475569', '#F8FAFC'],
    gradient: 'linear-gradient(135deg, #1E293B, #475569, #F8FAFC)',
    particleCount: 40,
    fontFamily: 'Inter, sans-serif',
    适用场景: '高端品牌、专业服务、金融科技'
  },
  'particle-tech': {
    name: '粒子科技风',
    id: 'particle-tech',
    primaryColor: '#00FFCC',
    secondaryColor: '#FFCC00',
    accentColor: '#CC00FF',
    backgroundColor: '#0F0F23',
    textColor: '#F8FAFC',
    colors: ['#00FFCC', '#FFCC00', '#CC00FF'],
    gradient: 'linear-gradient(135deg, #00FFCC, #FFCC00, #CC00FF)',
    particleCount: 150,
    fontFamily: 'Inter, sans-serif',
    适用场景: '数据、科学、研究'
  },

  // 创意设计类主题
  'gradient-wave': {
    name: '渐变波纹风',
    id: 'gradient-wave',
    primaryColor: '#06B6D4',
    secondaryColor: '#8B5CF6',
    accentColor: '#EC4899',
    backgroundColor: '#020617',
    textColor: '#F8FAFC',
    colors: ['#06B6D4', '#8B5CF6', '#EC4899'],
    gradient: 'linear-gradient(135deg, #06B6D4, #8B5CF6, #EC4899)',
    particleCount: 60,
    fontFamily: 'Poppins, sans-serif',
    适用场景: '设计产品、创意内容、视觉艺术'
  },
  'glass-morphism': {
    name: '玻璃拟态风',
    id: 'glass-morphism',
    primaryColor: 'rgba(255,255,255,0.8)',
    secondaryColor: 'rgba(0,255,204,0.6)',
    accentColor: 'rgba(0,153,255,0.4)',
    backgroundColor: 'rgba(10,10,15,0.9)',
    textColor: '#F8FAFC',
    colors: ['rgba(255,255,255,0.8)', 'rgba(0,255,204,0.6)', 'rgba(0,153,255,0.4)'],
    gradient: 'linear-gradient(135deg, rgba(255,255,255,0.8), rgba(0,255,204,0.6), rgba(0,153,255,0.4))',
    particleCount: 50,
    fontFamily: 'Poppins, sans-serif',
    适用场景: '时尚、品牌、高端'
  },
  'holographic': {
    name: '全息投影风',
    id: 'holographic',
    primaryColor: '#00FFCC',
    secondaryColor: '#0099FF',
    accentColor: '#CC00FF',
    backgroundColor: '#000000',
    textColor: '#F8FAFC',
    colors: ['#00FFCC', '#0099FF', '#CC00FF'],
    gradient: 'linear-gradient(135deg, #00FFCC 0%, #0099FF 50%, #CC00FF 100%)',
    particleCount: 90,
    fontFamily: 'Orbitron, sans-serif',
    适用场景: 'AR/VR、元宇宙'
  },
  'data-stream': {
    name: '数据流风',
    id: 'data-stream',
    primaryColor: '#00FF00',
    secondaryColor: '#00CCFF',
    accentColor: '#FF00FF',
    backgroundColor: '#001122',
    textColor: '#F8FAFC',
    colors: ['#00FF00', '#00CCFF', '#FF00FF'],
    gradient: 'linear-gradient(90deg, #00FF00, #00CCFF, #FF00FF)',
    particleCount: 110,
    fontFamily: 'JetBrains Mono, monospace',
    适用场景: '大数据、金融、分析'
  },
  'quantum-tech': {
    name: '量子科技风',
    id: 'quantum-tech',
    primaryColor: '#FF00CC',
    secondaryColor: '#00FFCC',
    accentColor: '#CCFF00',
    backgroundColor: '#110011',
    textColor: '#F8FAFC',
    colors: ['#FF00CC', '#00FFCC', '#CCFF00'],
    gradient: 'linear-gradient(135deg, #FF00CC, #00FFCC, #CCFF00)',
    particleCount: 130,
    fontFamily: 'Orbitron, sans-serif',
    适用场景: '量子、物理、前沿'
  },

  // 生活方式类主题
  'vibrant-gradient': {
    name: '活力渐变风',
    id: 'vibrant-gradient',
    primaryColor: '#F97316',
    secondaryColor: '#EAB308',
    accentColor: '#22C55E',
    backgroundColor: '#1C1917',
    textColor: '#F8FAFC',
    colors: ['#F97316', '#EAB308', '#22C55E'],
    gradient: 'linear-gradient(135deg, #F97316, #EAB308, #22C55E)',
    particleCount: 70,
    fontFamily: 'Poppins, sans-serif',
    适用场景: '生活方式、健身、美食、电商'
  },
  'aurora-gradient': {
    name: '极光渐变风',
    id: 'aurora-gradient',
    primaryColor: '#06B6D4',
    secondaryColor: '#8B5CF6',
    accentColor: '#EC4899',
    backgroundColor: '#020617',
    textColor: '#F8FAFC',
    colors: ['#06B6D4', '#8B5CF6', '#EC4899'],
    gradient: 'linear-gradient(135deg, #06B6D4, #8B5CF6, #EC4899)',
    particleCount: 85,
    fontFamily: 'Poppins, sans-serif',
    适用场景: '设计产品、创意内容、视觉艺术'
  },

  // 自然类主题
  'forest-nature': {
    name: '森林自然风',
    id: 'forest-nature',
    primaryColor: '#059669',
    secondaryColor: '#10B981',
    accentColor: '#F59E0B',
    backgroundColor: '#064E3B',
    textColor: '#F8FAFC',
    colors: ['#059669', '#10B981', '#F59E0B'],
    gradient: 'linear-gradient(135deg, #059669, #10B981, #F59E0B)',
    particleCount: 60,
    fontFamily: 'Inter, sans-serif',
    适用场景: '环保、有机农业、户外、瑜伽'
  },
  'deep-ocean': {
    name: '深海科技风',
    id: 'deep-ocean',
    primaryColor: '#0891B2',
    secondaryColor: '#4F46E5',
    accentColor: '#06B6D4',
    backgroundColor: '#030712',
    textColor: '#F8FAFC',
    colors: ['#0891B2', '#4F46E5', '#06B6D4'],
    gradient: 'linear-gradient(135deg, #0891B2, #4F46E5, #06B6D4)',
    particleCount: 90,
    fontFamily: 'Inter, sans-serif',
    适用场景: '海洋科技、潜水、航运、环保'
  },
  'arctic-ice': {
    name: '极地冰晶风',
    id: 'arctic-ice',
    primaryColor: '#38BDF8',
    secondaryColor: '#818CF8',
    accentColor: '#34D399',
    backgroundColor: '#0C1222',
    textColor: '#F8FAFC',
    colors: ['#38BDF8', '#818CF8', '#34D399'],
    gradient: 'linear-gradient(135deg, #38BDF8, #818CF8, #34D399)',
    particleCount: 80,
    fontFamily: 'Inter, sans-serif',
    适用场景: '冬季运动、冰雪、清洁能源、环保'
  },

  // 专业类主题
  'dark-minimal': {
    name: '暗夜极简风',
    id: 'dark-minimal',
    primaryColor: '#1E293B',
    secondaryColor: '#475569',
    accentColor: '#F8FAFC',
    backgroundColor: '#020617',
    textColor: '#F8FAFC',
    colors: ['#1E293B', '#475569', '#F8FAFC'],
    gradient: 'linear-gradient(135deg, #1E293B, #475569, #F8FAFC)',
    particleCount: 30,
    fontFamily: 'Inter, sans-serif',
    适用场景: '高端品牌、专业服务、金融科技'
  },
  'neon-city': {
    name: '霓虹都市风',
    id: 'neon-city',
    primaryColor: '#F43F5E',
    secondaryColor: '#8B5CF6',
    accentColor: '#FBBF24',
    backgroundColor: '#18181B',
    textColor: '#F8FAFC',
    colors: ['#F43F5E', '#8B5CF6', '#FBBF24'],
    gradient: 'linear-gradient(135deg, #F43F5E, #8B5CF6, #FBBF24)',
    particleCount: 100,
    fontFamily: 'JetBrains Mono, monospace',
    适用场景: '夜生活、音乐、时尚'
  },
  'fintech': {
    name: '金融科技风',
    id: 'fintech',
    primaryColor: '#059669',
    secondaryColor: '#10B981',
    accentColor: '#FBBF24',
    backgroundColor: '#052E16',
    textColor: '#F8FAFC',
    colors: ['#059669', '#10B981', '#FBBF24'],
    gradient: 'linear-gradient(135deg, #059669, #10B981, #FBBF24)',
    particleCount: 70,
    fontFamily: 'Inter, sans-serif',
    适用场景: '金融、投资、区块链、加密货币'
  },
  'pure-medical': {
    name: '纯净医疗风',
    id: 'pure-medical',
    primaryColor: '#0EA5E9',
    secondaryColor: '#14B8A6',
    accentColor: '#FFFFFF',
    backgroundColor: '#F0F9FF',
    textColor: '#0F172A',
    colors: ['#0EA5E9', '#14B8A6', '#FFFFFF'],
    gradient: 'linear-gradient(135deg, #0EA5E9, #14B8A6, #FFFFFF)',
    particleCount: 50,
    fontFamily: 'Inter, sans-serif',
    适用场景: '医疗健康、制药、生物科技'
  },
  'autumn-vintage': {
    name: '暖秋复古风',
    id: 'autumn-vintage',
    primaryColor: '#DC2626',
    secondaryColor: '#F59E0B',
    accentColor: '#2563EB',
    backgroundColor: '#1C1917',
    textColor: '#F8FAFC',
    colors: ['#DC2626', '#F59E0B', '#2563EB'],
    gradient: 'linear-gradient(135deg, #DC2626, #F59E0B, #2563EB)',
    particleCount: 55,
    fontFamily: 'Playfair Display, serif',
    适用场景: '复古品牌、手工艺、咖啡馆、艺术'
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
  defaultStyle: 'tech-modern',
  platformSpecs: {
    xiaohongshu: { width: 1080, height: 1920, fps: 60, bitrate: '10-15Mbps' },
    wechat: { width: 1080, height: 1920, fps: 30, bitrate: '8-12Mbps' },
    douyin: { width: 1080, height: 1920, fps: 60, bitrate: '10-15Mbps' },
    youtube_shorts: { width: 1080, height: 1920, fps: 30, bitrate: '8-12Mbps' }
  }
};

const VALID_STYLES = Object.keys(THEMES);
const VALID_PLATFORMS = ['xiaohongshu', 'wechat', 'douyin', 'youtube_shorts', 'all'];

/**
 * 获取主题配置
 */
function getTheme(styleId) {
  return THEMES[styleId] || THEMES['tech-modern'];
}

/**
 * 获取平台规格
 */
function getPlatformSpec(platform) {
  return CONFIG.platformSpecs[platform] || CONFIG.platformSpecs.xiaohongshu;
}

module.exports = {
  THEMES,
  CONFIG,
  VALID_STYLES,
  VALID_PLATFORMS,
  getTheme,
  getPlatformSpec
};
