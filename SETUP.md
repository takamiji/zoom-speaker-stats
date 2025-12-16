# セットアップガイド

モノレポ構成への移行が完了しました。以下の手順でセットアップしてください。

## 📋 セットアップ手順

### 1. フロントエンドのセットアップ

```bash
cd frontend
npm install
```

### 2. バックエンドのセットアップ

```bash
cd ../backend
npm install
```

### 3. 環境変数の設定

**フロントエンド** (`frontend/.env`):

```env
VITE_USE_MOCK_DATA=true
VITE_API_BASE_URL=http://localhost:3001/api
```

**バックエンド** (`backend/.env`):

```env
PORT=3001
```

`.env.example` ファイルをコピーして `.env` を作成してください：

```bash
# フロントエンド
cd frontend
copy .env.example .env  # Windows
# または
cp .env.example .env    # Linux/Mac

# バックエンド
cd ../backend
copy .env.example .env  # Windows
# または
cp .env.example .env    # Linux/Mac
```

### 4. 開発サーバーの起動

**ターミナル1（フロントエンド）**:

```bash
cd frontend
npm run dev
```

フロントエンドは `http://localhost:3000` で起動します。

**ターミナル2（バックエンド）**:

```bash
cd backend
npm run dev
```

バックエンドAPIは `http://localhost:3001` で起動します。

## ✅ 動作確認

### フロントエンド

1. ブラウザで `http://localhost:3000` を開く
2. モード選択画面が表示されることを確認
3. 「計測モード」を選択して動作確認

### バックエンド

1. ブラウザまたはcurlで `http://localhost:3001/health` にアクセス
2. `{"status":"ok","timestamp":...}` が返ってくることを確認

```bash
curl http://localhost:3001/health
```

## 🔧 トラブルシューティング

### フロントエンドが起動しない

- `frontend/node_modules/` が存在するか確認
- `npm install` を再実行

### バックエンドが起動しない

- `backend/node_modules/` が存在するか確認
- `npm install` を再実行
- ポート3001が使用中でないか確認

### API接続エラー

- バックエンドが起動しているか確認
- `VITE_API_BASE_URL` が正しく設定されているか確認
- CORSエラーの場合は、バックエンドのCORS設定を確認

## 📚 次のステップ

- [フロントエンド README](./frontend/README.md) を参照
- [バックエンド README](./backend/README.md) を参照
- [バックエンドAPI仕様](./doc/BACKEND_API.md) を参照

