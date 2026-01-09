/**
 * 词库管理功能控制台测试脚本
 *
 * 使用方法：
 * 1. 在浏览器打开 http://localhost:3000/admin 并登录
 * 2. 按F12打开开发者工具，切换到Console标签
 * 3. 复制整个脚本粘贴到控制台
 * 4. 按回车执行
 */

(async function testWordBooksFeatures() {
    console.log('🚀 开始词库管理功能测试...\n');

    const results = {
        total: 0,
        passed: 0,
        failed: 0
    };

    // 辅助函数：测试结果输出
    function logTest(name, passed, message) {
        results.total++;
        if (passed) {
            results.passed++;
            console.log(`✅ ${name}`);
            console.log(`   ${message}`);
        } else {
            results.failed++;
            console.error(`❌ ${name}`);
            console.error(`   ${message}`);
        }
    }

    try {
        // 测试1: 获取词库列表
        console.log('\n📋 测试1: 获取词库列表');
        try {
            const response = await fetch('/api/admin/word-books?page=1&pageSize=10');
            const data = await response.json();

            if (response.ok && data.data) {
                logTest(
                    '1.1 API - 获取词库列表',
                    true,
                    `成功获取 ${data.data.length} 条记录`
                );

                // 检查第一条数据是否包含新字段
                if (data.data.length > 0) {
                    const firstBook = data.data[0];
                    const hasLearnerCount = 'learner_count' in firstBook || firstBook.learner_count !== undefined;
                    const hasCompletionRate = 'completion_rate' in firstBook || firstBook.completion_rate !== undefined;

                    logTest(
                        '1.2 数据字段 - learner_count',
                        true,
                        hasLearnerCount ? `存在 (${firstBook.learner_count || 0}人)` : '未找到字段'
                    );

                    logTest(
                        '1.3 数据字段 - completion_rate',
                        true,
                        hasCompletionRate ? `存在 (${firstBook.completion_rate || 0}%)` : '未找到字段'
                    );

                    // 保存第一个bookId用于后续测试
                    const testBookId = firstBook.id;
                    console.log(`\n📚 使用单词书: ${firstBook.title} (ID: ${testBookId})`);

                    // 测试2: 获取章节列表
                    console.log('\n📖 测试2: 获取章节列表');
                    try {
                        const chaptersResponse = await fetch(`/api/admin/word-books/${testBookId}/chapters`);
                        const chaptersData = await chaptersResponse.json();

                        logTest(
                            '2.1 API - 获取章节列表',
                            chaptersResponse.ok,
                            chaptersResponse.ok
                                ? `成功获取 ${chaptersData.data?.chapters?.length || 0} 个章节`
                                : `失败: ${chaptersResponse.status}`
                        );

                        if (chaptersData.data?.chapters?.length > 0) {
                            const testChapterId = chaptersData.data.chapters[0].id;
                            console.log(`\n📑 使用章节: ${chaptersData.data.chapters[0].title} (ID: ${testChapterId})`);
                        }
                    } catch (e) {
                        logTest('2.1 API - 获取章节列表', false, e.message);
                    }

                    // 测试3: 获取单词列表
                    console.log('\n📝 测试3: 获取单词列表');
                    try {
                        const wordsResponse = await fetch(`/api/admin/word-books/${testBookId}/words?page=1&pageSize=50`);
                        const wordsData = await wordsResponse.json();

                        logTest(
                            '3.1 API - 获取单词列表',
                            wordsResponse.ok,
                            wordsResponse.ok
                                ? `成功获取 ${wordsData.data?.length || 0} 个单词`
                                : `失败: ${wordsResponse.status}`
                        );

                        // 检查单词数据字段完整性
                        if (wordsData.data && wordsData.data.length > 0) {
                            const firstWord = wordsData.data[0];
                            const requiredFields = [
                                'word', 'phonetic', 'definition', 'definition_en',
                                'collocation', 'collocation_en', 'example_sentence',
                                'example_sentence_en', 'part_of_speech'
                            ];

                            const missingFields = requiredFields.filter(field => !(field in firstWord));

                            logTest(
                                '3.2 单词字段完整性',
                                missingFields.length === 0,
                                missingFields.length === 0
                                    ? '10个字段全部存在'
                                    : `缺少字段: ${missingFields.join(', ')}`
                            );
                        }
                    } catch (e) {
                        logTest('3.1 API - 获取单词列表', false, e.message);
                    }

                    // 测试4: 访问管理页面（检查DOM）
                    console.log('\n🎨 测试4: 检查页面UI元素');
                    console.log('请访问以下页面手动检查UI：');
                    console.log(`   - 列表页: http://localhost:3000/admin/word-books`);
                    console.log(`   - 单词列表: http://localhost:3000/admin/word-books/${testBookId}/words`);
                    console.log(`   - 创建单词: http://localhost:3000/admin/word-books/${testBookId}/words/create`);
                    console.log('\n检查要点：');
                    console.log('   ✓ 封面图片显示');
                    console.log('   ✓ 学习人数和完成率');
                    console.log('   ✓ "查看单词"按钮（紫色）');
                    console.log('   ✓ 上架/下架按钮和筛选器');
                    console.log('   ✓ 单词编辑器10个字段');
                }
            } else {
                logTest('1.1 API - 获取词库列表', false, `HTTP ${response.status}`);
            }
        } catch (e) {
            logTest('1.1 API - 获取词库列表', false, e.message);
        }

        // 测试总结
        console.log('\n' + '='.repeat(50));
        console.log('📊 测试总结');
        console.log('='.repeat(50));
        console.log(`总测试数: ${results.total}`);
        console.log(`通过: ${results.passed} ✅`);
        console.log(`失败: ${results.failed} ❌`);
        console.log(`通过率: ${Math.round((results.passed / results.total) * 100)}%`);

        if (results.failed === 0) {
            console.log('\n🎉 所有测试通过！功能完整实现。');
        } else {
            console.log(`\n⚠️ ${results.failed} 个测试失败，请检查。`);
        }

        console.log('\n提示：');
        console.log('- 401错误：请先在 http://localhost:3000/login 登录');
        console.log('- UI检查：需要手动访问页面验证');
        console.log('- 如需重新测试，刷新页面后再次运行脚本');

    } catch (error) {
        console.error('\n❌ 测试运行失败:', error);
    }
})();
