# deai prompt generator

[with.is](https://with.is)、[Pairs.lv](https://pairs.lv)、[marrish.com](https://marrish.com) 向けの Tampermonkey ユーザースクリプト。ユーザー詳細ページにコピーボタンを追加し、AI対話プロンプトを素早く生成します。

## 機能

### with.is サポート
- ユーザー詳細ページに「📋 ユーザー情報をコピー」ボタンを追加
- ユーザー情報を自動抽出：
  - ユーザー名と居住地
  - 自己紹介文
  - 共通点
  - 基本情報

### Pairs.lv サポート
- メッセージ詳細ページに「📋 プロフィールをコピー」ボタンを追加
- ユーザー情報を自動抽出：
  - ユーザー名と居住地
  - 自己紹介文
  - マイタグ
  - 完全なプロフィール情報（基本情報、学歴・職種・外見、恋愛・結婚について、性格・趣味・生活）

- 指定されたテンプレートでフォーマットし、クリップボードにコピー

### marrish.com サポート
- プロフィール詳細ページに「📋 プロフィールをコピー」ボタンを追加
- ユーザー情報を自動抽出：
  - ユーザー名と居住地
  - 自己PR
  - 参加グループ
  - 詳細プロフィール情報

- チャットページでメッセージコピー機能を追加
  - 各メッセージに「📋」ボタンを表示
  - 発言者名を自動検出（俺：または相手名：）
  - メッセージ内容をクリップボードにコピー

## インストール

### 方法1：GreasyForkからインストール（推奨）
1. [Tampermonkey](https://www.tampermonkey.net/) ブラウザ拡張機能をインストール
2. [GreasyForkページ](https://greasyfork.org/scripts/552862-with-profile-copy) にアクセス
3. "Install this script" ボタンをクリック

### 方法2：GitHubから直接インストール
1. [Tampermonkey](https://www.tampermonkey.net/) ブラウザ拡張機能をインストール
2. [ここをクリック](https://github.com/thelastfantasy/with-profile-copy/raw/dist/script.user.js) して最新版をインストール

### 方法3：手動インストール
1. `dist/with-profile-copy.user.js` ファイルの内容をコピー
2. Tampermonkey で「新規スクリプトを追加」をクリック
3. 内容を貼り付けて保存

## 使用方法

### with.is
1. ユーザー詳細ページにアクセス（例：`https://with.is/users/1895861025`）
2. ユーザー名の後に「📋 ユーザー情報をコピー」ボタンが表示されます
3. ボタンをクリックすると、ユーザー情報が自動的にクリップボードにコピーされます

### Pairs.lv
1. メッセージ詳細ページにアクセス（例：`https://pairs.lv/message/detail/123456789`）
2. ユーザー名の後に「📋 プロフィールをコピー」ボタンが表示されます
3. ボタンをクリックすると、プロフィール情報が自動的にクリップボードにコピーされます

### marrish.com
#### プロフィールページ
1. プロフィール詳細ページにアクセス（例：`https://marrish.com/profile/detail/partner/123456789`）
2. 居住地の後に「📋 プロフィールをコピー」ボタンが表示されます
3. ボタンをクリックすると、プロフィール情報が自動的にクリップボードにコピーされます

#### チャットページ
1. チャットページにアクセス（例：`https://marrish.com/message/index/123456789`）
2. 各メッセージに「📋」ボタンが表示されます
3. ボタンをクリックすると、発言者名付きのメッセージ内容がクリップボードにコピーされます

### 共通
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

## DeepSeek AI コードレビュー

このプロジェクトはDeepSeek APIを統合しており、以下の自動コードレビュー機能を提供します：

### 自動レビュー機能
- **PRコードレビュー**: Pull Request作成/更新時に自動的にコードレビューを実行
- **多角的評価**: コード品質、アーキテクチャ設計、セキュリティ、パフォーマンスなど

### 設定方法
1. GitHubリポジトリのSettings → Secrets and variables → Actions に移動
2. `DEEPSEEK_API_KEY` という名前でDeepSeek APIキーを追加
3. 詳細は [DEEPSEEK_INTEGRATION.md](./DEEPSEEK_INTEGRATION.md) を参照

## ライセンス

MIT License