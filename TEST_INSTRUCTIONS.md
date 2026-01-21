# 状态筛选测试指南

## 问题说明

之前的测试页面**直接调用API**，绕过了React hook的缓存逻辑，所以缓存不会被写入。

## 正确的测试方法

### 方法1: 使用React应用测试页面 (推荐)

1. **打开新测试页面**:
   ```
   http://localhost:3007/test-react-cache.html
   ```

2. **点击"在iframe中加载书籍详情页"**

3. **在iframe中操作**:
   - 等待页面加载
   - 点击"认识"按钮
   - 点击"模糊"按钮
   - 再次点击"认识"按钮

4. **观察Console日志** (按F12打开Console):
   ```
   ✅ [Track] Page 1-all marked as loaded
   ✅ [Track] Page 1-known marked as loaded
   ✅ [Skip] Page 1-known already loaded
   ```

5. **点击"检查SessionStorage缓存"按钮**
   - 应该看到: `["1-all", "1-known", "1-fuzzy"]`
   - 缓存key包含"-"符号 ✅

### 方法2: 直接在实际应用中测试

1. **访问书籍详情页**:
   ```
   http://localhost:3007/library/9f1e6332-979d-4632-a8f6-8bd35246b28d
   ```

2. **打开Console** (F12)

3. **执行操作并观察日志**:

   **步骤A**: 页面首次加载
   ```
   期望看到: ✅ [Track] Page 1-all marked as loaded
   ```

   **步骤B**: 点击"认识"按钮
   ```
   期望看到: 📖 Fetching words (page 1, status=known)
   期望看到: ✅ [Track] Page 1-known marked as loaded
   ```

   **步骤C**: 再次点击"认识"按钮
   ```
   期望看到: ✅ [Skip] Page 1-known already loaded, skipping API call
   ```

4. **验证缓存**:
   在Console中执行:
   ```javascript
   JSON.parse(sessionStorage.getItem('loadedPages-9f1e6332-979d-4632-a8f6-8bd35246b28d'))
   ```

   **期望结果**:
   ```javascript
   ["1-all", "1-known", "1-fuzzy"]
   ```

## 验证通过的标准

✅ **缓存key包含"-"符号** (例如 "1-known" 而不是 "1")
✅ **不同状态触发新的API调用**
✅ **相同状态第二次不调用API** (缓存命中)

## 测试数据

- **书籍ID**: 9f1e6332-979d-4632-a8f6-8bd35246b28d
- **书名**: PEP初中8年级
- **认识记录**: 1条
- **作用**: 验证点击"认识"后能筛选出这1条记录
