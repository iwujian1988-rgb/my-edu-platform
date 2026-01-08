-- 测试数据库函数是否正常工作
SELECT check_and_increment_invitation_code_attempts('TEST_CODE', '127.0.0.1', 'test-agent');
SELECT check_and_increment_invitation_code_attempts('TEST_CODE', '127.0.0.1', 'test-agent');
SELECT check_and_increment_invitation_code_attempts('TEST_CODE', '127.0.0.1', 'test-agent');
SELECT check_and_increment_invitation_code_attempts('TEST_CODE', '127.0.0.1', 'test-agent');
SELECT check_and_increment_invitation_code_attempts('TEST_CODE', '127.0.0.1', 'test-agent');
SELECT check_and_increment_invitation_code_attempts('TEST_CODE', '127.0.0.1', 'test-agent');
SELECT * FROM invitation_code_attempts WHERE code = 'TEST_CODE';
