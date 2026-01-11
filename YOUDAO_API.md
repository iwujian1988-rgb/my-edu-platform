# 有道词典API使用文档

## 📡 API地址

```
https://dict.youdao.com/jsonapi?q={单词}
```

## 🔧 请求方式

```javascript
const response = await fetch(
  `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}`,
  {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; EducationalApp/1.0)'
    }
  }
)
```

## 📊 返回数据结构

```json
{
  "simple": {
    "word": [
      {
        "ukphone": "/ɪˈlekt/",          // 英式音标
        "usphone": "/ɪˈlekt/",          // 美式音标
        "ukspeech": "UK发音URL",
        "usspeech": "US发音URL"
      }
    ]
  },
  "ec": {
    "word": [
      {
        "trs": [
          {
            "tr": [
              {
                "l": {
                  "i": [
                    {
                      "d": "v. 选择；挑选；选举"
                    }
                  ]
                }
              }
            ]
          }
        ]
      }
    ]
  },
  "ee": {
    "word": [
      {
        "trs": [
          {
            "tr": [
              {
                "l": {
                  "i": "to choose someone or something"
                }
              }
            ]
          }
        ]
      }
    ]
  },
  "blng_sents_part": {
    "sentence-pair": [
      {
        "sentence": "Please select a file.",
        "sentence-translation": "请选择一个文件。"
      }
    ]
  },
  "phrs": {
    "phrs": [
      {
        "phr": {
          "headword": {
            "l": {
              "i": "elect"
            }
          }
        },
        "trs": [
          {
            "tr": [
              {
                "l": {
                  "i": "re-elect"
                }
              }
            ]
          }
        ]
      }
    ]
  },
  "syno": {
    "synos": [
      {
        "pos": "verb",
        "syno": [
          {
            "w": {
              "d": "choose"
            }
          }
        ]
      }
    ]
  }
}
```

## 🎯 字段映射表

| 有道字段 | 数据库字段 | 提取路径 | 示例 |
|---------|-----------|----------|------|
| 英式音标 | `uk_phonetic` | `simple.word[0].ukphone` | `"/ɪˈlekt/"` |
| 美式音标 | `us_phonetic` | `simple.word[0].usphone` | `"/ɪˈlekt/"` |
| 中文释义 | `definition` | `ec.word[0].trs[0].tr[0].l.i[0].d` | `"v. 选择；挑选；选举"` |
| 英文释义 | `definition_en` | `ee.word[0].trs[0].tr[0].l.i` | `"to choose someone or something"` |
| 中文例句 | `example_sentence` | `blng_sents_part['sentence-pair'][0]['sentence-translation']` | `"请选择一个文件。"` |
| 英文例句 | `example_sentence_en` | `blng_sents_part['sentence-pair'][0].sentence` | `"Please select a file."` |
| 英文搭配 | `collocation_en` | `phrs.phrs[0].phr.headword.l.i` | `"elect"` |
| 中文搭配 | `collocation` | `phrs.phrs[0].trs[0].tr[0].l.i` | `"重选"` |
| 词性 | `part_of_speech` | `syno.synos[0].pos` | `"verb"` |

## 💻 完整代码示例

```javascript
async function fetchWordFromYoudao(word) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5秒超时

    const response = await fetch(
      `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; EducationalApp/1.0)'
        }
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`API返回${response.status}`)
    }

    const data = await response.json()

    // 提取数据
    const simple = data.simple?.word?.[0]
    const ec = data.ec?.word?.[0]
    const ee = data.ee?.word?.[0]
    const blng = data.blng_sents_part?.['sentence-pair']?.[0]
    const phrs = data.phrs?.phrs?.[0]
    const syno = data.syno?.synos?.[0]

    return {
      word: word,
      uk_phonetic: simple?.ukphone || '',
      us_phonetic: simple?.usphone || '',
      definition: ec?.trs?.[0]?.tr?.[0]?.l?.i?.[0]?.d || '',
      definition_en: ee?.trs?.[0]?.tr?.[0]?.l?.i || '',
      example_sentence: blng?.['sentence-translation'] || '',
      example_sentence_en: blng?.['sentence-eng'] || blng?.sentence || '',
      collocation_en: phrs?.phr?.headword?.l?.i || '',
      collocation: phrs?.trs?.[0]?.tr?.[0]?.l?.i || '',
      part_of_speech: syno?.pos || ''
    }
  } catch (error) {
    console.error(`获取单词"${word}"失败:`, error.message)
    return null
  }
}
```

## ⚠️ 使用限制

1. **无需API Key** - 有道词典API可以直接调用
2. **建议并发控制** - 最多10个并发请求
3. **建议超时控制** - 设置5秒超时
4. **建议User-Agent** - 避免被识别为脚本
5. **每日限额** - 建议限制每日调用次数（如1000次）

## 🔍 测试

```bash
# 测试查询单词 "elect"
curl "https://dict.youdao.com/jsonapi?q=elect"
```

## 📝 响应示例

```json
{
  "returnPhrase": {
    "l": "elect"
  },
  "errorCode": "0",
  "query": "elect",
  "simple": {
    "word": [{
      "ukphone": "ɪˈlekt",
      "usphone": "ɪˈlekt"
    }]
  },
  "ec": {
    "word": [{
      "trs": [{
        "tr": [{
          "l": {
            "i": [{
              "d": "v. 选择；挑选；选举"
            }]
          }
        }]
      }]
    }]
  }
}
```
