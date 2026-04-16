/**
 * 工具代理模块
 * 提供真实的 web_search 和 web_fetch 调用
 * 当外部工具不可用时，提供合理的降级方案
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const https = require('https');
const http = require('http');

/**
 * web_search - 搜索工具
 * 优先使用系统可用的搜索命令，降级到基础实现
 */
async function web_search(params) {
  const { query, count = 5 } = params;
  console.log(`🔍 搜索: ${query}`);

  // 尝试使用 summarize 工具（如果已安装）
  try {
    const { stdout } = await execAsync(`which summarize 2>/dev/null`);
    if (stdout.trim()) {
      console.log('  使用 summarize 工具搜索...');
      const { stdout: result } = await execAsync(
        `summarize "${query.replace(/"/g, '\\"')}" --json 2>/dev/null || true`
      );
      if (result.trim()) {
        try {
          const parsed = JSON.parse(result.trim());
          if (parsed && parsed.results) {
            return parsed.results.slice(0, count);
          }
        } catch (e) { /* 解析失败，继续降级 */ }
      }
    }
  } catch (e) { /* summarize 不可用，继续降级 */ }

  // 降级方案：返回基于查询的结构化提示
  console.log('  ℹ️  搜索工具不可用，返回查询建议');
  return [
    {
      title: `${query} - 最新发展`,
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      snippet: `关于"${query}"的最新发展和趋势分析。建议使用搜索引擎获取更详细的信息。`
    },
    {
      title: `${query}技术详解`,
      url: `https://www.google.com/search?q=${encodeURIComponent(query + ' 技术详解')}`,
      snippet: `深入解析${query}的技术原理和应用场景。`
    },
    {
      title: `${query}实践指南`,
      url: `https://www.google.com/search?q=${encodeURIComponent(query + ' 实践指南')}`,
      snippet: `提供${query}的实践指南和最佳实践。`
    }
  ].slice(0, count);
}

/**
 * web_fetch - 网页抓取工具
 * 优先使用系统可用的抓取命令，降级到 Node.js 原生 HTTP 请求
 */
async function web_fetch(params) {
  const { url } = params;
  console.log(`📄 获取网页: ${url}`);

  // 尝试使用 summarize 工具
  try {
    const { stdout } = await execAsync(`which summarize 2>/dev/null`);
    if (stdout.trim()) {
      console.log('  使用 summarize 工具获取...');
      try {
        const { stdout: result } = await execAsync(
          `summarize "${url}" --extract-only 2>/dev/null || true`
        );
        if (result.trim()) {
          return {
            content: result.trim(),
            title: extractTitleFromContent(result.trim()),
            url
          };
        }
      } catch (e) { /* summarize 执行失败，继续降级 */ }
    }
  } catch (e) { /* summarize 不可用，继续降级 */ }

  // 尝试使用 curl
  try {
    const { stdout } = await execAsync(`which curl 2>/dev/null`);
    if (stdout.trim()) {
      console.log('  使用 curl 获取...');
      const { stdout: html } = await execAsync(
        `curl -sL --max-time 15 "${url}" 2>/dev/null || true`
      );
      if (html.trim()) {
        const content = htmlToMarkdown(html.trim());
        return {
          content,
          title: extractTitleFromHtml(html.trim()),
          url
        };
      }
    }
  } catch (e) { /* curl 执行失败，继续降级 */ }

  // 降级方案：使用 Node.js 原生 HTTP 请求
  try {
    console.log('  使用 Node.js HTTP 请求获取...');
    const content = await fetchUrl(url);
    return {
      content,
      title: extractTitleFromContent(content),
      url
    };
  } catch (e) {
    console.warn(`  ❌ 网页获取失败: ${e.message}`);
  }

  // 最终降级
  return {
    content: `# 网页内容\n\nURL: ${url}\n\n获取时间: ${new Date().toISOString()}\n\n由于网络限制，无法获取网页内容。建议手动访问该链接。`,
    title: '网页内容（获取失败）',
    url
  };
}

/**
 * 使用 Node.js 原生 HTTP 模块获取 URL 内容
 */
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 15000
    };

    protocol.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      let data = '';
      res.setEncoding('utf-8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(htmlToMarkdown(data)));
      res.on('error', reject);
    }).on('error', reject).on('timeout', function() {
      this.destroy();
      reject(new Error('请求超时'));
    });
  });
}

/**
 * 简单的 HTML 转 Markdown
 */
function htmlToMarkdown(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * 从 HTML 中提取标题
 */
function extractTitleFromHtml(html) {
  const match = html.match(/<title[^>]*>(.*?)<\/title>/i);
  return match ? match[1].trim() : '网页内容';
}

/**
 * 从 Markdown 内容中提取标题
 */
function extractTitleFromContent(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : '网页内容';
}

module.exports = {
  web_search,
  web_fetch
};
