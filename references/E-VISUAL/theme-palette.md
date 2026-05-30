# 主题色板 — 50 套封面配色完整参考

> **最后更新**：2026-05-24

> 所属模块：video-creator / SKILL.md → 视觉设计
> ⚠️ **数据来源**：`scripts/theme-colors.js`（单一数据源）
> 对应 Remotion 动画风格：`rules/THEMES.md` 的 50 个动画主题 ID
> 实现代码：`scripts/generate_cover.py` `THEME_STYLES` 字典（由 theme-colors.js 动态加载）
> 推断逻辑：`scripts/generate_docs.js` `inferTheme()` 函数

## 命名规范

- `inferredTheme` 值 = `rules/THEMES.md` 的 Remotion 动画风格 ID
- `inferredTheme` 值 = `generate_cover.py` `THEME_STYLES` 字典键名
- 三者必须完全一致
- 所有配色只修改 `scripts/theme-colors.js`，自动同步到 Remotion 和封面图

---

## 全部 50 套主题色板

### 科技类（15 套）

#### 1. tech-modern · 科技现代风

| 字段 | 色值 |
|------|------|
| bg_primary | `#0F172A` |
| bg_grid | `#1E293B` |
| glow_colors | `#2563EB`, `#7C3AED`, `#10B981`, `#2563EB` |
| title_glow | `#60A5FA` |
| subtitle_color | `#60A5FA` |
| attr_colors | `#60A5FA`, `#7C3AED`, `#10B981`, `#34D399`, `#A78BFA`, `#6EE7B7`, `#818CF8`, `#2DD4BF` |
| 适用场景 | 科技产品、AI工具、SaaS、开发者内容 |

#### 2. cyberpunk · 赛博朋克风

| 字段 | 色值 |
|------|------|
| bg_primary | `#0D0221` |
| bg_grid | `#150828` |
| glow_colors | `#00FFFF`, `#FF00FF`, `#9D00FF`, `#00FFFF` |
| title_glow | `#00CCCC` |
| subtitle_color | `#00FFFF` |
| attr_colors | `#00FFFF`, `#FF00FF`, `#9D00FF`, `#00FF88`, `#FF6600`, `#FFD700`, `#FF3366`, `#33CCFF` |
| 适用场景 | 科技新品发布、游戏、潮流科技 |

#### 3. neon-future · 霓虹未来风

| 字段 | 色值 |
|------|------|
| bg_primary | `#000022` |
| bg_grid | `#001155` |
| glow_colors | `#00FF88`, `#FF0088`, `#8800FF`, `#00FF88` |
| title_glow | `#00FF88` |
| subtitle_color | `#00FF88` |
| attr_colors | `#00FF88`, `#FF0088`, `#8800FF`, `#00FFFF`, `#FFFF00`, `#FF4400`, `#00FF44`, `#FF00CC` |
| 适用场景 | 创新、前沿、趋势 |

#### 4. minimal-tech · 极简科技风

| 字段 | 色值 |
|------|------|
| bg_primary | `#020617` |
| bg_grid | `#0F172A` |
| glow_colors | `#64748B`, `#94A3B8`, `#F8FAFC`, `#64748B` |
| title_glow | `#94A3B8` |
| subtitle_color | `#CBD5E1` |
| attr_colors | `#94A3B8`, `#CBD5E1`, `#64748B`, `#E2E8F0`, `#475569`, `#F8FAFC`, `#334155`, `#1E293B` |
| 适用场景 | 高端品牌、专业服务、金融科技 |

#### 5. particle-tech · 粒子科技风

| 字段 | 色值 |
|------|------|
| bg_primary | `#0F0F23` |
| bg_grid | `#1A1A3E` |
| glow_colors | `#00FFCC`, `#FFCC00`, `#CC00FF`, `#00FFCC` |
| title_glow | `#00FFCC` |
| subtitle_color | `#00FFCC` |
| attr_colors | `#00FFCC`, `#FFCC00`, `#CC00FF`, `#00DDFF`, `#FFDD00`, `#FF00FF`, `#00FF88`, `#FF9900` |
| 适用场景 | 数据、科学、研究、大数据 |

#### 6. gradient-wave · 渐变波纹风

| 字段 | 色值 |
|------|------|
| bg_primary | `#020617` |
| bg_grid | `#0C1445` |
| glow_colors | `#06B6D4`, `#8B5CF6`, `#EC4899`, `#06B6D4` |
| title_glow | `#22D3EE` |
| subtitle_color | `#06B6D4` |
| attr_colors | `#22D3EE`, `#8B5CF6`, `#EC4899`, `#F472B6`, `#A78BFA`, `#2DD4BF`, `#E879F9`, `#67E8F9` |
| 适用场景 | 设计产品、创意内容、视觉艺术 |

#### 7. glass-morphism · 玻璃拟态风

| 字段 | 色值 |
|------|------|
| bg_primary | `#0A0A0F` |
| bg_grid | `#1A1A2E` |
| glow_colors | `#FFFFFF40`, `#00FFCC30`, `#0099FF30`, `#FFFFFF30` |
| title_glow | `#E0E7FF` |
| subtitle_color | `#C7D2FE` |
| attr_colors | `#C7D2FE`, `#A5B4FC`, `#818CF8`, `#E0E7FF`, `#93C5FD`, `#DDD6FE`, `#BFDBFE`, `#E5E7EB` |
| 适用场景 | 时尚、品牌、高端 |

#### 8. holographic · 全息投影风

| 字段 | 色值 |
|------|------|
| bg_primary | `#000000` |
| bg_grid | `#001122` |
| glow_colors | `#00FFCC`, `#0099FF`, `#CC00FF`, `#00FFCC` |
| title_glow | `#00DDFF` |
| subtitle_color | `#00FFCC` |
| attr_colors | `#00FFCC`, `#0099FF`, `#CC00FF`, `#00DDFF`, `#FF00CC`, `#00FF88`, `#3399FF`, `#FF00AA` |
| 适用场景 | AR/VR、元宇宙、虚拟现实 |

#### 9. data-stream · 数据流风

| 字段 | 色值 |
|------|------|
| bg_primary | `#001122` |
| bg_grid | `#002244` |
| glow_colors | `#00FF00`, `#00CCFF`, `#FF00FF`, `#00FF00` |
| title_glow | `#00FF00` |
| subtitle_color | `#00FF00` |
| attr_colors | `#00FF00`, `#00CCFF`, `#FF00FF`, `#00FFFF`, `#33FF33`, `#00CCFF`, `#FF44FF`, `#00FF88` |
| 适用场景 | 大数据、金融、分析、监控 |

#### 10. quantum-tech · 量子科技风

| 字段 | 色值 |
|------|------|
| bg_primary | `#110011` |
| bg_grid | `#220033` |
| glow_colors | `#FF00CC`, `#00FFCC`, `#CCFF00`, `#FF00CC` |
| title_glow | `#FF44DD` |
| subtitle_color | `#FF00CC` |
| attr_colors | `#FF00CC`, `#00FFCC`, `#CCFF00`, `#FF44DD`, `#00FF88`, `#FFFF00`, `#FF0088`, `#00FF44` |
| 适用场景 | 量子、物理、前沿科研 |

---

### 生活方式类（6 套）

#### 11. vibrant-gradient · 活力渐变风

| 字段 | 色值 |
|------|------|
| bg_primary | `#1C1917` |
| bg_grid | `#292524` |
| glow_colors | `#F97316`, `#EAB308`, `#22C55E`, `#F97316` |
| title_glow | `#FDBA74` |
| subtitle_color | `#F97316` |
| attr_colors | `#F97316`, `#EAB308`, `#22C55E`, `#FBBF24`, `#F59E0B`, `#84CC16`, `#FB923C`, `#FDE047` |
| 适用场景 | 生活方式、健身、美食、电商 |

#### 12. aurora-gradient · 极光渐变风

| 字段 | 色值 |
|------|------|
| bg_primary | `#020617` |
| bg_grid | `#0C1445` |
| glow_colors | `#06B6D4`, `#8B5CF6`, `#EC4899`, `#06B6D4` |
| title_glow | `#67E8F9` |
| subtitle_color | `#22D3EE` |
| attr_colors | `#67E8F9`, `#8B5CF6`, `#EC4899`, `#F472B6`, `#A78BFA`, `#2DD4BF`, `#E879F9`, `#38BDF8` |
| 适用场景 | 设计产品、创意内容、视觉艺术 |

#### 13. music-beat · 音乐节拍风

| 字段 | 色值 |
|------|------|
| bg_primary | `#1A0A1A` |
| bg_grid | `#2D1528` |
| glow_colors | `#EC4899`, `#F472B6`, `#FBBF24`, `#EC4899` |
| title_glow | `#F9A8D4` |
| subtitle_color | `#EC4899` |
| attr_colors | `#EC4899`, `#F472B6`, `#FBBF24`, `#F9A8D4`, `#FB923C`, `#FDE68A`, `#E879F9`, `#FCD34D` |
| 适用场景 | 音乐、音频、演唱会 |

#### 14. pet-cute · 萌宠可爱风

| 字段 | 色值 |
|------|------|
| bg_primary | `#1C0A18` |
| bg_grid | `#2D1525` |
| glow_colors | `#F472B6`, `#FB7185`, `#FBBF24`, `#F472B6` |
| title_glow | `#F9A8D4` |
| subtitle_color | `#F472B6` |
| attr_colors | `#F472B6`, `#FB7185`, `#FBBF24`, `#F9A8D4`, `#FDA4AF`, `#FCD34D`, `#E879F9`, `#FDE68A` |
| 适用场景 | 宠物、萌宠、猫咪、狗狗 |

#### 15. food-warm · 美食温暖风

| 字段 | 色值 |
|------|------|
| bg_primary | `#1A0A00` |
| bg_grid | `#2D1500` |
| glow_colors | `#FF6600`, `#FFD700`, `#FF3300`, `#FF6600` |
| title_glow | `#FF9900` |
| subtitle_color | `#FFD700` |
| attr_colors | `#FF6600`, `#FFD700`, `#FF3300`, `#FF9933`, `#FFCC00`, `#FF5500`, `#CC6600`, `#FFB300` |
| 适用场景 | 美食、探店、餐饮、外卖 |

#### 16. travel-vibrant · 旅行冒险风

| 字段 | 色值 |
|------|------|
| bg_primary | `#001A2D` |
| bg_grid | `#002040` |
| glow_colors | `#33CCFF`, `#FF6600`, `#00CCFF`, `#FF9933` |
| title_glow | `#00AAFF` |
| subtitle_color | `#33CCFF` |
| attr_colors | `#33CCFF`, `#FF6600`, `#00CCFF`, `#FFCC00`, `#0099FF`, `#FF9933`, `#00AAEE`, `#FF7744` |
| 适用场景 | 旅行、冒险、出行、攻略 |

---

### 自然类（3 套）

#### 17. forest-nature · 森林自然风

| 字段 | 色值 |
|------|------|
| bg_primary | `#064E3B` |
| bg_grid | `#0A3D2E` |
| glow_colors | `#059669`, `#10B981`, `#F59E0B`, `#059669` |
| title_glow | `#34D399` |
| subtitle_color | `#059669` |
| attr_colors | `#059669`, `#10B981`, `#F59E0B`, `#34D399`, `#6EE7B7`, `#FBBF24`, `#16A34A`, `#D97706` |
| 适用场景 | 环保、有机农业、户外、瑜伽 |

#### 18. deep-ocean · 深海科技风

| 字段 | 色值 |
|------|------|
| bg_primary | `#030712` |
| bg_grid | `#0C1A2E` |
| glow_colors | `#0891B2`, `#4F46E5`, `#06B6D4`, `#0891B2` |
| title_glow | `#38BDF8` |
| subtitle_color | `#0891B2` |
| attr_colors | `#0891B2`, `#4F46E5`, `#06B6D4`, `#38BDF8`, `#818CF8`, `#22D3EE`, `#0EA5E9`, `#6366F1` |
| 适用场景 | 海洋科技、潜水、航运、环保 |

#### 19. arctic-ice · 极地冰晶风

| 字段 | 色值 |
|------|------|
| bg_primary | `#0C1222` |
| bg_grid | `#152238` |
| glow_colors | `#38BDF8`, `#818CF8`, `#34D399`, `#38BDF8` |
| title_glow | `#7DD3FC` |
| subtitle_color | `#38BDF8` |
| attr_colors | `#7DD3FC`, `#818CF8`, `#34D399`, `#38BDF8`, `#A5B4FC`, `#6EE7B7`, `#0EA5E9`, `#A78BFA` |
| 适用场景 | 冬季运动、冰雪、清洁能源 |

---

### 专业类（11 套）

#### 20. minimal-tech · 暗夜极简风

| 字段 | 色值 |
|------|------|
| bg_primary | `#020617` |
| bg_grid | `#0F172A` |
| glow_colors | `#475569`, `#94A3B8`, `#F8FAFC`, `#475569` |
| title_glow | `#94A3B8` |
| subtitle_color | `#CBD5E1` |
| attr_colors | `#94A3B8`, `#CBD5E1`, `#64748B`, `#E2E8F0`, `#475569`, `#F8FAFC`, `#334155`, `#1E293B` |
| 适用场景 | 高端品牌、专业服务、金融科技 |

#### 21. neon-city · 霓虹都市风

| 字段 | 色值 |
|------|------|
| bg_primary | `#18181B` |
| bg_grid | `#27272A` |
| glow_colors | `#F43F5E`, `#8B5CF6`, `#FBBF24`, `#F43F5E` |
| title_glow | `#FB7185` |
| subtitle_color | `#F43F5E` |
| attr_colors | `#F43F5E`, `#8B5CF6`, `#FBBF24`, `#FB7185`, `#A78BFA`, `#FCD34D`, `#E11D48`, `#C084FC` |
| 适用场景 | 夜生活、音乐、时尚 |

#### 22. fintech · 金融科技风

| 字段 | 色值 |
|------|------|
| bg_primary | `#052E16` |
| bg_grid | `#0A3D2E` |
| glow_colors | `#059669`, `#10B981`, `#FBBF24`, `#059669` |
| title_glow | `#34D399` |
| subtitle_color | `#FBBF24` |
| attr_colors | `#059669`, `#10B981`, `#FBBF24`, `#34D399`, `#6EE7B7`, `#FCD34D`, `#16A34A`, `#D97706` |
| 适用场景 | 金融、投资区、块链、加密货币 |

#### 23. pure-medical · 纯净医疗风

| 字段 | 色值 |
|------|------|
| bg_primary | `#F0F9FF` |
| bg_grid | `#E0F2FE` |
| glow_colors | `#0EA5E9`, `#14B8A6`, `#FFFFFF`, `#0EA5E9` |
| title_glow | `#0284C7` |
| subtitle_color | `#0284C7` |
| attr_colors | `#0EA5E9`, `#14B8A6`, `#FFFFFF`, `#0284C7`, `#38BDF8`, `#2DD4BF`, `#7DD3FC`, `#99F6E4` |
| 适用场景 | 医疗健康、制药、生物科技 |

#### 24. autumn-vintage · 暖秋复古风

| 字段 | 色值 |
|------|------|
| bg_primary | `#1C1917` |
| bg_grid | `#292524` |
| glow_colors | `#DC2626`, `#F59E0B`, `#2563EB`, `#DC2626` |
| title_glow | `#F87171` |
| subtitle_color | `#DC2626` |
| attr_colors | `#DC2626`, `#F59E0B`, `#2563EB`, `#F87171`, `#FB923C`, `#3B82F6`, `#EF4444`, `#FBBF24` |
| 适用场景 | 复古品牌、手工艺、咖啡馆、艺术 |

#### 25. game-elite · 电竞游戏风

| 字段 | 色值 |
|------|------|
| bg_primary | `#0F0A1A` |
| bg_grid | `#1A1230` |
| glow_colors | `#8B5CF6`, `#A78BFA`, `#F43F5E`, `#8B5CF6` |
| title_glow | `#A78BFA` |
| subtitle_color | `#8B5CF6` |
| attr_colors | `#8B5CF6`, `#A78BFA`, `#F43F5E`, `#C084FC`, `#F9A8D4`, `#E879F9`, `#FB7185`, `#DDD6FE` |
| 适用场景 | 游戏、电竞、Steam |

#### 26. education-blue · 学术教育风

| 字段 | 色值 |
|------|------|
| bg_primary | `#1E3A8A` |
| bg_grid | `#1E40AF` |
| glow_colors | `#3B82F6`, `#60A5FA`, `#93C5FD`, `#3B82F6` |
| title_glow | `#60A5FA` |
| subtitle_color | `#3B82F6` |
| attr_colors | `#3B82F6`, `#60A5FA`, `#93C5FD`, `#2563EB`, `#BFDBFE`, `#A5B4FC`, `#818CF8`, `#C7D2FE` |
| 适用场景 | 课程、教育、培训、学校 |

#### 27. news-official · 新闻权威风

| 字段 | 色值 |
|------|------|
| bg_primary | `#1E3A8A` |
| bg_grid | `#1E3A8A` |
| glow_colors | `#1E40AF`, `#3B82F6`, `#60A5FA`, `#1E40AF` |
| title_glow | `#93C5FD` |
| subtitle_color | `#60A5FA` |
| attr_colors | `#1E40AF`, `#3B82F6`, `#60A5FA`, `#93C5FD`, `#2563EB`, `#BFDBFE`, `#7DD3FC`, `#DBEAFE` |
| 适用场景 | 新闻、时事、政治、社会 |

#### 28. auto-tech · 汽车科技风

| 字段 | 色值 |
|------|------|
| bg_primary | `#0F1A1A` |
| bg_grid | `#1A2F2F` |
| glow_colors | `#06B6D4`, `#10B981`, `#F97316`, `#06B6D4` |
| title_glow | `#22D3EE` |
| subtitle_color | `#06B6D4` |
| attr_colors | `#06B6D4`, `#10B981`, `#F97316`, `#22D3EE`, `#2DD4BF`, `#6EE7B7`, `#FB923C`, `#38BDF8` |
| 适用场景 | 汽车、科技、新能源、电动车 |

#### 29. startup-energy · 创业活力风

| 字段 | 色值 |
|------|------|
| bg_primary | `#022C22` |
| bg_grid | `#064E3B` |
| glow_colors | `#10B981`, `#34D399`, `#FBBF24`, `#10B981` |
| title_glow | `#34D399` |
| subtitle_color | `#10B981` |
| attr_colors | `#10B981`, `#34D399`, `#FBBF24`, `#6EE7B7`, `#FCD34D`, `#16A34A`, `#A7F3D0`, `#FDE68A` |
| 适用场景 | 创业、融资、商业计划 |

#### 30. luxury-elegant · 奢华优雅风

| 字段 | 色值 |
|------|------|
| bg_primary | `#0A0A0A` |
| bg_grid | `#1A1A1A` |
| glow_colors | `#FFD700`, `#FFB300`, `#FF9900`, `#FFD700` |
| title_glow | `#FFCC00` |
| subtitle_color | `#FFD700` |
| attr_colors | `#FFD700`, `#FFB300`, `#FF9900`, `#FFCC00`, `#FFE033`, `#CC9900`, `#FFCC33`, `#DDAA00` |
| 适用场景 | 奢侈品、名表、名包、珠宝 |

### 生活类（8 套）

#### 31. social-media · 社交媒体风

| 字段 | 色值 |
|------|------|
| bg_primary | `#0F172A` |
| bg_grid | `#1E293B` |
| glow_colors | `#EC4899`, `#F472B6`, `#8B5CF6`, `#EC4899` |
| title_glow | `#F9A8D4` |
| subtitle_color | `#EC4899` |
| attr_colors | `#EC4899`, `#F472B6`, `#FB7185`, `#F9A8D4`, `#FDA4AF`, `#E879F9`, `#D946EF`, `#C084FC` |
| 适用场景 | 社交媒体运营、涨粉技巧、网红经济 |

#### 32. beauty-makeup · 美容美妆风

| 字段 | 色值 |
|------|------|
| bg_primary | `#1C0A18` |
| bg_grid | `#2D1525` |
| glow_colors | `#F472B6`, `#FB7185`, `#FCD34D`, `#F472B6` |
| title_glow | `#F9A8D4` |
| subtitle_color | `#F472B6` |
| attr_colors | `#F472B6`, `#FB7185`, `#FCD34D`, `#F9A8D4`, `#FDA4AF`, `#FDE68A`, `#E879F9`, `#FCD34D` |
| 适用场景 | 美容、医美、美妆、护肤 |

#### 33. parenting-baby · 育儿萌娃风

| 字段 | 色值 |
|------|------|
| bg_primary | `#1C0A18` |
| bg_grid | `#2D1525` |
| glow_colors | `#F472B6`, `#FCD34D`, `#86EFAC`, `#F472B6` |
| title_glow | `#F9A8D4` |
| subtitle_color | `#86EFAC` |
| attr_colors | `#F472B6`, `#FCD34D`, `#86EFAC`, `#F9A8D4`, `#FDA4AF`, `#FDE68A`, `#6EE7B7`, `#A7F3D0` |
| 适用场景 | 育儿、萌娃、亲子、备孕 |

#### 34. fitness-gym · 健身塑形风

| 字段 | 色值 |
|------|------|
| bg_primary | `#0F172A` |
| bg_grid | `#1E293B` |
| glow_colors | `#F97316`, `#EF4444`, `#FBBF24`, `#F97316` |
| title_glow | `#FDBA74` |
| subtitle_color | `#F97316` |
| attr_colors | `#F97316`, `#EF4444`, `#FBBF24`, `#FDBA74`, `#FB923C`, `#FCD34D`, `#F87171`, `#FDE68A` |
| 适用场景 | 健身、减脂、增肌、塑形 |

#### 35. coffee-break · 咖啡慢生活风

| 字段 | 色值 |
|------|------|
| bg_primary | `#1A0A00` |
| bg_grid | `#2D1500` |
| glow_colors | `#92400E`, `#D97706`, `#FBBF24`, `#92400E` |
| title_glow | `#F59E0B` |
| subtitle_color | `#D97706` |
| attr_colors | `#92400E`, `#D97706`, `#FBBF24`, `#F59E0B`, `#B45309`, `#FCD34D`, `#FDE68A`, `#FDE047` |
| 适用场景 | 咖啡时光、下午茶、慢生活 |

#### 36. book-literature · 读书文学风

| 字段 | 色值 |
|------|------|
| bg_primary | `#1C1917` |
| bg_grid | `#292524` |
| glow_colors | `#78350F`, `#B45309`, `#D97706`, `#78350F` |
| title_glow | `#FDE68A` |
| subtitle_color | `#D97706` |
| attr_colors | `#78350F`, `#B45309`, `#D97706`, `#FDE68A`, `#92400E`, `#FCD34D`, `#FBBF24`, `#F59E0B` |
| 适用场景 | 读书、文学、书单推荐 |

#### 37. anime-manga · 二次元动漫风

| 字段 | 色值 |
|------|------|
| bg_primary | `#0F0A1A` |
| bg_grid | `#1A1230` |
| glow_colors | `#8B5CF6`, `#EC4899`, `#06B6D4`, `#8B5CF6` |
| title_glow | `#A78BFA` |
| subtitle_color | `#EC4899` |
| attr_colors | `#8B5CF6`, `#EC4899`, `#06B6D4`, `#A78BFA`, `#C084FC`, `#F472B6`, `#22D3EE`, `#67E8F9` |
| 适用场景 | 动漫、二次元、漫画、番剧 |

#### 38. celebrity-star · 明星偶像风

| 字段 | 色值 |
|------|------|
| bg_primary | `#0F0A1A` |
| bg_grid | `#1A1230` |
| glow_colors | `#F43F5E`, `#FBBF24`, `#8B5CF6`, `#F43F5E` |
| title_glow | `#FB7185` |
| subtitle_color | `#F43F5E` |
| attr_colors | `#F43F5E`, `#FBBF24`, `#8B5CF6`, `#FB7185`, `#FDA4AF`, `#FCD34D`, `#C084FC`, `#F9A8D4` |
| 适用场景 | 明星、偶像、演唱会、追星 |

### 专业类（12 套）

#### 39. law-justice · 法律正义风

| 字段 | 色值 |
|------|------|
| bg_primary | `#1E3A8A` |
| bg_grid | `#1E40AF` |
| glow_colors | `#3B82F6`, `#1D4ED8`, `#60A5FA`, `#3B82F6` |
| title_glow | `#93C5FD` |
| subtitle_color | `#60A5FA` |
| attr_colors | `#3B82F6`, `#1D4ED8`, `#60A5FA`, `#93C5FD`, `#BFDBFE`, `#7DD3FC`, `#2563EB`, `#3B82F6` |
| 适用场景 | 法律、律师、维权、司法 |

#### 40. invest-plan · 财富规划风

| 字段 | 色值 |
|------|------|
| bg_primary | `#052E16` |
| bg_grid | `#064E3B` |
| glow_colors | `#10B981`, `#059669`, `#34D399`, `#10B981` |
| title_glow | `#6EE7B7` |
| subtitle_color | `#34D399` |
| attr_colors | `#10B981`, `#059669`, `#34D399`, `#6EE7B7`, `#16A34A`, `#A7F3D0`, `#D1FAE5`, `#6EE7B7` |
| 适用场景 | 理财规划、财务自由、投资组合 |

#### 41. psychology-mind · 心理心灵风

| 字段 | 色值 |
|------|------|
| bg_primary | `#1E3A8A` |
| bg_grid | `#312E81` |
| glow_colors | `#6366F1`, `#4F46E5`, `#818CF8`, `#6366F1` |
| title_glow | `#A5B4FC` |
| subtitle_color | `#818CF8` |
| attr_colors | `#6366F1`, `#4F46E5`, `#818CF8`, `#A5B4FC`, `#C7D2FE`, `#DDD6FE`, `#818CF8`, `#A78BFA` |
| 适用场景 | 心理学、心理咨询、情绪管理 |

#### 42. handcraft-diy · 手工 DIY 风

| 字段 | 色值 |
|------|------|
| bg_primary | `#1C1917` |
| bg_grid | `#292524` |
| glow_colors | `#B45309`, `#D97706`, `#78350F`, `#B45309` |
| title_glow | `#FCD34D` |
| subtitle_color | `#B45309` |
| attr_colors | `#B45309`, `#D97706`, `#78350F`, `#FCD34D`, `#92400E`, `#FDE68A`, `#FBBF24`, `#F59E0B` |
| 适用场景 | 手工、DIY、编织、木工 |

#### 43. architecture-interior · 家居设计风

| 字段 | 色值 |
|------|------|
| bg_primary | `#1C1917` |
| bg_grid | `#292524` |
| glow_colors | `#E5E7EB`, `#D1D5DB`, `#9CA3AF`, `#E5E7EB` |
| title_glow | `#F9FAFB` |
| subtitle_color | `#D1D5DB` |
| attr_colors | `#E5E7EB`, `#D1D5DB`, `#9CA3AF`, `#F9FAFB`, `#F3F4F6`, `#6B7280`, `#D1D5DB`, `#E5E7EB` |
| 适用场景 | 室内设计、装修、家居美学 |

#### 44. photo-lifestyle · 摄影生活风

| 字段 | 色值 |
|------|------|
| bg_primary | `#0F172A` |
| bg_grid | `#1E293B` |
| glow_colors | `#6B7280`, `#9CA3AF`, `#D1D5DB`, `#6B7280` |
| title_glow | `#E5E7EB` |
| subtitle_color | `#D1D5DB` |
| attr_colors | `#6B7280`, `#9CA3AF`, `#D1D5DB`, `#E5E7EB`, `#F3F4F6`, `#F9FAFB`, `#D1D5DB`, `#9CA3AF` |
| 适用场景 | 摄影、人像、拍照技巧 |

#### 45. vintage-film · 复古胶片风

| 字段 | 色值 |
|------|------|
| bg_primary | `#1C1917` |
| bg_grid | `#292524` |
| glow_colors | `#B45309`, `#DC2626`, `#F59E0B`, `#B45309` |
| title_glow | `#FCD34D` |
| subtitle_color | `#F59E0B` |
| attr_colors | `#B45309`, `#DC2626`, `#F59E0B`, `#FCD34D`, `#92400E`, `#EF4444`, `#FDE68A`, `#FBBF24` |
| 适用场景 | 复古胶片、怀旧、时光 |

#### 46. ai-smart · AI 智能风

| 字段 | 色值 |
|------|------|
| bg_primary | `#0F172A` |
| bg_grid | `#1E293B` |
| glow_colors | `#6366F1`, `#8B5CF6`, `#06B6D4`, `#6366F1` |
| title_glow | `#A5B4FC` |
| subtitle_color | `#06B6D4` |
| attr_colors | `#6366F1`, `#8B5CF6`, `#06B6D4`, `#A5B4FC`, `#C084FC`, `#22D3EE`, `#67E8F9`, `#A78BFA` |
| 适用场景 | AI 绘画、AI 生成、AI 工具 |

#### 47. coding-dev · 编程开发风

| 字段 | 色值 |
|------|------|
| bg_primary | `#0F172A` |
| bg_grid | `#020617` |
| glow_colors | `#22D3EE`, `#3B82F6`, `#10B981`, `#22D3EE` |
| title_glow | `#67E8F9` |
| subtitle_color | `#3B82F6` |
| attr_colors | `#22D3EE`, `#3B82F6`, `#10B981`, `#67E8F9`, `#38BDF8`, `#6EE7B7`, `#60A5FA`, `#34D399` |
| 适用场景 | 编程、代码、程序员、GitHub |

#### 48. space-cosmos · 太空宇宙风

| 字段 | 色值 |
|------|------|
| bg_primary | `#000000` |
| bg_grid | `#0C0C23` |
| glow_colors | `#6366F1`, `#8B5CF6`, `#EC4899`, `#6366F1` |
| title_glow | `#A78BFA` |
| subtitle_color | `#8B5CF6` |
| attr_colors | `#6366F1`, `#8B5CF6`, `#EC4899`, `#A78BFA`, `#C084FC`, `#F472B6`, `#A78BFA`, `#E879F9` |
| 适用场景 | 太空、宇宙、航天、火星 |

#### 49. cyber-dark · 暗黑黑客风

| 字段 | 色值 |
|------|------|
| bg_primary | `#000000` |
| bg_grid | `#0C0C0C` |
| glow_colors | `#22C55E`, `#00FF00`, `#16A34A`, `#22C55E` |
| title_glow | `#4ADE80` |
| subtitle_color | `#00FF00` |
| attr_colors | `#22C55E`, `#00FF00`, `#16A34A`, `#4ADE80`, `#16A34A`, `#86EFAC`, `#00FF00`, `#22C55E` |
| 适用场景 | 黑客、网络安全、渗透测试 |

#### 50. bio-tech · 生物科技风

| 字段 | 色值 |
|------|------|
| bg_primary | `#052E16` |
| bg_grid | `#064E3B` |
| glow_colors | `#06B6D4`, `#059669`, `#10B981`, `#06B6D4` |
| title_glow | `#22D3EE` |
| subtitle_color | `#059669` |
| attr_colors | `#06B6D4`, `#059669`, `#10B981`, `#22D3EE`, `#2DD4BF`, `#34D399`, `#38BDF8`, `#16A34A` |
| 适用场景 | 生物技术、基因、制药、医疗 |

---

## 旧版别名兼容

| 旧版 inferredTheme | 新版 inferredTheme |
|-------------------|-------------------|
| `health-fresh` | `particle-tech` |
| `education-calm` | `aurora-gradient` |
| `gaming-neon` | `game-elite` |
| `finance-professional` | `fintech` |
| `fashion-elegant` | `luxury-elegant` |

> 旧版名称在 `generate_cover.py` `THEME_STYLES` 中保留别名映射，兼容已有 `video-config.json` 项目

---

## 验证命令

```bash
# 验证 THEME_STYLES 数量（应为 53，含3个别名）
python3 -c "from generate_cover import THEME_STYLES; print(f'Styles: {len(THEME_STYLES)}')"

# 验证新增 20 主题可渲染
python3 generate_cover.py --title "测试标题" --subtitle "副标题" --theme ai-smart --output /tmp/test_cover.png
```
