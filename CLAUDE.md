# Claude Code 最佳实践指南

## GitHub Flow 分支命名规范

### 分支前缀
必须使用以下标准前缀：

- `feature/` - 新功能开发
- `fix/` - 错误修复
- `docs/` - 文档更新
- `refactor/` - 代码重构
- `test/` - 测试相关
- `chore/` - 维护任务

### 正确示例
```bash
# 新功能
feature/japanese-localization
feature/add-marrish-support

# 错误修复
fix/age-extraction-bug
fix/css-selector-update

# 重构
refactor/css-selectors
refactor/extract-constants

# 文档
docs/readme-update
docs/api-documentation

# 维护
chore/update-dependencies
chore/regenerate-script
```

### 错误示例
```bash
# 避免使用
japanese-localization-v1.0.1
sync-main-branch
remove-workflow
update-script-user-js
```

## 提交信息规范

### 格式
```
<type>: <description>

[optional body]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### 类型
- `feat`: 新功能
- `fix`: 错误修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 维护任务

## 重要提醒

1. **始终使用标准分支前缀**
2. **遵循GitHub Flow工作流程**
3. **main分支受保护，必须通过PR合并**
4. **合并PR时总是删除分支**
5. **GitHub origin只保留main和dist分支**
6. **GreasyFork从dist分支的script.user.js导入**