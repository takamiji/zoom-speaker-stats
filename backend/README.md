# Zoom 発話者リアルタイム分析（バックエンド API）

ブレイクアウトルーム対応機能で使用するバックエンド API サーバーです。

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

`.env` ファイルを作成：

```bash
# バックエンドディレクトリで実行
cat > .env << EOF
PORT=3001

# データベース接続情報
DB_HOST=localhost
DB_PORT=5432
DB_NAME=zoom_stats
DB_USER=zoom_user
DB_PASSWORD=your_password

# マイグレーション実行（初回のみ true に設定）
RUN_MIGRATIONS=false
EOF
```

または、`.env.example` をコピーして編集：

```bash
cp .env.example .env
# .envファイルを編集してデータベース接続情報を設定
```

### 3. データベースのセットアップ

PostgreSQL をインストールしてデータベースを作成：

```bash
# PostgreSQLに接続
sudo -u postgres psql

# データベースとユーザーを作成
CREATE DATABASE zoom_stats;
CREATE USER zoom_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE zoom_stats TO zoom_user;
\q
```

マイグレーションを実行してスキーマを作成：

```bash
# 環境変数でマイグレーションを有効化
RUN_MIGRATIONS=true npm run dev

# または、マイグレーションスクリプトを直接実行
npm run migrate
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

API サーバーは `http://localhost:3001` で起動します。

### 5. ビルド

```bash
npm run build
```

ビルド結果は `dist/` ディレクトリに出力されます。

### 6. 本番環境での起動

```bash
npm start
```

## API エンドポイント

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

**PostgreSQL**を使用しています。

### データベーススキーマ

- `participant_stats`: 参加者統計データ（1 秒ごとに保存）
- `room_overall_stats`: 全体統計データ（1 秒ごとに保存）

詳細は `../doc/BACKEND_API.md` を参照してください。

## プロジェクト構造

```
backend/
├── src/
│   ├── index.ts        # メインサーバーファイル
│   └── db/
│       ├── connection.ts    # データベース接続
│       ├── repositories.ts  # データアクセス層
│       ├── migrations.ts    # スキーマ定義
│       └── migrate.ts       # マイグレーション実行スクリプト
├── dist/               # ビルド出力（生成される）
├── package.json
├── tsconfig.json
└── README.md
```

## 実装済み機能

- [x] データベース統合（PostgreSQL）
- [x] 参加者統計の保存（1 秒ごと）
- [x] 全体統計の保存（1 秒ごと）
- [x] 打ち合わせ名での検索

## 今後の実装予定

- [ ] 認証機能（JWT）
- [ ] WebSocket 対応（リアルタイム更新）
- [ ] エラーハンドリングの強化
- [ ] ログ機能の追加
