# With Profile Copy

[with.is](https://with.is) 向けの Tampermonkey ユーザースクリプト。ユーザー詳細ページにコピーボタンを追加し、AI対話プロンプトを素早く生成します。

## 機能

- with.is ユーザー詳細ページに「ユーザー情報をコピー」ボタンを追加
- ユーザー情報を自動抽出：
  - ユーザー名と居住地
  - 自己紹介文
  - 共通点
  - 基本情報
- 指定されたテンプレートでフォーマットし、クリップボードにコピー

## インストール

### 方法1：直接インストール
1. [Tampermonkey](https://www.tampermonkey.net/) ブラウザ拡張機能をインストール
2. [ここをクリック](https://github.com/thelastfantasy/with-profile-copy/releases/latest/download/with-profile-copy.user.js) して最新版をインストール

### 方法2：手動インストール
1. `dist/with-profile-copy.user.js` ファイルの内容をコピー
2. Tampermonkey で「新規スクリプトを追加」をクリック
3. 内容を貼り付けて保存

## 使用方法

1. with.is ユーザー詳細ページにアクセス（例：`https://with.is/users/1895861025`）
2. ユーザー名の後に「📋 ユーザー情報をコピー」ボタンが表示されます
3. ボタンをクリックすると、ユーザー情報が自動的にクリップボードにコピーされます
4. AI対話ツールに貼り付けて使用

## 開発

### 環境要件
- Node.js 18+
- npm

### 依存関係のインストール
```bash
npm install
```

### ビルド
```bash
npm run build
```

### 開発モード
```bash
npm run dev
```

## プロジェクト構造

```
├── src/
│   └── with-profile-copy.ts    # TypeScript ソースコード
├── dist/
│   ├── with-profile-copy.js    # コンパイル後の JavaScript
│   └── with-profile-copy.user.js # 最終ユーザースクリプト
├── package.json
├── tsconfig.json
├── build.js
└── README.md
```

## ライセンス

MIT License