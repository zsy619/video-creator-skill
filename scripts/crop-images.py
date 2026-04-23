#!/usr/bin/env python3
"""
图片自动裁剪脚本 - 将任意比例图片裁剪适配9:16竖屏视频

用法:
    python3 crop-images.py --input docs/assets/imgs/ --output docs/assets/illustrations/ --target-size 1080x1920

功能:
    1. 读取输入目录所有图片
    2. 根据目标比例自动裁剪/缩放
    3. 保持主体内容居中
    4. 输出到目标目录
"""

import os
import sys
import argparse
from pathlib import Path
from PIL import Image
import re


def parse_size(size_str):
    """解析 WxH 格式的尺寸字符串"""
    match = re.match(r'(\d+)x(\d+)', size_str)
    if match:
        return int(match.group(1)), int(match.group(2))
    raise ValueError(f"Invalid size format: {size_str}")


def get_center_crop_box(img_width, img_height, target_width, target_height):
    """
    计算居中裁剪区域
    优先裁剪宽度（横版图片），保持主体居中
    """
    img_aspect = img_width / img_height
    target_aspect = target_width / target_height

    if img_aspect > target_aspect:
        # 横版图片：宽度更大，需要裁剪宽度
        new_width = int(img_height * target_aspect)
        offset_x = (img_width - new_width) // 2
        return (offset_x, 0, offset_x + new_width, img_height)
    else:
        # 竖版图片：高度更大，需要裁剪高度
        new_height = int(img_width / target_aspect)
        offset_y = (img_height - new_height) // 2
        return (0, offset_y, img_width, offset_y + new_height)


def smart_resize_and_crop(img, target_width, target_height, mode='center-crop'):
    """
    智能裁剪和缩放图片
    
    Args:
        img: PIL Image 对象
        target_width: 目标宽度
        target_height: 目标高度
        mode: 'center-crop' 居中裁剪 或 'smart' 智能缩放
    """
    img_width, img_height = img.size
    img_aspect = img_width / img_height
    target_aspect = target_width / target_height

    if mode == 'center-crop':
        # 居中裁剪
        crop_box = get_center_crop_box(img_width, img_height, target_width, target_height)
        cropped = img.crop(crop_box)
        
        # 缩放到目标尺寸
        result = cropped.resize((target_width, target_height), Image.Resampling.LANCZOS)
        return result
    
    elif mode == 'smart':
        # 智能缩放：先缩放，让短边匹配目标，然后居中裁剪长边
        scale = max(target_width / img_width, target_height / img_height)
        new_width = int(img_width * scale)
        new_height = int(img_height * scale)
        
        resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # 居中裁剪到目标尺寸
        crop_box = get_center_crop_box(new_width, new_height, target_width, target_height)
        result = resized.crop(crop_box)
        return result
    
    else:
        raise ValueError(f"Unknown mode: {mode}")


def process_images(input_dir, output_dir, target_size, mode='center-crop', prefix='illustration'):
    """
    处理目录中的所有图片
    
    Args:
        input_dir: 输入目录路径
        output_dir: 输出目录路径
        target_size: 目标尺寸 (width, height)
        mode: 裁剪模式
        prefix: 输出文件前缀
    """
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    
    # 创建输出目录
    output_path.mkdir(parents=True, exist_ok=True)
    
    # 支持的图片格式
    image_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif'}
    
    # 查找所有图片
    image_files = []
    for ext in image_extensions:
        image_files.extend(input_path.glob(f'*{ext}'))
        image_files.extend(input_path.glob(f'*{ext.upper()}'))
    
    if not image_files:
        print(f"⚠️  在 {input_dir} 中未找到图片文件")
        return []
    
    print(f"📷 找到 {len(image_files)} 张图片待处理")
    
    results = []
    target_width, target_height = target_size
    
    for idx, img_path in enumerate(sorted(image_files), start=1):
        try:
            with Image.open(img_path) as img:
                # 转换为 RGB（处理 RGBA 或灰度图）
                if img.mode in ('RGBA', 'P'):
                    img = img.convert('RGB')
                elif img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # 裁剪
                processed = smart_resize_and_crop(img, target_width, target_height, mode)
                
                # 生成输出文件名
                output_file = output_path / f"{prefix}-{idx:02d}.jpg"
                
                # 保存（质量85%）
                processed.save(output_file, 'JPEG', quality=85, optimize=True)
                
                results.append({
                    'input': str(img_path),
                    'output': str(output_file),
                    'size': processed.size
                })
                print(f"  ✅ [{idx:02d}] {img_path.name} → {output_file.name} ({target_width}x{target_height})")
        
        except Exception as e:
            print(f"  ❌ [{idx:02d}] 处理失败 {img_path.name}: {e}")
            continue
    
    return results


def main():
    parser = argparse.ArgumentParser(
        description='自动裁剪图片适配9:16竖屏视频',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
示例:
    python3 crop-images.py --input imgs/ --output illustrations/
    python3 crop-images.py --input imgs/ --output illustrations/ --target-size 1080x1920
    python3 crop-images.py --input imgs/ --output illustrations/ --mode smart --prefix scene
        '''
    )
    
    parser.add_argument('--input', '-i', required=True,
                        help='输入图片目录路径')
    parser.add_argument('--output', '-o', required=True,
                        help='输出图片目录路径')
    parser.add_argument('--target-size', '-s', default='1080x1920',
                        help='目标尺寸，格式 WxH（默认: 1080x1920）')
    parser.add_argument('--mode', '-m', default='center-crop', choices=['center-crop', 'smart'],
                        help='裁剪模式: center-crop 居中裁剪, smart 智能缩放（默认: center-crop）')
    parser.add_argument('--prefix', '-p', default='illustration',
                        help='输出文件名前缀（默认: illustration）')
    
    args = parser.parse_args()
    
    # 解析目标尺寸
    try:
        target_size = parse_size(args.target_size)
        print(f"📐 目标尺寸: {target_size[0]}x{target_size[1]}（{target_size[0]/target_size[1]:.2f}:1 比例）")
    except ValueError as e:
        print(f"❌ {e}")
        sys.exit(1)
    
    # 检查输入目录
    if not os.path.isdir(args.input):
        print(f"❌ 输入目录不存在: {args.input}")
        sys.exit(1)
    
    # 处理图片
    print(f"\n🔄 开始处理图片...")
    print(f"   输入目录: {args.input}")
    print(f"   输出目录: {args.output}")
    print(f"   裁剪模式: {args.mode}")
    print()
    
    results = process_images(
        args.input,
        args.output,
        target_size,
        args.mode,
        args.prefix
    )
    
    # 总结
    print(f"\n✅ 处理完成: {len(results)}/{len(results) if 'image_files' in dir() else '?'} 张图片")
    
    if results:
        print(f"\n📁 输出文件位置: {args.output}")
        print(f"   命名格式: {args.prefix}-01.jpg, {args.prefix}-02.jpg, ...")


if __name__ == '__main__':
    main()
