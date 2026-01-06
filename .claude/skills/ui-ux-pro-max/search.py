import sys
import json
import os

# 模拟数据库：这里包含了 Pro Max Skill 的核心设计数据
DATABASE = {
    "styles": {
        "modern_saas": {
            "name": "Modern SaaS",
            "description": "Clean, professional interface for software products.",
            "keywords": ["saas", "dashboard", "admin", "software"],
            "rules": [
                "Use 'Inter' font for high readability.",
                "Primary color: Indigo-600 (#4F46E5) or Blue-600 (#2563EB).",
                "Background: White cards on Slate-50 background.",
                "Borders: Thin, subtle borders (slate-200).",
                "Shadows: Soft, diffuse shadows (shadow-sm, shadow-md)."
            ]
        },
        "educational": {
            "name": "Educational Platform",
            "description": "Engaging, friendly, and clear interface for learning.",
            "keywords": ["education", "learning", "school", "course", "study"],
            "rules": [
                "Use rounded corners (rounded-2xl) for a friendly feel.",
                "Primary: Violet/Indigo for creativity, Green for success.",
                "Typography: Headings should be bold and welcoming.",
                "Cards: Use card layouts heavily for courses/books.",
                "Icons: Use playful but clear icons (Lucide)."
            ]
        }
    },
    "palettes": {
        "indigo_delight": ["#eef2ff", "#e0e7ff", "#6366f1", "#4338ca"],
        "slate_clean": ["#f8fafc", "#e2e8f0", "#64748b", "#0f172a"]
    }
}

def search(query):
    query = query.lower()
    results = []
    
    # 简单的关键词匹配
    for key, style in DATABASE["styles"].items():
        if any(k in query for k in style["keywords"]) or key in query:
            results.append(style)
            
    # 如果没找到，默认返回 SaaS 风格
    if not results:
        results.append(DATABASE["styles"]["modern_saas"])
        
    return results

if __name__ == "__main__":
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
        results = search(query)
        print(json.dumps(results, indent=2))
    else:
        print("[]")
