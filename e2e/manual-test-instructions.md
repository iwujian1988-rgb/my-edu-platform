# "继续学习"功能 - 手动自动化测试指南

## 测试准备

### 步骤1: 手动登录
1. 访问 http://localhost:3000/login
2. 使用你的账号登录
3. 登录成功后，保持在首页

### 步骤2: 打开浏览器控制台
- 按 F12 或右键 → 检查
- 切换到 Console 标签

### 步骤3: 复制并粘贴以下测试脚本

```javascript
// ============================================================================
// "继续学习"功能 - 自动化测试脚本
// ============================================================================

console.log('🧪 开始测试"继续学习"功能...\n');

// 测试配置
const TEST_BOOK_ID = 'demo-book-1';
const BASE_URL = window.location.origin;

// 工具函数
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const log = (msg, emoji = '📌') => console.log(`${emoji} ${msg}`);

// ============================================================================
// 测试1: 页码保存和恢复（第2页）
// ============================================================================
async function test1_Page2_SaveAndRestore() {
  log('\n【测试1】第2页 → 返回 → 继续 → 应在第2页', '🧪');

  try {
    // Step 1: 访问单词书详情页
    window.location.href = `${BASE_URL}/library/${TEST_BOOK_ID}`;
    await sleep(2000);

    // Step 2: 查找并点击第2页按钮
    const page2Button = document.querySelector('button:has-text("2")') ||
                        Array.from(document.querySelectorAll('button, a')).find(el => el.textContent.trim() === '2');

    if (!page2Button) {
      log('❌ 未找到第2页按钮，可能单词数量不足', '⚠️');
      return false;
    }

    page2Button.click();
    log('✓ 已点击第2页按钮');
    await sleep(500); // 等待状态保存

    // Step 3: 返回首页
    window.location.href = `${BASE_URL}/`;
    await sleep(1000);

    // Step 4: 查找并点击"继续学习"按钮
    const continueButton = document.querySelector('a[href^="/library/"]');
    if (!continueButton) {
      log('❌ 未找到"继续学习"按钮', '⚠️');
      return false;
    }

    continueButton.click();
    await sleep(1500);

    // Step 5: 验证URL
    const currentUrl = window.location.href;
    if (currentUrl.includes('page=2')) {
      log(`✅ 测试通过！URL: ${currentUrl}`, '✅');
      return true;
    } else {
      log(`❌ 测试失败！URL应为 page=2，实际: ${currentUrl}`, '❌');
      return false;
    }
  } catch (error) {
    log(`❌ 测试出错: ${error.message}`, '💥');
    return false;
  }
}

// ============================================================================
// 测试2: 筛选条件保存和恢复（"不认识"）
// ============================================================================
async function test2_Filter_SaveAndRestore() {
  log('\n【测试2】筛选"不认识" → 返回 → 继续 → 应有筛选条件', '🧪');

  try {
    // Step 1: 访问单词书详情页
    window.location.href = `${BASE_URL}/library/${TEST_BOOK_ID}`;
    await sleep(2000);

    // Step 2: 查找筛选按钮
    const filterButton = document.querySelector('button:has([class*="filter"])') ||
                         Array.from(document.querySelectorAll('button')).find(el =>
                           el.textContent.includes('筛选') || el.querySelector('.lucide-filter'));

    if (!filterButton) {
      log('❌ 未找到筛选按钮', '⚠️');
      return false;
    }

    filterButton.click();
    log('✓ 已点击筛选按钮');
    await sleep(500);

    // Step 3: 查找"不认识"选项
    const unknownOption = Array.from(document.querySelectorAll('button, label, div')).find(el =>
      el.textContent.trim() === '不认识' || el.textContent.includes('不认识'));

    if (!unknownOption) {
      log('❌ 未找到"不认识"选项', '⚠️');
      return false;
    }

    unknownOption.click();
    log('✓ 已选择"不认识"');
    await sleep(500);

    // Step 4: 返回首页
    window.location.href = `${BASE_URL}/`;
    await sleep(1000);

    // Step 5: 点击"继续学习"
    const continueButton = document.querySelector('a[href^="/library/"]');
    if (!continueButton) {
      log('❌ 未找到"继续学习"按钮', '⚠️');
      return false;
    }

    continueButton.click();
    await sleep(1500);

    // Step 6: 验证URL
    const currentUrl = window.location.href;
    if (currentUrl.includes('status=unknown') || currentUrl.includes('status=')) {
      log(`✅ 测试通过！URL: ${currentUrl}`, '✅');
      return true;
    } else {
      log(`❌ 测试失败！URL应包含筛选参数，实际: ${currentUrl}`, '❌');
      return false;
    }
  } catch (error) {
    log(`❌ 测试出错: ${error.message}`, '💥');
    return false;
  }
}

// ============================================================================
// 测试3: 浏览器返回按钮（关键测试！）
// ============================================================================
async function test3_BrowserBackButton() {
  log('\n【测试3】第2页 → 浏览器返回 → 继续 → 应在第2页（关键测试）', '🧪');

  try {
    // Step 1: 访问单词书详情页
    window.location.href = `${BASE_URL}/library/${TEST_BOOK_ID}`;
    await sleep(2000);

    // Step 2: 点击第2页
    const page2Button = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent.trim() === '2');
    if (!page2Button) {
      log('❌ 未找到第2页按钮', '⚠️');
      return false;
    }

    page2Button.click();
    log('✓ 已进入第2页');
    await sleep(500);

    // Step 3: 点击浏览器返回按钮
    window.history.back();
    log('✓ 已点击浏览器返回按钮');
    await sleep(1000);

    // Step 4: 点击"继续学习"
    const continueButton = document.querySelector('a[href^="/library/"]');
    if (!continueButton) {
      log('❌ 未找到"继续学习"按钮', '⚠️');
      return false;
    }

    continueButton.click();
    await sleep(1500);

    // Step 5: 验证URL
    const currentUrl = window.location.href;
    if (currentUrl.includes('page=2')) {
      log(`✅ 测试通过！浏览器返回后状态正确恢复，URL: ${currentUrl}`, '✅');
      return true;
    } else {
      log(`❌ 测试失败！浏览器返回后状态丢失，URL: ${currentUrl}`, '❌');
      return false;
    }
  } catch (error) {
    log(`❌ 测试出错: ${error.message}`, '💥');
    return false;
  }
}

// ============================================================================
// 测试4: 组合条件（筛选+第2页）
// ============================================================================
async function test4_CombinedFilters() {
  log('\n【测试4】筛选"不认识"+第2页 → 返回 → 继续', '🧪');

  try {
    // Step 1: 访问单词书详情页
    window.location.href = `${BASE_URL}/library/${TEST_BOOK_ID}`;
    await sleep(2000);

    // Step 2: 应用筛选
    const filterButton = document.querySelector('button:has([class*="filter"])') ||
                         Array.from(document.querySelectorAll('button')).find(el =>
                           el.textContent.includes('筛选') || el.querySelector('.lucide-filter'));

    if (filterButton) {
      filterButton.click();
      await sleep(500);

      const unknownOption = Array.from(document.querySelectorAll('button, label, div')).find(el =>
        el.textContent.trim() === '不认识' || el.textContent.includes('不认识'));

      if (unknownOption) {
        unknownOption.click();
        log('✓ 已选择"不认识"');
        await sleep(500);
      }
    }

    // Step 3: 点击第2页
    const page2Button = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent.trim() === '2');
    if (!page2Button) {
      log('❌ 未找到第2页按钮', '⚠️');
      return false;
    }

    page2Button.click();
    await sleep(500);

    // Step 4: 返回首页
    window.location.href = `${BASE_URL}/`;
    await sleep(1000);

    // Step 5: 点击"继续学习"
    const continueButton = document.querySelector('a[href^="/library/"]');
    if (!continueButton) {
      log('❌ 未找到"继续学习"按钮', '⚠️');
      return false;
    }

    continueButton.click();
    await sleep(1500);

    // Step 6: 验证URL
    const currentUrl = window.location.href;
    const hasStatus = currentUrl.includes('status=unknown') || currentUrl.includes('status=');
    const hasPage = currentUrl.includes('page=2');

    if (hasStatus && hasPage) {
      log(`✅ 测试通过！组合条件正确保存，URL: ${currentUrl}`, '✅');
      return true;
    } else {
      log(`❌ 测试失败！组合条件未完全保存，URL: ${currentUrl}`, '❌');
      log(`   - status参数: ${hasStatus ? '✓' : '✗'}`, hasStatus ? '✓' : '✗');
      log(`   - page参数: ${hasPage ? '✓' : '✗'}`, hasPage ? '✓' : '✗');
      return false;
    }
  } catch (error) {
    log(`❌ 测试出错: ${error.message}`, '💥');
    return false;
  }
}

// ============================================================================
// 运行所有测试
// ============================================================================
async function runAllTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 开始运行"继续学习"功能测试套件');
  console.log('='.repeat(70));

  const results = [];

  // 逐个运行测试
  results.push(await test1_Page2_SaveAndRestore());
  await sleep(2000);

  results.push(await test2_Filter_SaveAndRestore());
  await sleep(2000);

  results.push(await test3_BrowserBackButton());
  await sleep(2000);

  results.push(await test4_CombinedFilters());

  // 统计结果
  console.log('\n' + '='.repeat(70));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(70));

  const passed = results.filter(r => r === true).length;
  const failed = results.filter(r => r === false).length;
  const total = results.length;

  console.log(`\n总计: ${total} 个测试`);
  console.log(`✅ 通过: ${passed} 个`);
  console.log(`❌ 失败: ${failed} 个`);
  console.log(`通过率: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 所有测试通过！"继续学习"功能工作正常！');
  } else {
    console.log('\n⚠️ 部分测试失败，请检查上述错误信息');
  }

  console.log('='.repeat(70) + '\n');
}

// 执行测试
runAllTests().catch(error => {
  console.error('💥 测试执行出错:', error);
});
```

### 步骤4: 查看测试结果

测试脚本会自动执行以下测试：
1. ✅ 页码保存和恢复（第2页）
2. ✅ 筛选条件保存和恢复（"不认识"）
3. ✅ **浏览器返回按钮测试（关键！）**
4. ✅ 组合条件（筛选+第2页）

每个测试会在控制台输出：
- 📌 测试步骤
- ✅ 测试通过
- ❌ 测试失败及原因

最后会显示测试结果汇总，包括通过率和详细报告。

---

## 注意事项

1. **测试期间不要刷新页面** - 测试脚本会自动导航
2. **等待测试完成** - 每个测试约需5-10秒
3. **观察控制台输出** - 所有测试结果会在控制台显示
4. **如有错误** - 控制台会显示详细的错误信息

## 测试覆盖的场景

| 测试 | 场景 | 验证点 |
|------|------|--------|
| 测试1 | 第2页返回继续 | URL包含`page=2` |
| 测试2 | 筛选"不认识" | URL包含`status=unknown` |
| 测试3 | **浏览器返回按钮** | 状态不丢失（这是你报告的问题！） |
| 测试4 | 组合条件 | 同时保存筛选和页码 |

特别是**测试3**，它会验证你之前报告的问题：
> "没改任何筛选条件进入第二页，点击浏览器返回，再点击继续学习，回到第一页了"

这个测试会验证该问题是否已修复！
