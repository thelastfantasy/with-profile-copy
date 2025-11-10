# DeepSeek API 集成指南

本项目集成了DeepSeek API，通过GitHub Actions提供自动化的代码审查功能。

## 功能概述

- **PR代码审查**: 在创建或更新Pull Request时自动进行代码审查
- **多维度评估**: 包括代码质量、架构设计、安全性、性能等方面

## 配置步骤

### 1. 获取DeepSeek API密钥

1. 访问 [DeepSeek官网](https://www.deepseek.com/)
2. 注册账号并获取API密钥
3. 确保API密钥有足够的调用额度

### 2. 配置GitHub Secrets

在GitHub仓库设置中，添加以下Secret：

- **名称**: `DEEPSEEK_API_KEY`
- **值**: 你的DeepSeek API密钥

**配置路径**:
```
Settings → Secrets and variables → Actions → New repository secret
```

### 3. 工作流配置

工作流使用以下配置集成DeepSeek API：

```yaml
- name: Run DeepSeek Code Review
  uses: anthropics/claude-code-action@v1
  with:
    settings: |
      {
        "env": {
          "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
          "ANTHROPIC_AUTH_TOKEN": "${{ secrets.DEEPSEEK_API_KEY }}",
          "ANTHROPIC_MODEL": "deepseek-chat",
          "ANTHROPIC_SMALL_FAST_MODEL": "deepseek-chat",
          "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
          "API_TIMEOUT_MS": "600000"
        }
      }
    prompt: |
      # 你的审查提示
```

**关键配置说明**:
- `settings`: 使用内联JSON配置环境变量
- `ANTHROPIC_BASE_URL`: DeepSeek API端点
- `ANTHROPIC_AUTH_TOKEN`: DeepSeek API密钥（推荐使用此变量）
- `ANTHROPIC_MODEL`: 设置主要模型为deepseek-chat（DeepSeek推荐）
- `ANTHROPIC_SMALL_FAST_MODEL`: 设置快速模型为deepseek-chat（DeepSeek推荐）
- `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`: 禁用非必要流量（推荐设置，减少API调用）
- `API_TIMEOUT_MS`: 设置10分钟超时防止超时（DeepSeek推荐）
- `prompt`: 自定义的代码审查提示

**环境变量说明**:
- `ANTHROPIC_MODEL` 和 `ANTHROPIC_SMALL_FAST_MODEL` 确保使用DeepSeek的模型
- `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` 禁用非必要API调用，节省成本
- `API_TIMEOUT_MS=600000` 设置10分钟超时，防止长时间运行的代码审查超时

### 4. 工作流说明

#### PR代码审查 (`deepseek-review.yml`)
- **触发条件**: PR创建或同步更新
- **功能**: 自动审查代码变更
- **输出**: 在PR评论中提供审查反馈

## 使用说明

### 自动触发
- 创建或更新PR时自动运行代码审查

### 手动触发
在GitHub Actions页面可以手动触发工作流：
```
Actions → 选择工作流 → Run workflow
```

## 审查内容

### 代码审查重点
1. **TypeScript质量**
   - 类型定义完整性
   - 接口设计合理性
   - 错误处理充分性

2. **功能逻辑**
   - CSS选择器稳定性
   - MutationObserver使用
   - 剪贴板操作安全性

3. **用户体验**
   - 按钮位置合理性
   - 提示生成逻辑
   - 多网站兼容性

4. **安全性**
   - 数据提取合规性
   - 权限使用合理性
   - 潜在安全风险

### 质量分析维度
1. **项目结构**
   - 配置完整性
   - 构建流程优化
   - 依赖管理

2. **架构设计**
   - 代码组织清晰度
   - 模块划分合理性
   - 扩展性考虑

3. **性能优化**
   - DOM操作效率
   - 事件监听优化
   - 内存管理

## 成本控制

- DeepSeek API按调用次数计费
- 建议设置API使用限额
- 定期监控API使用情况

## 故障排除

### 常见问题

1. **工作流失败**
   - 检查API密钥是否正确
   - 确认API密钥有足够额度
   - 查看Actions日志获取详细错误信息

2. **无审查评论**
   - 确认PR有代码变更
   - 检查工作流是否成功运行
   - 查看Actions输出日志

3. **API调用失败**
   - 验证API密钥有效性
   - 检查网络连接
   - 确认DeepSeek服务状态

## 相关链接

- [DeepSeek API文档](https://api-docs.deepseek.com/)
- [Claude Code Action文档](https://github.com/anthropics/claude-code-action)
- [GitHub Actions文档](https://docs.github.com/en/actions)