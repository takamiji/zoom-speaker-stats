# Zoom 発話者リアルタイム分析（バックエンドAPI）

ブレイクアウトルーム対応機能で使用するバックエンドAPIサーバーです。

## 技術スタック

- Node.js
- Express
- TypeScript
- tsx (開発用)

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env` ファイルを作成（`.env.example` をコピー）：

```bash
cp .env.example .env
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

APIサーバーは `http://localhost:3001` で起動します。

### 4. ビルド

```bash
npm run build
```

ビルド結果は `dist/` ディレクトリに出力されます。

### 5. 本番環境での起動

```bash
npm start
```

## APIエンドポイント

### 1. ルーム統計データの保存

```
POST /api/rooms/:roomId/stats
Content-Type: application/json

{
  "meetingId": "meeting-1234567890",
  "participants": [...],
  "recordedAt": 1234567890000
}
```

### 2. 全ルーム統計データの取得

```
GET /api/rooms/stats?meetingId=meeting-1234567890
```

### 3. ヘルスチェック

```
GET /health
```

## データストア

現在はインメモリデータストアを使用しています（開発用）。

本番環境では、以下のデータベースを使用することを推奨します：

- PostgreSQL
- MongoDB
- Redis（キャッシュ用）

詳細は `../doc/BACKEND_API.md` を参照してください。

## プロジェクト構造

```
backend/
├── src/
│   └── index.ts        # メインサーバーファイル
├── dist/               # ビルド出力（生成される）
├── package.json
├── tsconfig.json
└── README.md
```

## 今後の実装予定

- [ ] データベース統合（PostgreSQL / MongoDB）
- [ ] 認証機能（JWT）
- [ ] WebSocket対応（リアルタイム更新）
- [ ] データの永続化
- [ ] エラーハンドリングの強化
- [ ] ログ機能の追加

