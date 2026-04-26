/**
 * 公共主题配置模块
 * 统一管理所有视觉主题配置和动画参数
 * 与 THEMES.md、THEME_ANIMATIONS.md 文档保持同步
 */

const THEMES = {
  // ============================================
  // 科技类主题
  // ============================================
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
    适用场景: '科技产品、SaaS、AI工具、开发者内容',
    // 动画配置
    animation: {
      spring: { damping: 12, stiffness: 180, mass: 1 },
      fade: { duration: 12 },
      slide: { duration: 20 },
      scale: { from: 0.85, to: 1 },
      glow: { intensity: 0.6, color: '#2563EB' },
      particle: { speed: 0.8, count: 1 },
      special: [],
    },
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
    适用场景: '科技新品发布，游戏、潮流科技',
    animation: {
      spring: { damping: 8, stiffness: 220, mass: 0.8 },
      fade: { duration: 10 },
      slide: { duration: 15 },
      scale: { from: 0.8, to: 1 },
      glow: { intensity: 0.9, color: '#00FFFF' },
      particle: { speed: 1.2, count: 1.3 },
      special: ['glitch', 'neon-flicker'],
    },
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
    适用场景: '创新、前沿、趋势',
    animation: {
      spring: { damping: 10, stiffness: 200, mass: 0.9 },
      fade: { duration: 12 },
      slide: { duration: 18 },
      scale: { from: 0.82, to: 1 },
      glow: { intensity: 0.85, color: '#00FF88' },
      particle: { speed: 1.0, count: 1.2 },
      special: ['pulse', 'neon-glow'],
    },
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
    适用场景: '高端品牌、专业服务、金融科技',
    animation: {
      spring: { damping: 30, stiffness: 80, mass: 1.2 },
      fade: { duration: 18 },
      slide: { duration: 25 },
      scale: { from: 0.92, to: 1 },
      glow: { intensity: 0.1, color: '#F8FAFC' },
      particle: { speed: 0.4, count: 0.5 },
      special: [],
    },
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
    适用场景: '数据、科学、研究',
    animation: {
      spring: { damping: 14, stiffness: 160, mass: 1 },
      fade: { duration: 14 },
      slide: { duration: 22 },
      scale: { from: 0.88, to: 1 },
      glow: { intensity: 0.5, color: '#00FFCC' },
      particle: { speed: 1.0, count: 1.5 },
      special: ['particle-flow', 'data-stream'],
    },
  },

  // ============================================
  // 创意设计类主题
  // ============================================
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
    适用场景: '设计产品、创意内容、视觉艺术',
    animation: {
      spring: { damping: 10, stiffness: 200, mass: 0.85 },
      fade: { duration: 15 },
      slide: { duration: 20 },
      scale: { from: 0.75, to: 1 },
      glow: { intensity: 0.5, color: '#8B5CF6' },
      particle: { speed: 0.9, count: 1 },
      special: ['gradient-shift', 'wave-motion'],
    },
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
    适用场景: '时尚、品牌、高端',
    animation: {
      spring: { damping: 18, stiffness: 140, mass: 1 },
      fade: { duration: 20 },
      slide: { duration: 28 },
      scale: { from: 0.9, to: 1 },
      glow: { intensity: 0.3, color: 'rgba(255,255,255,0.5)' },
      particle: { speed: 0.5, count: 0.7 },
      special: ['glass-blur', 'light-refraction'],
    },
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
    适用场景: 'AR/VR、元宇宙',
    animation: {
      spring: { damping: 10, stiffness: 190, mass: 0.8 },
      fade: { duration: 12 },
      slide: { duration: 18 },
      scale: { from: 0.8, to: 1 },
      glow: { intensity: 0.8, color: '#00FFCC' },
      particle: { speed: 1.1, count: 1.2 },
      special: ['hologram-shift', 'rainbow-glint'],
    },
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
    适用场景: '大数据、金融、分析',
    animation: {
      spring: { damping: 12, stiffness: 170, mass: 0.9 },
      fade: { duration: 10 },
      slide: { duration: 16 },
      scale: { from: 0.85, to: 1 },
      glow: { intensity: 0.7, color: '#00FF00' },
      particle: { speed: 1.3, count: 1.4 },
      special: ['matrix-rain', 'data-pulse'],
    },
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
    适用场景: '量子、物理、前沿',
    animation: {
      spring: { damping: 6, stiffness: 250, mass: 0.7 },
      fade: { duration: 8 },
      slide: { duration: 14 },
      scale: { from: 0.75, to: 1 },
      glow: { intensity: 0.85, color: '#FF00CC' },
      particle: { speed: 1.4, count: 1.5 },
      special: ['quantum-glitch', 'entanglement'],
    },
  },

  // ============================================
  // 生活方式类主题
  // ============================================
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
    适用场景: '生活方式、健身、美食、电商',
    animation: {
      spring: { damping: 10, stiffness: 200, mass: 0.85 },
      fade: { duration: 15 },
      slide: { duration: 22 },
      scale: { from: 0.78, to: 1 },
      glow: { intensity: 0.6, color: '#F97316' },
      particle: { speed: 1.0, count: 1.1 },
      special: ['bounce', 'color-shift'],
    },
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
    适用场景: '设计产品、创意内容、视觉艺术',
    animation: {
      spring: { damping: 20, stiffness: 120, mass: 1 },
      fade: { duration: 20 },
      slide: { duration: 30 },
      scale: { from: 0.88, to: 1 },
      glow: { intensity: 0.4, color: '#06B6D4' },
      particle: { speed: 0.6, count: 0.9 },
      special: ['aurora-flow', 'light-wave'],
    },
  },

  // ============================================
  // 自然类主题
  // ============================================
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
    适用场景: '环保、有机农业、户外、瑜伽',
    animation: {
      spring: { damping: 25, stiffness: 100, mass: 1.1 },
      fade: { duration: 25 },
      slide: { duration: 35 },
      scale: { from: 0.9, to: 1 },
      glow: { intensity: 0.2, color: '#059669' },
      particle: { speed: 0.4, count: 0.8 },
      special: ['leaf-float', 'gentle-breeze'],
    },
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
    适用场景: '海洋科技、潜水、航运、环保',
    animation: {
      spring: { damping: 22, stiffness: 110, mass: 1.1 },
      fade: { duration: 22 },
      slide: { duration: 32 },
      scale: { from: 0.9, to: 1 },
      glow: { intensity: 0.35, color: '#0891B2' },
      particle: { speed: 0.5, count: 0.9 },
      special: ['bubble-rise', 'depth-shadow'],
    },
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
    适用场景: '冬季运动、冰雪、清洁能源、环保',
    animation: {
      spring: { damping: 24, stiffness: 105, mass: 1 },
      fade: { duration: 24 },
      slide: { duration: 34 },
      scale: { from: 0.9, to: 1 },
      glow: { intensity: 0.4, color: '#38BDF8' },
      particle: { speed: 0.45, count: 0.85 },
      special: ['crystal-shine', 'frost-spread'],
    },
  },

  // ============================================
  // 专业类主题
  // ============================================
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
    适用场景: '高端品牌、专业服务、金融科技',
    animation: {
      spring: { damping: 30, stiffness: 80, mass: 1.2 },
      fade: { duration: 18 },
      slide: { duration: 26 },
      scale: { from: 0.92, to: 1 },
      glow: { intensity: 0.1, color: '#F8FAFC' },
      particle: { speed: 0.3, count: 0.4 },
      special: [],
    },
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
    适用场景: '夜生活、音乐、时尚',
    animation: {
      spring: { damping: 9, stiffness: 210, mass: 0.85 },
      fade: { duration: 11 },
      slide: { duration: 17 },
      scale: { from: 0.82, to: 1 },
      glow: { intensity: 0.85, color: '#F43F5E' },
      particle: { speed: 1.1, count: 1.25 },
      special: ['neon-pulse', 'city-glow'],
    },
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
    适用场景: '金融、投资、区块链、加密货币',
    animation: {
      spring: { damping: 26, stiffness: 95, mass: 1.1 },
      fade: { duration: 20 },
      slide: { duration: 28 },
      scale: { from: 0.91, to: 1 },
      glow: { intensity: 0.25, color: '#059669' },
      particle: { speed: 0.5, count: 0.7 },
      special: ['growth-line', 'stable-pulse'],
    },
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
    适用场景: '医疗健康、制药、生物科技',
    animation: {
      spring: { damping: 28, stiffness: 90, mass: 1.2 },
      fade: { duration: 22 },
      slide: { duration: 30 },
      scale: { from: 0.92, to: 1 },
      glow: { intensity: 0.2, color: '#0EA5E9' },
      particle: { speed: 0.35, count: 0.6 },
      special: ['soft-glow', 'calm-pulse'],
    },
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
    适用场景: '复古品牌、手工艺、咖啡馆、艺术',
    animation: {
      spring: { damping: 22, stiffness: 115, mass: 1.1 },
      fade: { duration: 20 },
      slide: { duration: 30 },
      scale: { from: 0.88, to: 1 },
      glow: { intensity: 0.3, color: '#DC2626' },
      particle: { speed: 0.5, count: 0.75 },
      special: ['warm-shimmer', 'leaf-drift'],
    },
  },

  // ============================================
  // 新增主题（2026-04-21）
  // ============================================

  // Phase 1: 高优先级
  'game-elite': {
    name: '电竞游戏风',
    id: 'game-elite',
    primaryColor: '#8B5CF6',
    secondaryColor: '#06B6D4',
    accentColor: '#FACC15',
    backgroundColor: '#0F0A1F',
    textColor: '#FFFFFF',
    colors: ['#8B5CF6', '#06B6D4', '#FACC15'],
    gradient: 'linear-gradient(135deg, #8B5CF6, #06B6D4, #FACC15)',
    particleCount: 120,
    fontFamily: 'Orbitron, sans-serif',
    适用场景: '游戏推荐、电竞比赛、游戏攻略',
    animation: {
      spring: { damping: 8, stiffness: 220, mass: 0.8 },
      fade: { duration: 10 },
      slide: { duration: 15 },
      scale: { from: 0.8, to: 1 },
      glow: { intensity: 0.85, color: '#8B5CF6' },
      particle: { speed: 1.3, count: 1.4 },
      special: ['glitch', 'energy-pulse'],
    },
  },
  'education-blue': {
    name: '学术教育风',
    id: 'education-blue',
    primaryColor: '#3B82F6',
    secondaryColor: '#1D4ED8',
    accentColor: '#60A5FA',
    backgroundColor: '#F8FAFC',
    textColor: '#1E293B',
    colors: ['#3B82F6', '#1D4ED8', '#60A5FA'],
    gradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
    particleCount: 40,
    fontFamily: 'Inter, sans-serif',
    适用场景: '在线课程、教育内容、知识科普',
    animation: {
      spring: { damping: 25, stiffness: 90, mass: 1.1 },
      fade: { duration: 20 },
      slide: { duration: 30 },
      scale: { from: 0.92, to: 1 },
      glow: { intensity: 0.2, color: '#3B82F6' },
      particle: { speed: 0.4, count: 0.6 },
      special: [],
    },
  },
  'food-warm': {
    name: '美食温暖风',
    id: 'food-warm',
    primaryColor: '#F97316',
    secondaryColor: '#DC2626',
    accentColor: '#FBBF24',
    backgroundColor: '#1C1917',
    textColor: '#FFFBEB',
    colors: ['#F97316', '#DC2626', '#FBBF24'],
    gradient: 'linear-gradient(135deg, #F97316, #DC2626)',
    particleCount: 50,
    fontFamily: 'Poppins, sans-serif',
    适用场景: '美食探店、食谱分享、餐饮推荐',
    animation: {
      spring: { damping: 15, stiffness: 150, mass: 1 },
      fade: { duration: 16 },
      slide: { duration: 24 },
      scale: { from: 0.88, to: 1 },
      glow: { intensity: 0.45, color: '#F97316' },
      particle: { speed: 0.6, count: 0.8 },
      special: ['steam-rise'],
    },
  },
  'travel-adventure': {
    name: '旅行冒险风',
    id: 'travel-adventure',
    primaryColor: '#059669',
    secondaryColor: '#0D9488',
    accentColor: '#FBBF24',
    backgroundColor: '#064E3B',
    textColor: '#F0FDF4',
    colors: ['#059669', '#0D9488', '#FBBF24'],
    gradient: 'linear-gradient(135deg, #059669, #0D9488)',
    particleCount: 70,
    fontFamily: 'Poppins, sans-serif',
    适用场景: '旅行攻略、冒险故事、地理探索',
    animation: {
      spring: { damping: 14, stiffness: 160, mass: 1 },
      fade: { duration: 15 },
      slide: { duration: 22 },
      scale: { from: 0.85, to: 1 },
      glow: { intensity: 0.4, color: '#059669' },
      particle: { speed: 0.8, count: 1 },
      special: ['compass-spin'],
    },
  },
  'music-beat': {
    name: '音乐节拍风',
    id: 'music-beat',
    primaryColor: '#EC4899',
    secondaryColor: '#8B5CF6',
    accentColor: '#F97316',
    backgroundColor: '#1F0A1F',
    textColor: '#FFFFFF',
    colors: ['#EC4899', '#8B5CF6', '#F97316'],
    gradient: 'linear-gradient(135deg, #EC4899, #8B5CF6, #F97316)',
    particleCount: 100,
    fontFamily: 'Orbitron, sans-serif',
    适用场景: '音乐推荐、演唱会、音频内容',
    animation: {
      spring: { damping: 10, stiffness: 200, mass: 0.85 },
      fade: { duration: 12 },
      slide: { duration: 18 },
      scale: { from: 0.82, to: 1 },
      glow: { intensity: 0.75, color: '#EC4899' },
      particle: { speed: 1.2, count: 1.3 },
      special: ['beat-pulse', 'equalizer'],
    },
  },

  // Phase 2: 中优先级
  'news-official': {
    name: '新闻权威风',
    id: 'news-official',
    primaryColor: '#1E40AF',
    secondaryColor: '#DC2626',
    accentColor: '#F8FAFC',
    backgroundColor: '#F1F5F9',
    textColor: '#0F172A',
    colors: ['#1E40AF', '#DC2626', '#F8FAFC'],
    gradient: 'linear-gradient(135deg, #1E40AF, #1E3A8A)',
    particleCount: 30,
    fontFamily: 'Inter, sans-serif',
    适用场景: '新闻解读、时事评论',
    animation: {
      spring: { damping: 28, stiffness: 85, mass: 1.2 },
      fade: { duration: 18 },
      slide: { duration: 25 },
      scale: { from: 0.92, to: 1 },
      glow: { intensity: 0.15, color: '#1E40AF' },
      particle: { speed: 0.3, count: 0.4 },
      special: [],
    },
  },
  'pet-cute': {
    name: '萌宠可爱风',
    id: 'pet-cute',
    primaryColor: '#F472B6',
    secondaryColor: '#A78BFA',
    accentColor: '#FCD34D',
    backgroundColor: '#FDF2F8',
    textColor: '#831843',
    colors: ['#F472B6', '#A78BFA', '#FCD34D'],
    gradient: 'linear-gradient(135deg, #F472B6, #A78BFA)',
    particleCount: 60,
    fontFamily: 'Poppins, sans-serif',
    适用场景: '宠物内容、萌宠视频',
    animation: {
      spring: { damping: 12, stiffness: 180, mass: 0.9 },
      fade: { duration: 14 },
      slide: { duration: 20 },
      scale: { from: 0.85, to: 1 },
      glow: { intensity: 0.5, color: '#F472B6' },
      particle: { speed: 0.7, count: 0.9 },
      special: ['bounce', 'heart-float'],
    },
  },
  'auto-tech': {
    name: '汽车科技风',
    id: 'auto-tech',
    primaryColor: '#1F2937',
    secondaryColor: '#3B82F6',
    accentColor: '#F97316',
    backgroundColor: '#030712',
    textColor: '#F9FAFB',
    colors: ['#1F2937', '#3B82F6', '#F97316'],
    gradient: 'linear-gradient(135deg, #1F2937, #3B82F6)',
    particleCount: 60,
    fontFamily: 'Inter, sans-serif',
    适用场景: '汽车科技、新能源车',
    animation: {
      spring: { damping: 16, stiffness: 150, mass: 1 },
      fade: { duration: 14 },
      slide: { duration: 20 },
      scale: { from: 0.88, to: 1 },
      glow: { intensity: 0.5, color: '#3B82F6' },
      particle: { speed: 0.8, count: 1 },
      special: ['speed-line'],
    },
  },
  'startup-energy': {
    name: '创业活力风',
    id: 'startup-energy',
    primaryColor: '#10B981',
    secondaryColor: '#059669',
    accentColor: '#FBBF24',
    backgroundColor: '#022C22',
    textColor: '#ECFDF5',
    colors: ['#10B981', '#059669', '#FBBF24'],
    gradient: 'linear-gradient(135deg, #10B981, #059669)',
    particleCount: 80,
    fontFamily: 'Inter, sans-serif',
    适用场景: '创业故事、投资机会',
    animation: {
      spring: { damping: 12, stiffness: 180, mass: 0.9 },
      fade: { duration: 14 },
      slide: { duration: 20 },
      scale: { from: 0.85, to: 1 },
      glow: { intensity: 0.55, color: '#10B981' },
      particle: { speed: 0.9, count: 1.1 },
      special: ['rocket-launch'],
    },
  },
  'luxury-elegant': {
    name: '奢华优雅风',
    id: 'luxury-elegant',
    primaryColor: '#B8860B',
    secondaryColor: '#D4AF37',
    accentColor: '#FFFFFF',
    backgroundColor: '#1C1917',
    textColor: '#FEFCE8',
    colors: ['#B8860B', '#D4AF37', '#FFFFFF'],
    gradient: 'linear-gradient(135deg, #B8860B, #D4AF37)',
    particleCount: 35,
    fontFamily: 'Playfair Display, serif',
    适用场景: '奢侈品、高端品牌',
    animation: {
      spring: { damping: 28, stiffness: 85, mass: 1.2 },
      fade: { duration: 22 },
      slide: { duration: 32 },
      scale: { from: 0.92, to: 1 },
      glow: { intensity: 0.3, color: '#D4AF37' },
      particle: { speed: 0.3, count: 0.5 },
      special: ['shimmer'],
    },
  },
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
  defaultStyle: 'cyberpunk',
  platformSpecs: {
    xiaohongshu: { width: 1080, height: 1920, fps: 60, bitrate: '10-15Mbps' },
    wechat: { width: 1080, height: 1920, fps: 30, bitrate: '8-12Mbps' },
    douyin: { width: 1080, height: 1920, fps: 60, bitrate: '10-15Mbps' },
    youtube_shorts: { width: 1080, height: 1920, fps: 30, bitrate: '8-12Mbps' },
  },
};

const VALID_STYLES = Object.keys(THEMES);
const VALID_PLATFORMS = ['xiaohongshu', 'wechat', 'douyin', 'youtube_shorts', 'all'];

/**
 * 获取主题配置
 * @param {string} styleId - 主题ID
 * @returns {object} 主题配置对象
 */
function getTheme(styleId) {
  return THEMES[styleId] || THEMES['tech-modern'];
}

/**
 * 获取主题动画配置
 * @param {string} styleId - 主题ID
 * @returns {object} 动画配置对象
 */
function getThemeAnimation(styleId) {
  const theme = getTheme(styleId);
  return theme.animation || THEMES['tech-modern'].animation;
}

/**
 * 获取主题光晕配置
 * @param {string} styleId - 主题ID
 * @returns {object} 光晕配置 { intensity, color }
 */
function getGlowConfig(styleId) {
  const anim = getThemeAnimation(styleId);
  return anim.glow;
}

/**
 * 检查主题是否有指定特殊效果
 * @param {string} styleId - 主题ID
 * @param {string} effect - 效果名称
 * @returns {boolean} 是否有该效果
 */
function hasSpecialEffect(styleId, effect) {
  const anim = getThemeAnimation(styleId);
  return anim.special.includes(effect);
}

/**
 * 获取粒子速度
 * @param {string} styleId - 主题ID
 * @returns {number} 粒子速度
 */
function getParticleSpeed(styleId) {
  const anim = getThemeAnimation(styleId);
  return anim.particle.speed;
}

/**
 * 获取平台规格
 * @param {string} platform - 平台ID
 * @returns {object} 平台规格
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
  getThemeAnimation,
  getGlowConfig,
  hasSpecialEffect,
  getParticleSpeed,
  getPlatformSpec,
};
