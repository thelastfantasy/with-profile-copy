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

## 关键工作流程规范

### 分支管理
- **必须**：在开始任何文件修改前，先从origin main分支创建新分支
- **禁止**：直接在main分支上进行文件修改或提交
- **正确流程**：
  ```bash
  # 1. 确保本地main分支与远程同步
  git checkout main
  git pull origin main

  # 2. 创建新功能分支
  git checkout -b feature/your-feature-name

  # 3. 在新分支上进行文件修改和提交
  # ... 修改文件 ...
  git add .
  git commit -m "feat: Your feature description"

  # 4. 推送分支并创建PR
  git push origin feature/your-feature-name
  ```

### 常见错误避免
- ❌ 在main分支上直接运行 `git commit`
- ❌ 在main分支上直接修改文件
- ❌ 忘记创建新分支就开始工作
- ✅ 始终从干净的main分支创建新分支
- ✅ 所有开发工作都在功能分支上进行
- ✅ 通过PR流程合并到main分支

## 发布新版本流程

### 自动构建流程
项目使用GitHub Actions自动构建和发布：
1. **build-on-merge.yml** - 当PR合并到main分支时自动触发
2. **deepseek-review.yml** - PR创建时自动代码审查

### 发布新版本步骤

#### 步骤1：更新版本号
```bash
# 1. 从main分支创建新分支
git checkout main
git pull origin main
git checkout -b chore/update-version-1.0.9

# 2. 更新package.json版本号
# 编辑package.json，将"version": "1.0.8"改为"version": "1.0.9"

# 3. 更新build.js中的硬编码版本号
# 编辑build.js第10行，将"// @version      1.0.8"改为"// @version      1.0.9"
```

#### 步骤2：提交并创建PR
```bash
git add package.json build.js
git commit -m "chore: Bump version to 1.0.9"
git push origin chore/update-version-1.0.9
gh pr create --title "chore: Bump version to 1.0.9" --body "Update version number for new release"
```

#### 步骤3：合并PR
- 在GitHub上审查并合并PR
- 自动workflow会触发，构建新版本并推送到dist分支

#### 步骤4：验证发布
1. 检查GitHub Actions workflow运行是否成功
2. 验证dist分支上的script.user.js是否包含新版本号
3. GreasyFork会自动检测dist分支的更新（通过@updateURL）

### 版本管理说明
- **当前版本**：在package.json中定义
- **build.js**：包含硬编码版本号，需要手动更新
- **build-greasyfork.js**：从package.json自动读取版本号
- **dist分支**：包含构建后的script.user.js，供GreasyFork使用

### 重要提醒
1. **版本号格式**：遵循语义化版本控制（SemVer）
   - MAJOR.版本（不兼容的API修改）
   - MINOR.版本（向下兼容的功能性新增）
   - PATCH.版本（向下兼容的问题修正）
2. **GreasyFork更新**：script.user.js中的@updateURL指向dist分支，GreasyFork会自动检测更新
3. **手动更新**：如果只修改功能而不需要新版本号，workflow会自动更新dist分支
4. **版本更新**：如果需要发布新版本，必须同时更新package.json和build.js