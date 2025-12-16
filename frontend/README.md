# Zoom 発話者リアルタイム分析（フロントエンド）

Zoom ミーティング内で動作する Zoom Apps アプリケーションのフロントエンド部分です。

## 技術スタック

- React 18
- TypeScript
- Vite
- Zoom Apps SDK

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 開発サーバーの起動

```bash
npm run dev
```

開発サーバーは `http://localhost:3000` で起動します。

### 3. 環境変数の設定（オプション）

`.env` ファイルを作成：

```env
# モックデータを使用する場合
VITE_USE_MOCK_DATA=true

# バックエンドAPIのURL（ブレイクアウトルーム対応を使用する場合）
VITE_API_BASE_URL=http://localhost:3001/api
```

## プロジェクト構造

```
frontend/
├── src/
│   ├── components/     # Reactコンポーネント
│   ├── hooks/          # カスタムフック
│   ├── types/          # TypeScript型定義
│   ├── utils/          # ユーティリティ関数
│   ├── App.tsx         # メインアプリケーション
│   └── main.tsx        # エントリーポイント
├── scripts/            # デプロイスクリプト
├── index.html          # HTMLエントリーポイント
├── package.json        # 依存関係
└── vite.config.ts      # Vite設定
```

## ビルド

```bash
npm run build
```

ビルド結果は `dist/` ディレクトリに出力されます。

## 詳細なドキュメント

詳細なドキュメントは `../doc/` ディレクトリを参照してください：

- [仕様書](../doc/SPECIFICATION.md): プロジェクト全体の詳細な仕様
- [バックエンドAPI仕様](../doc/BACKEND_API.md): APIエンドポイントの詳細
- [ブレイクアウトルーム対応の設計](../doc/BREAKOUT_ROOMS_DESIGN.md): ブレイクアウトルーム対応の設計と実装方針
- [機能一覧と実装状況](../doc/FEATURE_STATUS.md): 機能一覧と実装状況の詳細

