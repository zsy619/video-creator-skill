#!/usr/bin/env node

/**
 * Video Creator 示例运行脚本
 * 演示技能的基本使用方式
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// 示例内容
const DEMO_CONTENT = `# 人工智能在医疗领域的革命性应用

## 概述
人工智能正在彻底改变医疗行业，从疾病诊断到药物研发，AI技术正在创造前所未有的价值。

## 核心应用

### 1. 医学影像分析
- **自动诊断**: AI可以快速分析CT、MRI等医学影像
- **早期检测**: 在人类医生发现之前识别早期病变
- **精度提升**: 减少误诊率，提高诊断准确性

### 2. 药物研发加速
- **靶点发现**: AI帮助识别新的药物作用靶点
- **分子设计**: 自动设计具有特定性质的药物分子
- **临床试验**: 优化试验设计，加速审批流程

### 3. 个性化治疗
- **基因组分析**: 基于个人基因组数据定制治疗方案
- **疗效预测**: 预测患者对特定治疗的反应
- **副作用管理**: 提前预警可能的副作用

## 技术突破

### 深度学习算法
最新的深度学习算法在医疗图像分析方面达到了专家级水平。

### 自然语言处理
NLP技术能够从海量医学文献中提取有价值的信息。

### 联邦学习
在保护患者隐私的前提下，实现多机构数据协作。

## 成功案例

### 案例1: 皮肤癌诊断
Google开发的AI系统在皮肤癌诊断方面达到了专业皮肤科医生的水平。

### 案例2: 新冠药物筛选
AI平台在短时间内筛选出多种潜在的新冠治疗药物。

### 案例3: 罕见病诊断
AI帮助诊断了多例传统方法难以识别的罕见疾病。

## 未来展望

### 短期目标 (1-3年)
- 更多AI辅助诊断工具获得监管批准
- 个性化治疗成为标准实践
- AI在预防医学中发挥更大作用

### 长期愿景 (5-10年)
- 完全个性化的精准医疗
- AI驱动的全生命周期健康管理
- 医疗资源全球优化配置

## 挑战与对策

### 数据隐私
采用联邦学习和差分隐私技术保护患者数据。

### 算法偏见
通过多样化训练数据和算法审计减少偏见。

### 监管合规
与监管机构合作，建立AI医疗产品审批标准。

## 总结
人工智能正在为医疗行业带来革命性变革，虽然面临挑战，但其潜力巨大。随着技术的不断成熟和监管框架的完善，AI将在提升医疗质量、降低成本和改善患者体验方面发挥越来越重要的作用。`;

async function runDemo() {
  console.log('🎬 开始运行 Video Creator 示例...');
  console.log('='.repeat(50));
  
  const demoDir = path.dirname(__filename);
  const outputDir = path.join(demoDir, '..', 'output');
  
  try {
    // 1. 清理旧的输出目录
    console.log('🧹 清理输出目录...');
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch (error) {
      // 目录可能不存在，忽略错误
    }
    
    // 2. 创建输出目录
    await fs.mkdir(outputDir, { recursive: true });
    
    // 3. 保存示例内容
    const contentPath = path.join(outputDir, 'demo-content.md');
    await fs.writeFile(contentPath, DEMO_CONTENT);
    console.log(`📄 示例内容已保存: ${contentPath}`);
    
    // 4. 运行视频创作流程（模拟）
    console.log('\n🚀 模拟视频创作流程...');
    
    // 模拟内容处理
    console.log('📊 处理内容...');
    await simulateProcessing('内容分析', 1000);
    
    // 模拟图片生成
    console.log('🎨 生成视觉内容...');
    await simulateProcessing('封面图生成', 1500);
    await simulateProcessing('内容插图生成', 2000);
    await simulateProcessing('信息图生成', 1500);
    
    // 模拟HTML构建
    console.log('🌐 构建HTML页面...');
    await simulateProcessing('HTML页面构建', 1000);
    
    // 模拟视频生成
    console.log('📹 生成视频...');
    await simulateProcessing('视频渲染', 3000);
    
    // 5. 创建示例输出文件
    console.log('\n📁 创建示例输出文件...');
    
    // 创建目录结构
    const dirs = ['content', 'images', 'html', 'video'];
    for (const dir of dirs) {
      await fs.mkdir(path.join(outputDir, dir), { recursive: true });
    }
    
    // 创建示例文件
    await createExampleFiles(outputDir);
    
    // 6. 生成报告
    await generateReport(outputDir);
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ 示例运行完成！');
    console.log('\n📋 生成的文件:');
    
    // 列出生成的文件
    const files = await listFiles(outputDir);
    files.forEach(file => {
      const relativePath = path.relative(demoDir, file);
      console.log(`  📄 ${relativePath}`);
    });
    
    console.log('\n🚀 下一步:');
    console.log(`  查看详细报告: cat ${path.join(outputDir, 'report.md')}`);
    console.log(`  查看HTML示例: 打开 ${path.join(outputDir, 'html', 'article-summary.html')}`);
    
  } catch (error) {
    console.error('❌ 示例运行失败:', error);
    process.exit(1);
  }
}

// 模拟处理过程
async function simulateProcessing(task, delay) {
  process.stdout.write(`  ${task}... `);
  await new Promise(resolve => setTimeout(resolve, delay));
  console.log('✅');
}

// 创建示例文件
async function createExampleFiles(outputDir) {
  // 1. 内容文件
  const contentFiles = {
    'original.md': DEMO_CONTENT,
    'processed.md': `# 人工智能在医疗领域的革命性应用\n\n${DEMO_CONTENT}\n\n---\n\n## 平台优化\n\n### 小红书标题\n🔥 AI医疗革命：诊断精度提升90%\n\n### 视频号标题\n【科技前沿】人工智能如何改变医疗行业\n\n### 内容摘要\n人工智能正在彻底改变医疗行业，从疾病诊断到药物研发，AI技术正在创造前所未有的价值。深度学习算法在医疗图像分析方面达到了专家级水平...\n\n### 标签\n人工智能, 医疗科技, 医学影像, 药物研发, 个性化治疗, 深度学习, 健康管理`,
    'metadata.json': JSON.stringify({
      title: "人工智能在医疗领域的革命性应用",
      words: 856,
      paragraphs: 15,
      lines: 65,
      keywords: ["人工智能", "医疗", "诊断", "药物", "治疗", "深度学习", "个性化", "影像"],
      suggestedDuration: 45,
      imageCount: 5,
      xhsTitle: "🔥 AI医疗革命：诊断精度提升90%",
      wechatTitle: "【科技前沿】人工智能如何改变医疗行业",
      tags: ["人工智能", "医疗科技", "医学影像", "药物研发", "个性化治疗", "深度学习", "健康管理"],
      analyzedAt: new Date().toISOString()
    }, null, 2)
  };
  
  for (const [filename, content] of Object.entries(contentFiles)) {
    await fs.writeFile(path.join(outputDir, 'content', filename), content);
  }
  
  // 2. 图片占位文件
  const imageFiles = ['cover.webp', 'illustration-1.webp', 'illustration-2.webp', 'infographic.webp'];
  for (const filename of imageFiles) {
    await fs.writeFile(
      path.join(outputDir, 'images', filename.replace('.webp', '.txt')),
      `这是生成的${filename.replace('.webp', '')}，实际使用时由宝玉技能生成`
    );
  }
  
  // 3. HTML页面
  const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>人工智能在医疗领域的革命性应用</title>
    <link href="https://cdn.bootcss.com/tailwindcss/2.2.19/tailwind.min.css" rel="stylesheet">
    <style>
        body { font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; }
        .gradient-bg { background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%); }
        .glass-card { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); }
    </style>
</head>
<body class="gradient-bg text-white min-h-screen">
    <div class="container mx-auto px-4 py-8">
        <h1 class="text-4xl font-bold text-center mb-8">人工智能在医疗领域的革命性应用</h1>
        
        <div class="glass-card rounded-2xl p-8 mb-8">
            <h2 class="text-2xl font-bold mb-4">内容摘要</h2>
            <p class="text-lg">人工智能正在彻底改变医疗行业，从疾病诊断到药物研发，AI技术正在创造前所未有的价值。</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="glass-card rounded-2xl p-6">
                <h3 class="text-xl font-bold mb-4">小红书优化</h3>
                <p><strong>标题:</strong> 🔥 AI医疗革命：诊断精度提升90%</p>
                <p><strong>时长:</strong> 45秒</p>
                <p><strong>风格:</strong> 高饱和度，明亮色彩</p>
            </div>
            
            <div class="glass-card rounded-2xl p-6">
                <h3 class="text-xl font-bold mb-4">视频号优化</h3>
                <p><strong>标题:</strong> 【科技前沿】人工智能如何改变医疗行业</p>
                <p><strong>时长:</strong> 45秒</p>
                <p><strong>要求:</strong> 清晰可读，字体稍大</p>
            </div>
        </div>
        
        <div class="mt-8 text-center text-gray-400">
            <p>🎬 由 Video Creator 技能生成 • ${new Date().getFullYear()}</p>
        </div>
    </div>
</body>
</html>`;
  
  await fs.writeFile(path.join(outputDir, 'html', 'article-summary.html'), htmlContent);
  
  // 4. 视频占位文件
  const videoFiles = ['xhs-video.mp4', 'wechat-video.mp4', 'landscape-video.mp4'];
  for (const filename of videoFiles) {
    await fs.writeFile(
      path.join(outputDir, 'video', filename.replace('.mp4', '.txt')),
      `这是生成的${filename}，实际使用时由Remotion生成\n规格: 1080x1920, 60fps, 45秒`
    );
  }
}

// 生成报告
async function generateReport(outputDir) {
  const report = `# 🎬 Video Creator 生成报告

## 项目信息
- **生成时间**: ${new Date().toLocaleString('zh-CN')}
- **内容主题**: 人工智能在医疗领域的革命性应用
- **输出目录**: ${outputDir}

## 内容统计
- **总字数**: 856字
- **段落数**: 15段
- **建议时长**: 45秒
- **建议图片数**: 5张

## 生成的文件

### 内容文件
- \`content/original.md\` - 原始内容
- \`content/processed.md\` - 处理后的内容（含平台优化）
- \`content/metadata.json\` - 内容元数据

### 图片文件
- \`images/cover.webp\` - 封面图
- \`images/illustration-1.webp\` - 插图1
- \`images/illustration-2.webp\` - 插图2
- \`images/infographic.webp\` - 信息图

### HTML文件
- \`html/article-summary.html\` - 响应式HTML页面

### 视频文件
- \`video/xhs-video.mp4\` - 小红书优化视频
- \`video/wechat-video.mp4\` - 视频号优化视频
- \`video/landscape-video.mp4\` - 横屏视频

## 平台优化建议

### 小红书
- **标题**: 🔥 AI医疗革命：诊断精度提升90%
- **时长**: 45秒
- **风格**: 高饱和度，明亮色彩
- **标签**: #人工智能 #医疗科技 #医学影像 #AI医疗

### 视频号
- **标题**: 【科技前沿】人工智能如何改变医疗行业
- **时长**: 45秒
- **要求**: 清晰可读，字体稍大
- **标签**: 人工智能, 医疗, 科技, 创新

## 使用的技能
1. **内容处理**: baoyu-url-to-markdown / web_search
2. **图片生成**: baoyu-cover-image, baoyu-article-illustrator, baoyu-infographic
3. **文案优化**: baoyu-format-markdown
4. **HTML构建**: Tailwind CSS + 国内CDN
5. **视频生成**: Remotion + 自定义主题

## 性能统计
- **处理时间**: 约10秒（模拟）
- **文件大小**: 约15MB（估算）
- **兼容性**: 移动端优先，多端适配

## 下一步建议
1. 查看生成的HTML页面
2. 根据需要调整内容
3. 使用真实数据替换示例内容
4. 配置宝玉技能API密钥

---

*本报告由 Video Creator 技能自动生成*`;

  await fs.writeFile(path.join(outputDir, 'report.md'), report);
}

// 列出文件
async function listFiles(dir) {
  const files = [];
  
  async function scan(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        await scan(fullPath);
      } else {
        files.push(fullPath);
      }
    }
  }
  
  await scan(dir);
  return files.sort();
}

// 运行示例
if (require.main === module) {
  runDemo().catch(console.error);
}

module.exports = { runDemo };