#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
任务4：创建可打印学习卡片
按主题生成可打印的学习材料（HTML格式，可转为PDF）
"""

import json
import sys
import os

# 设置标准输出编码
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


# ============== HTML 模板 ==============
FLASHCARD_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - 单词学习卡片</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: 'Arial', 'Microsoft YaHei', sans-serif;
            background: #f5f5f5;
            padding: 20px;
            line-height: 1.6;
        }}

        .header {{
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}

        .header h1 {{
            font-size: 32px;
            margin-bottom: 10px;
        }}

        .header p {{
            font-size: 16px;
            opacity: 0.9;
        }}

        .stats {{
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-top: 15px;
            flex-wrap: wrap;
        }}

        .stat-item {{
            background: rgba(255,255,255,0.2);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
        }}

        .cards-container {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}

        .flashcard {{
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
            page-break-inside: avoid;
        }}

        .flashcard:hover {{
            transform: translateY(-4px);
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }}

        .word {{
            font-size: 28px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 8px;
        }}

        .phonetic {{
            font-size: 16px;
            color: #888;
            margin-bottom: 12px;
            font-family: 'Lucida Sans Unicode', 'Arial Unicode MS', sans-serif;
        }}

        .meaning {{
            font-size: 15px;
            color: #333;
            margin-bottom: 12px;
            padding: 10px;
            background: #f8f9fa;
            border-left: 3px solid #667eea;
            border-radius: 4px;
        }}

        .meaning .label {{
            font-weight: bold;
            color: #667eea;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 4px;
        }}

        .example {{
            font-size: 14px;
            color: #555;
            padding: 10px;
            background: #fff9e6;
            border-left: 3px solid #ffc107;
            border-radius: 4px;
            margin-top: 8px;
        }}

        .example .en {{
            font-style: italic;
            margin-bottom: 4px;
        }}

        .example .cn {{
            color: #777;
            font-size: 13px;
        }}

        .tags {{
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 12px;
        }}

        .tag {{
            background: #e9ecef;
            color: #495057;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 500;
        }}

        .tag.level {{
            background: #d4edda;
            color: #155724;
        }}

        .tag.scene {{
            background: #cce5ff;
            color: #004085;
        }}

        @media print {{
            body {{
                background: white;
                padding: 0;
            }}

            .flashcard {{
                page-break-inside: avoid;
                box-shadow: none;
                border: 1px solid #ddd;
            }}

            .header {{
                page-break-after: always;
            }}
        }}

        @page {{
            margin: 1cm;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>{title}</h1>
        <p>{description}</p>
        <div class="stats">
            <div class="stat-item">📚 总词汇: {total_words}</div>
            <div class="stat-item">🎯 主题: {theme_name}</div>
            <div class="stat-item">📖 级别: {grade_level}</div>
        </div>
    </div>

    <div class="cards-container">
        {cards_html}
    </div>

    <script>
        // 简单的翻转效果（可选）
        document.querySelectorAll('.flashcard').forEach(card => {{
            card.addEventListener('click', function() {{
                this.classList.toggle('flipped');
            }});
        }});
    </script>
</body>
</html>
"""


def load_json_file(filepath):
    """加载 JSON 文件"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # 处理两种结构：有 meta 包装的和直接数组的
        if 'words' in data:
            return data['words'], data.get('meta', {})
        else:
            return data, {}
    except FileNotFoundError:
        print(f"  ✗ 文件未找到: {filepath}")
        return [], {}


def generate_card_html(word_entry):
    """生成单个卡片的 HTML"""

    word = word_entry.get('word', '')
    phonetic_us = word_entry.get('phonetic', {}).get('us', '')
    phonetic_uk = word_entry.get('phonetic', {}).get('uk', '')

    # 构建音标显示
    phonetic_display = ''
    if phonetic_us:
        phonetic_display = f"US: {phonetic_us}"
    if phonetic_uk and phonetic_uk != phonetic_us:
        if phonetic_display:
            phonetic_display += f" | UK: {phonetic_uk}"
        else:
            phonetic_display = f"UK: {phonetic_uk}"

    # 获取定义和例句
    meanings_html = ''
    if 'definitions' in word_entry and word_entry['definitions']:
        for defn in word_entry['definitions'][:1]:  # 只显示第一个定义
            meaning_cn = defn.get('meaning_cn', '')
            meaning_en = defn.get('meaning_en', '')

            # 获取例句
            example_html = ''
            if 'examples' in defn and defn['examples']:
                example = defn['examples'][0]
                sentence_en = example.get('sentence_en', '')
                sentence_cn = example.get('sentence_cn', '')

                if sentence_en:
                    example_html = f'''
                    <div class="example">
                        <div class="en">"{sentence_en}"</div>
                        {f'<div class="cn">{sentence_cn}</div>' if sentence_cn else ''}
                    </div>
                    '''

            # 构建释义 HTML
            meaning_display = ''
            if meaning_cn:
                meaning_display = meaning_cn
            if meaning_en and meaning_en != meaning_display:
                if meaning_display:
                    meaning_display += f"<br><small>{meaning_en}</small>"
                else:
                    meaning_display = meaning_en

            if meaning_display:
                meanings_html = f'''
                <div class="meaning">
                    <div class="label">释义</div>
                    {meaning_display}
                    {example_html}
                </div>
                '''

    # 获取标签
    tags_html = ''
    metadata = word_entry.get('metadata', {})

    tags = []
    level = metadata.get('level', metadata.get('grade_level', ''))
    if level:
        tags.append(('level', level))

    scene_tags = metadata.get('scene_tags', [])
    for scene in scene_tags[:3]:  # 最多显示3个场景标签
        tags.append(('scene', scene.replace('_', ' ').title()))

    word_type = metadata.get('word_type', '')
    if word_type:
        tags.append(('tag', word_type.replace('_', ' ').title()))

    if tags:
        tags_html = '<div class="tags">'
        for tag_type, tag_text in tags:
            tags_html += f'<span class="tag {tag_type}">{tag_text}</span>'
        tags_html += '</div>'

    # 组装完整卡片
    card_html = f'''
    <div class="flashcard">
        <div class="word">{word}</div>
        {f'<div class="phonetic">[{phonetic_display}]</div>' if phonetic_display else ''}
        {meanings_html}
        {tags_html}
    </div>
    '''

    return card_html


def create_theme_flashcards(input_file, output_file, theme_name, scene_filter=None):
    """为主题创建闪卡"""

    print(f"[创建] {theme_name} 学习卡片...")

    # 加载数据
    words, meta = load_json_file(input_file)

    if not words:
        print(f"  ✗ 没有找到词汇数据")
        return

    # 过滤场景（如果指定）
    if scene_filter:
        filtered_words = []
        for word_entry in words:
            scene_tags = word_entry.get('metadata', {}).get('scene_tags', [])
            if scene_filter in scene_tags:
                filtered_words.append(word_entry)
        words = filtered_words

    # 限制每个主题最多100个词（避免文件过大）
    if len(words) > 100:
        words = words[:100]
        print(f"  ⚠ 限制为前100个词（可调整）")

    # 生成卡片 HTML
    cards_html = ''
    for word_entry in words:
        cards_html += generate_card_html(word_entry)

    # 元数据
    title = meta.get('title', f'{theme_name} 词汇卡片')
    description = meta.get('description', f'{theme_name} 单词学习闪卡')
    grade_level = meta.get('target_audience', meta.get('level', '通用'))

    # 填充模板
    html_content = FLASHCARD_TEMPLATE.format(
        title=title,
        description=description,
        theme_name=theme_name,
        grade_level=grade_level,
        total_words=len(words),
        cards_html=cards_html
    )

    # 保存
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"  ✓ 生成卡片: {len(words)} 个")
    print(f"  → 已保存到: {output_file}")
    print()


def main():
    """主函数"""
    print("="*80)
    print("任务4：创建可打印学习卡片（按主题）")
    print("="*80)
    print()

    # 创建输出目录
    output_dir = 'src/assets/flashcards'
    os.makedirs(output_dir, exist_ok=True)

    # 1. 创建 K-3 基础词卡片
    print("[1/5] 创建 K-3 基础词汇卡片")
    print("-" * 80)

    create_theme_flashcards(
        'src/assets/data/us_k12_foundation.json',
        f'{output_dir}/k3_foundation.html',
        'K-3 基础词汇'
    )

    # 2. 创建母语者核心词卡片
    print("[2/5] 创建母语者核心词汇卡片")
    print("-" * 80)

    create_theme_flashcards(
        'src/assets/scenarios/native_speaker_core_with_scenes.json',
        f'{output_dir}/native_speaker_core.html',
        '母语者核心词'
    )

    # 3. 创建家庭场景卡片
    print("[3/5] 创建家庭场景卡片")
    print("-" * 80)

    create_theme_flashcards(
        'src/assets/scenarios/native_speaker_core_with_scenes.json',
        f'{output_dir}/scene_home_family.html',
        '家庭场景',
        scene_filter='home_family'
    )

    # 4. 创建学校场景卡片
    print("[4/5] 创建学校场景卡片")
    print("-" * 80)

    create_theme_flashcards(
        'src/assets/scenarios/native_speaker_core_with_scenes.json',
        f'{output_dir}/scene_school.html',
        '学校场景',
        scene_filter='school'
    )

    # 5. 创建 Grade 4-6 词汇卡片
    print("[5/5] 创建 Grade 4-6 词汇卡片")
    print("-" * 80)

    create_theme_flashcards(
        'src/assets/scenarios/grade_4_6_vocabulary.json',
        f'{output_dir}/grade_4_6_vocabulary.html',
        'Grade 4-6 词汇'
    )

    # 完成
    print("="*80)
    print("完成")
    print("="*80)
    print(f"输出目录: {output_dir}")
    print()
    print("📄 使用说明：")
    print("  1. 在浏览器中打开 HTML 文件")
    print("  2. 使用 Ctrl+P (Windows) 或 Cmd+P (Mac) 打印")
    print("  3. 选择'保存为 PDF'或直接打印")
    print("  4. 建议纸张尺寸: A4 或 Letter")
    print("="*80)


if __name__ == "__main__":
    main()
