/**
 * 公共主题配置模块
 * 统一管理所有视觉主题配置和动画参数
 * ⚠️ 颜色数据来源：scripts/theme-colors.js（单一数据源）
 *    themes.js 只定义动画配置（spring/fade/slide/scale/particle/special）
 *    颜色字段（primaryColor / backgroundColor / gradient 等）全部从 theme-colors.js 读取
 */

const { THEME_COLORS, VALID_THEME_IDS, getThemeColors, getThemeAnimationConfig } = require('./theme-colors');

const THEMES = {}; // 必须先声明

// ─── 为每个主题注入颜色数据（颜色来源：theme-colors.js）──────────────────────
const colorEntries = Object.keys(THEME_COLORS).filter(k => !THEME_COLORS[k].aliasOf);

colorEntries.forEach(id => {
  const tc = getThemeColors(id);
  // 从 theme-colors 克隆必要颜色字段（供 Remotion 组件直接引用）
  THEMES[id] = {
    name: tc.name,
    id,
    primaryColor:    tc.primaryColor,
    secondaryColor:  tc.secondaryColor,
    accentColor:     tc.accentColor,
    backgroundColor: tc.backgroundColor,
    textColor:       tc.textColor,
    colors:          tc.colors,
    gradient:        tc.gradient,
    particleCount:   tc.particleCount,
    fontFamily:      tc.fontFamily,
    适用场景:        tc.适用场景 || '',
  };
});

// ─── 动画配置（每个主题独立定义）────────────────────────────────────────────
// 科技类
THEMES['tech-modern'].animation    = { spring:{damping:12,stiffness:180,mass:1}, fade:{duration:12}, slide:{duration:20}, scale:{from:0.85,to:1}, glow:{intensity:0.6,color:'#2563EB'}, particle:{speed:0.8,count:1}, special:[] };
THEMES['cyberpunk'].animation      = { spring:{damping:8,stiffness:220,mass:0.8}, fade:{duration:10}, slide:{duration:15}, scale:{from:0.8,to:1}, glow:{intensity:0.9,color:'#00FFFF'}, particle:{speed:1.2,count:1.3}, special:['glitch','neon-flicker'] };
THEMES['neon-future'].animation    = { spring:{damping:10,stiffness:200,mass:0.9}, fade:{duration:12}, slide:{duration:18}, scale:{from:0.82,to:1}, glow:{intensity:0.85,color:'#00FF88'}, particle:{speed:1.0,count:1.2}, special:['pulse','neon-glow'] };
THEMES['minimal-tech'].animation   = { spring:{damping:30,stiffness:80,mass:1.2}, fade:{duration:18}, slide:{duration:25}, scale:{from:0.92,to:1}, glow:{intensity:0.1,color:'#F8FAFC'}, particle:{speed:0.4,count:0.5}, special:[] };
THEMES['particle-tech'].animation  = { spring:{damping:14,stiffness:160,mass:1}, fade:{duration:14}, slide:{duration:22}, scale:{from:0.88,to:1}, glow:{intensity:0.5,color:'#00FFCC'}, particle:{speed:1.0,count:1.5}, special:['particle-flow','data-stream'] };
THEMES['gradient-wave'].animation  = { spring:{damping:10,stiffness:200,mass:0.85}, fade:{duration:15}, slide:{duration:20}, scale:{from:0.75,to:1}, glow:{intensity:0.5,color:'#8B5CF6'}, particle:{speed:0.9,count:1}, special:['gradient-shift','wave-motion'] };
THEMES['glass-morphism'].animation = { spring:{damping:18,stiffness:140,mass:1}, fade:{duration:20}, slide:{duration:28}, scale:{from:0.9,to:1}, glow:{intensity:0.3,color:'rgba(255,255,255,0.5)'}, particle:{speed:0.5,count:0.7}, special:['glass-blur','light-refraction'] };
THEMES['holographic'].animation   = { spring:{damping:10,stiffness:190,mass:0.8}, fade:{duration:12}, slide:{duration:18}, scale:{from:0.8,to:1}, glow:{intensity:0.8,color:'#00FFCC'}, particle:{speed:1.1,count:1.2}, special:['hologram-shift','rainbow-glint'] };
THEMES['data-stream'].animation   = { spring:{damping:12,stiffness:170,mass:0.9}, fade:{duration:10}, slide:{duration:16}, scale:{from:0.85,to:1}, glow:{intensity:0.7,color:'#00FF00'}, particle:{speed:1.3,count:1.4}, special:['matrix-rain','data-pulse'] };
THEMES['quantum-tech'].animation  = { spring:{damping:6,stiffness:250,mass:0.7}, fade:{duration:8}, slide:{duration:14}, scale:{from:0.75,to:1}, glow:{intensity:0.85,color:'#FF00CC'}, particle:{speed:1.4,count:1.5}, special:['quantum-glitch','entanglement'] };

// 生活方式类
THEMES['vibrant-gradient'].animation = { spring:{damping:10,stiffness:200,mass:0.85}, fade:{duration:15}, slide:{duration:22}, scale:{from:0.78,to:1}, glow:{intensity:0.6,color:'#F97316'}, particle:{speed:1.0,count:1.1}, special:['bounce','color-shift'] };
THEMES['aurora-gradient'].animation  = { spring:{damping:20,stiffness:120,mass:1}, fade:{duration:20}, slide:{duration:30}, scale:{from:0.88,to:1}, glow:{intensity:0.4,color:'#06B6D4'}, particle:{speed:0.6,count:0.9}, special:['aurora-flow','light-wave'] };
THEMES['food-warm'].animation        = { spring:{damping:15,stiffness:150,mass:1}, fade:{duration:16}, slide:{duration:24}, scale:{from:0.88,to:1}, glow:{intensity:0.45,color:'#F97316'}, particle:{speed:0.6,count:0.8}, special:['steam-rise'] };
THEMES['travel-adventure'].animation = { spring:{damping:14,stiffness:160,mass:1}, fade:{duration:15}, slide:{duration:22}, scale:{from:0.85,to:1}, glow:{intensity:0.4,color:'#059669'}, particle:{speed:0.8,count:1}, special:['compass-spin'] };
THEMES['music-beat'].animation       = { spring:{damping:10,stiffness:200,mass:0.85}, fade:{duration:12}, slide:{duration:18}, scale:{from:0.82,to:1}, glow:{intensity:0.75,color:'#EC4899'}, particle:{speed:1.2,count:1.3}, special:['beat-pulse','equalizer'] };
THEMES['pet-cute'].animation         = { spring:{damping:12,stiffness:180,mass:0.9}, fade:{duration:14}, slide:{duration:20}, scale:{from:0.85,to:1}, glow:{intensity:0.5,color:'#F472B6'}, particle:{speed:0.7,count:0.9}, special:['bounce','heart-float'] };
THEMES['social-media'].animation     = { spring:{damping:10,stiffness:200,mass:0.85}, fade:{duration:12}, slide:{duration:18}, scale:{from:0.82,to:1}, glow:{intensity:0.7,color:'#EC4899'}, particle:{speed:1.1,count:1.2}, special:['share-burst','like-float'] };
THEMES['beauty-makeup'].animation     = { spring:{damping:14,stiffness:160,mass:0.95}, fade:{duration:14}, slide:{duration:20}, scale:{from:0.86,to:1}, glow:{intensity:0.6,color:'#F472B6'}, particle:{speed:0.7,count:0.9}, special:['sparkle','glow'] };
THEMES['parenting-baby'].animation    = { spring:{damping:12,stiffness:180,mass:0.9}, fade:{duration:15}, slide:{duration:22}, scale:{from:0.85,to:1}, glow:{intensity:0.55,color:'#FCD34D'}, particle:{speed:0.7,count:0.9}, special:['star-burst','heart-float'] };
THEMES['fitness-gym'].animation      = { spring:{damping:8,stiffness:220,mass:0.8}, fade:{duration:10}, slide:{duration:15}, scale:{from:0.8,to:1}, glow:{intensity:0.7,color:'#EF4444'}, particle:{speed:1.3,count:1.4}, special:['energy-burst','power-pulse'] };
THEMES['coffee-break'].animation      = { spring:{damping:22,stiffness:100,mass:1.1}, fade:{duration:20}, slide:{duration:30}, scale:{from:0.9,to:1}, glow:{intensity:0.3,color:'#D97706'}, particle:{speed:0.4,count:0.6}, special:['steam-rise','warm-shimmer'] };
THEMES['book-literature'].animation  = { spring:{damping:24,stiffness:90,mass:1.2}, fade:{duration:22}, slide:{duration:32}, scale:{from:0.92,to:1}, glow:{intensity:0.25,color:'#92400E'}, particle:{speed:0.3,count:0.5}, special:['page-turn','ink-spread'] };
THEMES['anime-manga'].animation      = { spring:{damping:9,stiffness:210,mass:0.85}, fade:{duration:11}, slide:{duration:16}, scale:{from:0.8,to:1}, glow:{intensity:0.7,color:'#FF6B6B'}, particle:{speed:1.2,count:1.3}, special:['manga-flash','chibi-bounce'] };
THEMES['celebrity-star'].animation   = { spring:{damping:8,stiffness:200,mass:0.85}, fade:{duration:10}, slide:{duration:15}, scale:{from:0.8,to:1}, glow:{intensity:0.75,color:'#F97316'}, particle:{speed:1.3,count:1.4}, special:['spotlight','star-sparkle'] };

// 自然类
THEMES['forest-nature'].animation  = { spring:{damping:25,stiffness:100,mass:1.1}, fade:{duration:25}, slide:{duration:35}, scale:{from:0.9,to:1}, glow:{intensity:0.2,color:'#059669'}, particle:{speed:0.4,count:0.8}, special:['leaf-float','gentle-breeze'] };
THEMES['deep-ocean'].animation      = { spring:{damping:22,stiffness:110,mass:1.1}, fade:{duration:22}, slide:{duration:32}, scale:{from:0.9,to:1}, glow:{intensity:0.35,color:'#0891B2'}, particle:{speed:0.5,count:0.9}, special:['bubble-rise','depth-shadow'] };
THEMES['arctic-ice'].animation      = { spring:{damping:24,stiffness:105,mass:1}, fade:{duration:24}, slide:{duration:34}, scale:{from:0.9,to:1}, glow:{intensity:0.4,color:'#38BDF8'}, particle:{speed:0.45,count:0.85}, special:['crystal-shine','frost-spread'] };

// 专业类
THEMES['dark-minimal'].animation    = { spring:{damping:30,stiffness:80,mass:1.2}, fade:{duration:18}, slide:{duration:26}, scale:{from:0.92,to:1}, glow:{intensity:0.1,color:'#F8FAFC'}, particle:{speed:0.3,count:0.4}, special:[] };
THEMES['neon-city'].animation       = { spring:{damping:9,stiffness:210,mass:0.85}, fade:{duration:11}, slide:{duration:17}, scale:{from:0.82,to:1}, glow:{intensity:0.85,color:'#F43F5E'}, particle:{speed:1.1,count:1.25}, special:['neon-pulse','city-glow'] };
THEMES['fintech'].animation         = { spring:{damping:26,stiffness:95,mass:1.1}, fade:{duration:20}, slide:{duration:28}, scale:{from:0.91,to:1}, glow:{intensity:0.25,color:'#059669'}, particle:{speed:0.5,count:0.7}, special:['growth-line','stable-pulse'] };
THEMES['pure-medical'].animation    = { spring:{damping:28,stiffness:90,mass:1.2}, fade:{duration:22}, slide:{duration:30}, scale:{from:0.92,to:1}, glow:{intensity:0.2,color:'#0EA5E9'}, particle:{speed:0.35,count:0.6}, special:['soft-glow','calm-pulse'] };
THEMES['autumn-vintage'].animation  = { spring:{damping:22,stiffness:115,mass:1.1}, fade:{duration:20}, slide:{duration:30}, scale:{from:0.88,to:1}, glow:{intensity:0.3,color:'#DC2626'}, particle:{speed:0.5,count:0.75}, special:['warm-shimmer','leaf-drift'] };
THEMES['game-elite'].animation      = { spring:{damping:8,stiffness:220,mass:0.8}, fade:{duration:10}, slide:{duration:15}, scale:{from:0.8,to:1}, glow:{intensity:0.85,color:'#8B5CF6'}, particle:{speed:1.3,count:1.4}, special:['glitch','energy-pulse'] };
THEMES['education-blue'].animation  = { spring:{damping:25,stiffness:90,mass:1.1}, fade:{duration:20}, slide:{duration:30}, scale:{from:0.92,to:1}, glow:{intensity:0.2,color:'#3B82F6'}, particle:{speed:0.4,count:0.6}, special:[] };
THEMES['news-official'].animation   = { spring:{damping:28,stiffness:85,mass:1.2}, fade:{duration:18}, slide:{duration:25}, scale:{from:0.92,to:1}, glow:{intensity:0.15,color:'#1E40AF'}, particle:{speed:0.3,count:0.4}, special:[] };
THEMES['auto-tech'].animation       = { spring:{damping:16,stiffness:150,mass:1}, fade:{duration:14}, slide:{duration:20}, scale:{from:0.88,to:1}, glow:{intensity:0.5,color:'#3B82F6'}, particle:{speed:0.8,count:1}, special:['speed-line'] };
THEMES['startup-energy'].animation = { spring:{damping:12,stiffness:180,mass:0.9}, fade:{duration:14}, slide:{duration:20}, scale:{from:0.85,to:1}, glow:{intensity:0.55,color:'#10B981'}, particle:{speed:0.9,count:1.1}, special:['rocket-launch'] };
THEMES['luxury-elegant'].animation = { spring:{damping:18,stiffness:120,mass:1.1}, fade:{duration:18}, slide:{duration:26}, scale:{from:0.9,to:1}, glow:{intensity:0.6,color:'#FFD700'}, particle:{speed:0.6,count:0.8}, special:['gold-shimmer'] };

// 新增科技类 (31-35)
THEMES['ai-smart'].animation        = { spring:{damping:11,stiffness:190,mass:0.85}, fade:{duration:12}, slide:{duration:18}, scale:{from:0.84,to:1}, glow:{intensity:0.65,color:'#6366F1'}, particle:{speed:1.0,count:1.2}, special:['ai-pulse','sparkle'] };
THEMES['coding-dev'].animation     = { spring:{damping:14,stiffness:160,mass:0.95}, fade:{duration:12}, slide:{duration:18}, scale:{from:0.86,to:1}, glow:{intensity:0.5,color:'#22C55E'}, particle:{speed:0.9,count:1.1}, special:['code-typing','terminal-glow'] };
THEMES['space-cosmos'].animation   = { spring:{damping:8,stiffness:200,mass:0.8}, fade:{duration:10}, slide:{duration:15}, scale:{from:0.78,to:1}, glow:{intensity:0.8,color:'#7C3AED'}, particle:{speed:1.3,count:1.5}, special:['star-twinkle','nebula-drift'] };
THEMES['cyber-dark'].animation     = { spring:{damping:8,stiffness:220,mass:0.8}, fade:{duration:10}, slide:{duration:14}, scale:{from:0.78,to:1}, glow:{intensity:0.75,color:'#7C3AED'}, particle:{speed:1.2,count:1.4}, special:['hack-glitch','red-alert'] };
THEMES['bio-tech'].animation        = { spring:{damping:18,stiffness:130,mass:1}, fade:{duration:16}, slide:{duration:24}, scale:{from:0.88,to:1}, glow:{intensity:0.45,color:'#10B981'}, particle:{speed:0.7,count:0.9}, special:['dna-helix','cell-pulse'] };

// 新增专业类 (44-50)
THEMES['law-justice'].animation    = { spring:{damping:26,stiffness:90,mass:1.2}, fade:{duration:20}, slide:{duration:28}, scale:{from:0.92,to:1}, glow:{intensity:0.3,color:'#1E3A8A'}, particle:{speed:0.4,count:0.6}, special:['scale-balance','stamp-seal'] };
THEMES['invest-plan'].animation    = { spring:{damping:24,stiffness:95,mass:1.1}, fade:{duration:20}, slide:{duration:28}, scale:{from:0.91,to:1}, glow:{intensity:0.3,color:'#10B981'}, particle:{speed:0.5,count:0.7}, special:['chart-up','coin-stack'] };
THEMES['psychology-mind'].animation = { spring:{damping:20,stiffness:120,mass:1}, fade:{duration:18}, slide:{duration:26}, scale:{from:0.9,to:1}, glow:{intensity:0.5,color:'#7C3AED'}, particle:{speed:0.6,count:0.8}, special:['brain-wave','calm-pulse'] };
THEMES['handcraft-diy'].animation  = { spring:{damping:22,stiffness:100,mass:1.1}, fade:{duration:20}, slide:{duration:28}, scale:{from:0.9,to:1}, glow:{intensity:0.35,color:'#D97706'}, particle:{speed:0.4,count:0.6}, special:['craft-spin','thread-weave'] };
THEMES['architecture-interior'].animation = { spring:{damping:28,stiffness:80,mass:1.2}, fade:{duration:22}, slide:{duration:30}, scale:{from:0.92,to:1}, glow:{intensity:0.2,color:'#F8FAFC'}, particle:{speed:0.3,count:0.5}, special:['blueprint-grid','line-draw'] };
THEMES['photo-lifestyle'].animation = { spring:{damping:26,stiffness:85,mass:1.2}, fade:{duration:22}, slide:{duration:30}, scale:{from:0.92,to:1}, glow:{intensity:0.2,color:'#A8A29E'}, particle:{speed:0.3,count:0.5}, special:['film-grain','vignette'] };
THEMES['vintage-film'].animation   = { spring:{damping:22,stiffness:100,mass:1.1}, fade:{duration:20}, slide:{duration:28}, scale:{from:0.9,to:1}, glow:{intensity:0.25,color:'#B45309'}, particle:{speed:0.4,count:0.6}, special:['film-grain','sepia-shift'] };

// ─── 别名兼容（向后兼容旧的 theme key）───────────────────────────────────────
// gaming-neon / education-calm / health-fresh 直接映射到 THEMES（从 theme-colors 加载）
const aliasMap = { 'gaming-neon':'game-elite', 'education-calm':'aurora-gradient', 'health-fresh':'bio-tech' };
Object.keys(aliasMap).forEach(alias => {
  const target = aliasMap[alias];
  THEMES[alias] = JSON.parse(JSON.stringify(THEMES[target])); // 深拷贝
  THEMES[alias].name = THEMES[alias].name + '（别名）';
});

// ─── 辅助函数 ───────────────────────────────────────────────────────────────
function getTheme(id) {
  return THEMES[id] || THEMES['cyberpunk'];
}

function getThemeAnimation(styleId) {
  const theme = getTheme(styleId);
  return theme.animation || THEMES['tech-modern'].animation;
}

function getGlowConfig(styleId) {
  const anim = getThemeAnimation(styleId);
  return anim.glow;
}

function hasSpecialEffect(styleId, effect) {
  const anim = getThemeAnimation(styleId);
  return anim.special.includes(effect);
}

function getParticleSpeed(styleId) {
  const anim = getThemeAnimation(styleId);
  return anim.particle.speed;
}

const CONFIG = {
  platformSpecs: {
    xiaohongshu: { width:1080, height:1920, fps:60, bitrate:'10-15 Mbps', audioBitrate:'128 kbps' },
    videonum:    { width:1080, height:1920, fps:30, bitrate:'8-12 Mbps',  audioBitrate:'128 kbps' },
    douyin:      { width:1080, height:1920, fps:60, bitrate:'10-15 Mbps', audioBitrate:'128 kbps' },
    youtube:     { width:1080, height:1920, fps:30, bitrate:'8-12 Mbps',  audioBitrate:'128 kbps' },
  },
};

function getPlatformSpec(platform) {
  return CONFIG.platformSpecs[platform] || CONFIG.platformSpecs.xiaohongshu;
}

const VALID_STYLES  = VALID_THEME_IDS;
const VALID_PLATFORMS = Object.keys(CONFIG.platformSpecs);

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
