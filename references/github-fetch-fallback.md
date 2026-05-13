# GitHub 内容获取降级流程

> 当 baoyu-url-to-markdown、curl/wget、浏览器导航全部失败时使用。
> 实测故障：2026-05-13，用户 `zsy619`，SSL_ERROR_SYSCALL 阻断所有 HTTPS 访问。

## 诊断顺序（依次尝试）

### 1. 检查 GitHub HTTPS 是否可访问

```bash
curl -sSL --max-time 10 https://github.com -o /dev/null -w "%{http_code}"
```

- `000` = 网络层失败（SSL_ERROR_SYSCALL）
- `200` = 正常

### 2. 尝试 gh CLI（无需 HTTPS）

```bash
gh repo view <owner>/<repo> --json name,description,url,primaryLanguage,topics
```

- 需要 `gh auth login`
- 输出 JSON 或报错 "not authenticated"

### 3. 尝试 git:// 协议（不经过 HTTPS）

```bash
git ls-remote git://github.com/<owner>/<repo>.git
```

- git:// 不走 TLS，适合 HTTPS 被阻断的场景
- "could not read from remote repository" = 仓库不存在或无公网

### 4. 尝试 git clone

```bash
git clone --depth=1 https://github.com/<owner>/<repo>.git /tmp/<repo>
```

- SSL_ERROR_SYSCALL = HTTPS 整个被阻断

### 5. 检查系统代理

```bash
networksetup -getwebproxy "Wi-Fi"
networksetup -getsecurewebproxy "Wi-Fi"
```

- "Enabled: No" = 代理关闭，即使端口在监听也不生效
- 尝试：`curl --proxy http://127.0.0.1:7897 https://github.com/...`

### 6. 尝试浏览器导航

```bash
browser_navigate https://github.com/<owner>/<repo>
```

- ERR_CONNECTION_CLOSED = 网络层阻断

### 7. 检查 bunx baoyu-url-to-markdown

```bash
bunx baoyu-url-to-markdown https://github.com/<owner>/<repo>
```

- 404 = 包在 npmmirror 不存在

---

## 降级协议

执行到第7步仍全部失败后，**停止所有重试**，向用户报告：

```
无法自动化获取 [repo] 的内容。原因：
- GitHub HTTPS: SSL_ERROR_SYSCALL（网络层阻断）
- gh CLI: 未认证或无权限
- git:// 协议: 仓库不存在或无公网访问
- 代理: 也不通
- baoyu-url-to-markdown: 404（包不存在）

请手动提供：
1. 项目的 README 内容（直接粘贴）
2. 或项目介绍/功能描述
3. 或将内容写入 ~/VideoProjects/<project>/docs/article.md
```

**规则**：不允许继续尝试其他无效方法。

---

## 已知故障模式（2026-05-13 实测）

| 故障现象 | 原因 | 解法 |
|----------|------|------|
| SSL_ERROR_SYSCALL + curl 000 | 网络层阻断，非代理问题 | 停止重试 |
| 代理 Enabled: No，端口 7897 | 代理未开启 | 用户启动代理 |
| git:// "could not read" | 仓库不存在或无 git:// 访问 | 停止重试 |
| bunx 404 npmmirror | 包名在镜像站不存在 | 停止重试 |

---

## 预防

- **代理用户**：检查 `~/.gitconfig` 中的 `url.https://...@github.com.insteadof` 配置，代理认证可能失效
- **记录到 memory**：GitHub 连接性问题是持续性环境问题，已记录但不影响下次会话的诊断顺序
