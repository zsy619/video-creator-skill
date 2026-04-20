#!/usr/bin/env python3
"""
session-log-append.py — 追加 session 数据到项目 session-log.md

支持两种模式：
  1. snapshot 模式（默认）：记录累计快照，手动标注步骤
  2. delta 模式：自动计算与上一次快照的差值

用法:
  # snapshot 模式（记录累计值）
  python3 session-log-append.py <project_dir> <task_desc> --snapshot "🧮 Tokens: 100k in / 5k out ..."

  # delta 模式（自动计算差值，需要先有上一次快照）
  python3 session-log-append.py <project_dir> <task_desc> --delta "🧮 Tokens: 150k in / 8k out ..."

  # 只初始化文件
  python3 session-log-append.py <project_dir> --init
"""

import sys
import re
import os
import json
from datetime import datetime
from pathlib import Path

LOG_TABLE_HEADER = """| # | 时间 | 任务 | 模型 | 输入token | 输出token | 总token | 费用 | Context |
|---|------|------|------|----------|----------|---------|------|---------|"""

def parse_emoji_status(status_text: str) -> dict:
    """解析 session_status 工具输出的 emoji 格式文本"""
    result = {
        "model": "minimax/MiniMax-M2.7",
        "tokens_in": 0,
        "tokens_out": 0,
        "total_tokens": 0,
        "cost": "$0.00",
        "context_used": 0,
        "context_limit": 0,
        "cache_hit": "0%",
        "compactions": 0,
        "raw": status_text.strip(),
    }

    def expand(s: str) -> int:
        s = s.lower().strip().replace(',', '')
        if s.endswith('k'):
            return int(float(s[:-1]) * 1000)
        elif s.endswith('m'):
            return int(float(s[:-1]) * 1000_000)
        try:
            return int(float(s))
        except:
            return 0

    m = re.search(r'🧮\s*Tokens:\s*([\dkm.,]+)\s*in\s*/\s*([\dkm.,]+)\s*out', status_text)
    if m:
        result["tokens_in"] = expand(m.group(1))
        result["tokens_out"] = expand(m.group(2))
        result["total_tokens"] = result["tokens_in"] + result["tokens_out"]

    m = re.search(r'💵\s*Cost:\s*(\$[\d.]+)', status_text)
    if m:
        result["cost"] = m.group(1)

    m = re.search(r'📚\s*Context:\s*([\dkm.,]+)\s*/\s*([\dkm.,]+)', status_text)
    if m:
        result["context_used"] = expand(m.group(1))
        result["context_limit"] = expand(m.group(2))

    m = re.search(r'🗄️\s*Cache:\s*([\d%]+)\s*hit', status_text)
    if m:
        result["cache_hit"] = m.group(1)

    m = re.search(r'🧹\s*Compactions:\s*(\d+)', status_text)
    if m:
        result["compactions"] = int(m.group(1))

    m = re.search(r'🧠\s*Model:\s*([^\s·]+)', status_text)
    if m:
        result["model"] = m.group(1).strip()

    return result


def format_token(n: int) -> str:
    """格式化 token 数为可读字符串"""
    if n >= 1_000_000:
        return f"{n/1_000_000:.1f}M"
    elif n >= 1000:
        return f"{n/1000:.0f}k"
    return str(n)


def get_log_path(project_dir: str) -> str:
    """获取 session-log.md 路径"""
    return os.path.join(project_dir, "docs", "session-log.md")


def get_snapshot_cache_path(project_dir: str) -> str:
    """获取快照缓存路径（存储上一次快照数据）"""
    return os.path.join(project_dir, "docs", ".session-snapshot.json")


def load_last_snapshot(project_dir: str) -> dict | None:
    """加载上一次快照"""
    path = get_snapshot_cache_path(project_dir)
    if os.path.exists(path):
        try:
            with open(path) as f:
                return json.load(f)
        except:
            pass
    return None


def save_snapshot(project_dir: str, snapshot: dict):
    """保存当前快照到缓存"""
    path = get_snapshot_cache_path(project_dir)
    with open(path, 'w') as f:
        json.dump(snapshot, f, indent=2)


def init_session_log(project_dir: str, project_name: str):
    """初始化 session-log.md 文件"""
    log_path = get_log_path(project_dir)
    os.makedirs(os.path.dirname(log_path), exist_ok=True)

    if os.path.exists(log_path):
        print(f"⚠️  session-log.md 已存在: {log_path}")
        return

    start_time = datetime.now().strftime("%Y-%m-%d %H:%M %Z")
    content = f"""# Session Log - {project_name}

## 项目信息
- **项目名称**: {project_name}
- **开始时间**: {start_time}
- **状态**: 进行中

## 模型配置
- **默认模型**: minimax/MiniMax-M2.7
- **Token 追踪**: session_status 工具（session 级别累计，emoji 格式输出）

## 请求记录

{LOG_TABLE_HEADER}

## Snapshot 说明
> `session_status` 返回的是 session 累计值。\n> 每次调用 session_status 后立即记录（snapshot），结束后用相邻快照差值估算各步骤消耗。\n> 快照数据保存在 `docs/.session-snapshot.json`。

"""
    with open(log_path, 'w') as f:
        f.write(content)

    # 初始化空快照
    save_snapshot(project_dir, {
        "tokens_in": 0, "tokens_out": 0, "total_tokens": 0,
        "cost": "$0.00", "context_used": 0, "context_limit": 0
    })

    print(f"✅ session-log.md 已初始化: {log_path}")


def append_log(project_dir: str, task_desc: str, status: dict,
               is_snapshot: bool = True,
               compute_delta: bool = False) -> int:
    """追加一行到 session-log.md"""
    log_path = get_log_path(project_dir)

    if not os.path.exists(log_path):
        project_name = os.path.basename(project_dir)
        init_session_log(project_dir, project_name)

    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S %Z")

    # 统计当前行数
    req_count = 1
    if os.path.exists(log_path):
        with open(log_path) as f:
            req_count = sum(1 for line in f if line.strip().startswith('|')) + 1

    # 累计值
    ti_fmt = format_token(status.get("tokens_in", 0))
    to_fmt = format_token(status.get("tokens_out", 0))
    tt_fmt = format_token(status.get("total_tokens", 0))
    ctx = f"{format_token(status.get('context_used', 0))}/{format_token(status.get('context_limit', 0))}"

    # 计算差值（如果 compute_delta 且有上一次快照）
    delta_info = ""
    if compute_delta:
        last = load_last_snapshot(project_dir)
        if last:
            d_in = status.get("tokens_in", 0) - last.get("tokens_in", 0)
            d_out = status.get("tokens_out", 0) - last.get("tokens_out", 0)
            d_tt = status.get("total_tokens", 0) - last.get("total_tokens", 0)
            delta_info = f"  [Δ {format_token(d_in)} in / {format_token(d_out)} out / {format_token(d_tt)} total]"

    # Snapshot 标注
    snapshot_tag = "📸 Snapshot" if is_snapshot else ""

    row = (
        f"| {req_count:02d} | {ts} | {task_desc} | "
        f"{status.get('model', 'minimax/MiniMax-M2.7')} | "
        f"{ti_fmt}(cum) | {to_fmt}(cum) | "
        f"{tt_fmt} | {status.get('cost', '$0')} | "
        f"ctx:{ctx} |{delta_info} {snapshot_tag}"
    )

    with open(log_path, "a") as f:
        f.write(row + "\n")

    # 保存当前快照
    if is_snapshot:
        save_snapshot(project_dir, {
            "tokens_in": status.get("tokens_in", 0),
            "tokens_out": status.get("tokens_out", 0),
            "total_tokens": status.get("total_tokens", 0),
            "cost": status.get("cost", "$0.00"),
            "context_used": status.get("context_used", 0),
            "context_limit": status.get("context_limit", 0),
        })

    print(f"✅ 追加 #{req_count}: {task_desc}")
    if delta_info:
        print(f"   {delta_info.strip()}")
    return req_count


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    project_dir = sys.argv[1]

    if "--init" in sys.argv:
        project_name = os.path.basename(project_dir.rstrip('/'))
        init_session_log(project_dir, project_name)
        sys.exit(0)

    if len(sys.argv) < 3:
        print("用法:")
        print("  session-log-append.py <project_dir> <task_desc> [--snapshot \"emoji\"] [--delta]")
        print("  session-log-append.py <project_dir> --init")
        sys.exit(1)

    task_desc = sys.argv[2]

    # 解析 emoji status
    status_text = ""
    compute_delta = "--delta" in sys.argv
    is_snapshot = "--snapshot" in sys.argv or "--delta" in sys.argv or "--snap" in sys.argv

    for arg in sys.argv[3:]:
        if not arg.startswith("--"):
            status_text += " " + arg

    status_text = status_text.strip()

    if status_text:
        status = parse_emoji_status(status_text)
    else:
        # 无 emoji 输入时，创建空状态
        status = {
            "model": "minimax/MiniMax-M2.7",
            "tokens_in": 0, "tokens_out": 0, "total_tokens": 0,
            "cost": "$0.00", "context_used": 0, "context_limit": 0,
        }

    append_log(project_dir, task_desc, status,
               is_snapshot=is_snapshot,
               compute_delta=compute_delta)
