/**
 * 真实API权限测试
 *
 * 测试目标：验证用户A无法访问用户B的自定义词库
 */

// 模拟的用户数据（需要从真实环境获取）
const BASE_URL = 'http://localhost:3001';

// 模拟两个用户的session（需要真实登录获取）
let userAToken = null;
let userBToken = null;

// 从之前的数据库查询，我们知道有一个自定义词库
const CUSTOM_BOOK_ID = '7a03385a-ab64-4687-83c8-fcd32b0e18c0'; // "测试" 词库
const CREATOR_ID = '7078b0aa-d06a-4209-b669-1a0d4985c8ea';

console.log('🧪 真实API权限测试');
console.log('=====================================\n');

console.log('⚠️  注意：这个测试需要：');
console.log('1. 开发服务器运行在 http://localhost:3001');
console.log('2. 需要两个真实用户的登录session');
console.log('3. 需要至少一个自定义词库用于测试\n');

console.log('📋 测试场景：');
console.log('-------------------------------------');
console.log(`自定义词库ID: ${CUSTOM_BOOK_ID}`);
console.log(`创建者ID: ${CREATOR_ID}`);
console.log('\n测试计划：');
console.log('1. 用户A（创建者）访问自己的词库 - 应该成功');
console.log('2. 用户B（其他人）访问用户A的词库 - 应该失败（403）');
console.log('3. 用户B尝试获取词库的单词 - 应该失败（403）');
console.log('4. 用户B尝试通过/api/words访问 - 应该失败（403）\n');

console.log('⚠️  问题：');
console.log('当前测试脚本无法自动获取用户session。');
console.log('需要手动登录或使用cookies。\n');

console.log('=====================================');
console.log('\n💡 建议：');
console.log('1. 手动在浏览器中测试');
console.log('2. 或提供真实的session token');
console.log('3. 或使用Playwright进行E2E测试\n');

console.log('📝 手动测试步骤：');
console.log('-------------------------------------');
console.log('\n步骤1：准备两个用户账号');
console.log('  用户A（创建者）：需要是词库的创建者');
console.log('  用户B（其他人）：任意其他用户\n');

console.log('步骤2：测试GET /api/books');
console.log('  1. 用户A登录，访问 http://localhost:3001/api/books');
console.log('  2. 验证：能看到自己创建的词库');
console.log('  3. 用户B登录，访问 http://localhost:3001/api/books');
console.log('  4. 验证：看不到用户A创建的词库\n');

console.log('步骤3：测试GET /api/books/[bookId]');
console.log('  1. 用户A访问：/api/books/' + CUSTOM_BOOK_ID);
console.log('  2. 验证：返回200，能看到词库详情');
console.log('  3. 用户B访问：/api/books/' + CUSTOM_BOOK_ID);
console.log('  4. 验证：返回403 Forbidden\n');

console.log('步骤4：测试GET /api/books/[bookId]/words');
console.log('  1. 用户A访问：/api/books/' + CUSTOM_BOOK_ID + '/words');
console.log('  2. 验证：返回200，能看到单词列表');
console.log('  3. 用户B访问：/api/books/' + CUSTOM_BOOK_ID + '/words');
console.log('  4. 验证：返回403 Forbidden\n');

console.log('步骤5：测试GET /api/words?bookId=xxx');
console.log('  1. 用户A访问：/api/words?bookId=' + CUSTOM_BOOK_ID);
console.log('  2. 验证：返回200，能看到单词列表');
console.log('  3. 用户B访问：/api/words?bookId=' + CUSTOM_BOOK_ID);
console.log('  4. 验证：返回403 Forbidden\n');

console.log('=====================================');
console.log('\n🎯 预期结果：');
console.log('✅ 用户A（创建者）能访问自己的词库和单词');
console.log('✅ 用户B（其他人）无法访问用户A的词库');
console.log('✅ 所有API都返回403 Forbidden，而不是404 Not Found');
console.log('✅ 官方词库的权限系统仍然正常工作\n');

console.log('=====================================');
console.log('\n📊 代码修复总结：');
console.log('-------------------------------------');
console.log('\n已修复的API：');
console.log('✅ GET /api/books - 添加权限过滤和边界处理');
console.log('✅ GET /api/books/[bookId] - 添加created_by检查');
console.log('✅ GET /api/books/[bookId]/words - 添加权限检查');
console.log('✅ GET /api/words - 添加权限检查');
console.log('\n权限规则：');
console.log('1. 自定义词库（is_official=false && created_by存在）：');
console.log('   → 只返回/允许创建者访问');
console.log('2. 官方词库（is_official=true）：');
console.log('   → 根据用户的bookPermissions权限过滤');
console.log('3. 公共词库（created_by=null）：');
console.log('   → 所有用户都能看到');

console.log('\n✅ 修复完成，等待真实用户测试验证\n');
