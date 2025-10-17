# With Profile Copy

一个用于 [with.is](https://with.is) 网站的 Tampermonkey 用户脚本，可以在用户详情页面添加复制按钮，快速生成AI对话提示。

## 功能

- 在 with.is 用户详情页面添加"复制用户信息"按钮
- 自动提取用户信息：
  - 用户名和居住地
  - 自我介绍文
  - 共同点
  - 基本信息
- 按照指定模板格式化并复制到剪贴板

## 安装

### 方法一：直接安装
1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 点击 [这里](https://github.com/your-username/with-profile-copy/releases/latest/download/with-profile-copy.user.js) 安装最新版本

### 方法二：手动安装
1. 复制 `dist/with-profile-copy.user.js` 文件内容
2. 在 Tampermonkey 中点击"添加新脚本"
3. 粘贴内容并保存

## 使用方法

1. 访问 with.is 用户详情页面（如：`https://with.is/users/1895861025`）
2. 在用户名称后面会出现"📋 复制用户信息"按钮
3. 点击按钮，用户信息会自动复制到剪贴板
4. 粘贴到AI对话工具中使用

## 开发

### 环境要求
- Node.js 18+
- npm

### 安装依赖
```bash
npm install
```

### 构建
```bash
npm run build
```

### 开发模式
```bash
npm run dev
```

## 项目结构

```
├── src/
│   └── with-profile-copy.ts    # TypeScript 源代码
├── dist/
│   ├── with-profile-copy.js    # 编译后的 JavaScript
│   └── with-profile-copy.user.js # 最终用户脚本
├── package.json
├── tsconfig.json
├── build.js
└── README.md
```

## 许可证

MIT License