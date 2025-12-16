# Zoom 発話者リアルタイム分析

Zoom ミーティング内で動作する Zoom Apps アプリケーションです。参加者の発話状況をリアルタイムで可視化します。

## 📁 プロジェクト構成（モノレポ）

```
zoom/
├── frontend/          # フロントエンド（React + TypeScript + Vite）
├── backend/           # バックエンドAPI（Node.js + Express + TypeScript）
└── doc/               # 共通ドキュメント
```

## 🚀 クイックスタート

### フロントエンドの起動

```bash
cd frontend
npm install
npm run dev
```

フロントエンドは `http://localhost:3000` で起動します。

### バックエンド API の起動

```bash
cd backend
npm install
npm run dev
```

バックエンド API は `http://localhost:3001` で起動します。

## 📚 詳細なドキュメント

- [フロントエンド README](./frontend/README.md): フロントエンドの詳細
- [バックエンド README](./backend/README.md): バックエンド API の詳細
- [仕様書](./doc/SPECIFICATION.md): プロジェクト全体の詳細な仕様
- [バックエンド API 仕様](./doc/BACKEND_API.md): API エンドポイントの詳細
- [ブレイクアウトルーム対応の設計](./doc/BREAKOUT_ROOMS_DESIGN.md): ブレイクアウトルーム対応の設計と実装方針
- **[デプロイガイド](./doc/DEPLOYMENT_GUIDE.md)**: ConoHa VPS へのデプロイ手順（手動・CI/CD）

## 🎯 機能

### 基本機能

- アクティブスピーカーのリアルタイム表示
- 参加者ごとの発話統計（発話回数、総発話時間、平均発話時間、発話シェア、バランススコア）
- 全体統計の表示
- 発話バランスの可視化（プログレスバー、カラーコード）
- 発話イベントのログ表示

### ブレイクアウトルーム対応

- **計測モード**: 各ブレイクアウトルームで発話統計を計測・保存
- **ホスト閲覧モード**: ホストが全ブレイクアウトルームの計測状況を一覧表示
- 10 秒ごとの自動保存（準リアルタイム表示）

## 🛠️ 技術スタック

### フロントエンド

- React 18
- TypeScript
- Vite
- Zoom Apps SDK

### バックエンド

- Node.js
- Express
- TypeScript
- tsx (開発用)

## 📖 セットアップ手順

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd zoom
```

### 2. フロントエンドのセットアップ

```bash
cd frontend
npm install
```

### 3. バックエンドのセットアップ

```bash
cd ../backend
npm install
```

### 4. 環境変数の設定

**フロントエンド** (`frontend/.env`):

```env
VITE_USE_MOCK_DATA=true
VITE_API_BASE_URL=http://localhost:3001/api
```

**バックエンド** (`backend/.env`):

```env
PORT=3001
```

### 5. 開発サーバーの起動

**ターミナル 1（フロントエンド）**:

```bash
cd frontend
npm run dev
```

**ターミナル 2（バックエンド）**:

```bash
cd backend
npm run dev
```

## 🏗️ プロジェクト構造

```
zoom/
├── frontend/              # フロントエンド
│   ├── src/
│   │   ├── components/    # Reactコンポーネント
│   │   ├── hooks/        # カスタムフック
│   │   ├── types/        # TypeScript型定義
│   │   ├── utils/        # ユーティリティ関数
│   │   └── ...
│   ├── package.json
│   └── README.md
├── backend/               # バックエンドAPI
│   ├── src/
│   │   └── index.ts      # メインサーバーファイル
│   ├── package.json
│   └── README.md
└── doc/                   # 共通ドキュメント
    ├── SPECIFICATION.md
    ├── BACKEND_API.md
    ├── BREAKOUT_ROOMS_DESIGN.md
    └── ...
```

## 📝 ライセンス

MIT
