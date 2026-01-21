/**
 * 调试ability单词状态问题
 */

(async function() {
  console.log('🔍 开始调试ability单词状态问题\n');

  const bookId = window.location.pathname.split('/')[3];
  console.log('📚 Book ID:', bookId);

  // 1. 获取ability单词的ID
  console.log('\n📍 步骤1: 获取ability单词信息');
  const wordsRes = await fetch('/api/words?bookId=' + bookId);
  const wordsData = await wordsRes.json();
  const abilityWord = wordsData.data.find(w => w.word === 'ability');

  if (!abilityWord) {
    console.log('❌ 未找到ability单词');
    return;
  }

  console.log('✅ 找到ability单词:');
  console.log('   - ID:', abilityWord.id);
  console.log('   - word:', abilityWord.word);
  console.log('   - status (从API):', abilityWord.status);

  // 2. 检查数据库中的状态
  console.log('\n📍 步骤2: 检查数据库中的状态');
  const progressRes = await fetch('/api/word-progress?book_id=' + bookId);
  const progressData = await progressRes.json();
  const abilityProgress = progressData.data[abilityWord.id];

  console.log('✅ 数据库中的状态:');
  if (abilityProgress) {
    console.log('   - status:', abilityProgress.status);
    console.log('   - consecutive_correct_count:', abilityProgress.consecutive_correct_count);
    console.log('   - updated_at:', abilityProgress.updated_at);
  } else {
    console.log('   - ⚠️  未找到进度记录');
  }

  // 3. 检查localStorage
  console.log('\n📍 步骤3: 检查localStorage');
  const localKey = `word-progress-${bookId}`;
  const localData = localStorage.getItem(localKey);
  const localStatus = localData ? JSON.parse(localData)[abilityWord.id] : null;

  console.log('✅ localStorage中的状态:', localStatus || '未设置');

  // 4. 检查页面DOM中的显示
  console.log('\n📍 步骤4: 检查页面DOM显示');
  const wordCards = document.querySelectorAll('.clay-card');
  let foundInDOM = false;

  wordCards.forEach(card => {
    const heading = card.querySelector('h3');
    if (heading && heading.textContent.trim() === 'ability') {
      foundInDOM = true;
      console.log('✅ 在DOM中找到ability卡片');

      // 检查状态按钮
      const buttons = card.querySelectorAll('button');
      let activeStatus = null;

      buttons.forEach(btn => {
        const text = btn.textContent.trim();
        const isActive = btn.classList.contains('text-green-600') ||
                        btn.classList.contains('text-yellow-600') ||
                        btn.classList.contains('text-red-600');

        if (isActive && text.match(/认识|模糊|不认识/)) {
          activeStatus = text;
        }
      });

      console.log('   - 页面显示的状态:', activeStatus || '未找到激活的状态按钮');
    }
  });

  if (!foundInDOM) {
    console.log('❌ 在DOM中未找到ability卡片');
  }

  // 5. 总结
  console.log('\n📊 总结:');
  console.log('====================');
  console.log('API返回的status:', abilityWord.status);
  console.log('数据库中的status:', abilityProgress?.status || '无记录');
  console.log('localStorage中的status:', localStatus || '无');

  // 诊断问题
  console.log('\n🔍 诊断:');

  if (abilityWord.status === 'known') {
    console.log('❌ 问题确认: API返回的status是"known"，但应该是"unknown"');
    console.log('💡 可能原因:');
    console.log('   1. 听写模式提交时API调用失败');
    console.log('   2. 数据库更新失败');
    console.log('   3. 服务端缓存问题');
  } else if (abilityWord.status === 'unknown') {
    console.log('✅ API返回的status是正确的（unknown）');
    console.log('❌ 但页面显示错误，可能是前端渲染问题');
  }

})();
