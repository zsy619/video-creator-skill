#!/usr/bin/env python3
"""检测所有项目的封面图是否完整且尺寸正确。"""
import os
import sys
from PIL import Image

COVER_SPECS = [
    ('cover.png',       1080, 1920),   # 视频号
    ('cover-wechat.png',  900,  383),  # 公众号
    ('cover-xhs.png',   1440, 2560),   # 小红书
]

def check_project(proj_dir):
    assets = os.path.join(proj_dir, 'docs', 'assets')
    if not os.path.isdir(assets):
        return []
    results = []
    for fname, expected_w, expected_h in COVER_SPECS:
        path = os.path.join(assets, fname)
        if not os.path.exists(path):
            results.append(('MISSING', proj_dir, fname))
        else:
            try:
                img = Image.open(path)
                if img.size != (expected_w, expected_h):
                    results.append(('SIZE_ERR', proj_dir, fname, img.size))
                else:
                    results.append(('OK', proj_dir, fname))
            except Exception as e:
                results.append(('READ_ERR', proj_dir, fname, str(e)))
    return results

if __name__ == '__main__':
    workspace = sys.argv[1] if len(sys.argv) > 1 else '.'
    all_results = []
    for entry in sorted(os.listdir(workspace)):
        proj_dir = os.path.join(workspace, entry)
        if not os.path.isdir(proj_dir):
            continue
        all_results.extend(check_project(proj_dir))

    for r in all_results:
        print(' '.join(str(x) for x in r))