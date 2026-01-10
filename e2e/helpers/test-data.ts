/**
 * 测试数据常量
 * 用于所有自动化测试
 */

export const TEST_USERS = {
  USER1: {
    phone: '18710244186',
    password: '12cDoOGwdS9E',
    name: '测试用户1',
    id: 'a2afbb4f-dd9c-46bc-a780-b286c1527292',
    phone_number: '18710244186'
  },
  USER2: {
    email: 'test-user2@example.com',
    password: 'Test123456',
    name: '测试用户2',
    id: '00000000-0000-0000-0000-000000000002'
  },
  BANNED: {
    email: 'test-banned@example.com',
    password: 'Test123456',
    name: '受封禁用户',
    id: '00000000-0000-0000-0000-000000000003'
  }
};

export const TEST_BOOKS = {
  FLASHCARDS: {
    id: '20000000-0000-0000-0000-000000000001',
    title: '测试-卡片背单词专用词书',
    category: 'exam'
  },
  CET4: {
    id: '10000000-0000-0000-0000-000000000001',
    title: '测试-四级核心词汇',
    category: 'exam'
  },
  SCENARIO: {
    id: '10000000-0000-0000-0000-000000000002',
    title: '测试-日常会话场景',
    category: 'scenario'
  },
  UNPUBLISHED: {
    id: '10000000-0000-0000-0000-000000000003',
    title: '测试-六级高级词汇',
    category: 'exam'
  },
  CUSTOM: {
    id: '10000000-0000-0000-0000-000000000004',
    title: '测试-我的生词本',
    category: 'custom'
  }
};

export const INVITATION_CODES = {
  VALID: 'TEST1234',        // 与页面显示的测试邀请码一致
  VIP: 'DEMO2024',          // 与页面显示的测试邀请码一致
  EXPIRED: 'EXPIRED2024'
};

export const TEST_WORDS = {
  CHAPTER1: [
    'hello', 'world', 'study', 'book', 'test',
    'apple', 'computer', 'happy', 'learn', 'teacher'
  ]
};

export const PAGES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  LIBRARY: '/library',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_WORD_BOOKS: '/admin/word-books',
  ADMIN_USERS: '/admin/users',
  ADMIN_INVITATION_CODES: '/admin/invitation-codes'
};

export const SELECTORS = {
  // 认证相关
  LOGIN_PHONE_INPUT: 'input[type="tel"]',
  LOGIN_PASSWORD_INPUT: 'input[type="password"]',
  LOGIN_SUBMIT_BUTTON: 'button[type="submit"]',

  // 词库列表
  BOOK_CARD: '[data-testid="book-card"]',
  START_LEARNING_BUTTON: 'text=开始学习',

  // 卡片背单词
  FLASHCARD_CONTAINER: '[data-testid="flashcard-container"]',
  FLASHCARD: '[data-testid="flashcard"]',
  KNOW_BUTTON: '[data-testid="know-button"]',
  DONT_KNOW_BUTTON: '[data-testid="dont-know-button"]',
  PROGRESS_BAR: '[data-testid="progress-bar"]',

  // 消消乐
  MATCH_GAME_CARD: '.match-card',
  DIFFICULTY_BUTTON: '[data-testid="difficulty-button"]',

  // 管理后台
  ADMIN_SHELF_BUTTON: '[data-testid="shelf-button"]',
  ADMIN_DELETE_BUTTON: '[data-testid="delete-button"]',
  ADMIN_EDIT_BUTTON: '[data-testid="edit-button"]'
};

// 等待时间常量
export const WAIT_TIMES = {
  SHORT: 1000,
  MEDIUM: 2000,
  LONG: 5000,
  EXTRA_LONG: 10000
};

// 截图选项
export const SCREENSHOT_OPTIONS = {
  fullPage: true,
  animations: 'allow'
};

// 测试超时设置
export const TEST_TIMEOUT = 60000; // 60秒
