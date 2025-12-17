# ConoHa VPS へのデプロイガイド

最終更新日: 2024 年

## 📋 概要

ConoHa VPS の 2GB プランにフロントエンドとバックエンドの両方をデプロイする方法と注意点を説明します。

## ✅ デプロイ可能性

### 結論: **可能です**

ConoHa VPS の 2GB プラン（メモリ 2GB、CPU3 コア、SSD100GB）で、フロントエンドとバックエンドの両方をデプロイすることは技術的に可能です。

### メモリ使用量の見積もり

| コンポーネント                      | 推定メモリ使用量 | 備考                 |
| ----------------------------------- | ---------------- | -------------------- |
| **OS（Ubuntu/CentOS）**             | 200-300MB        | 基本 OS              |
| **Nginx**                           | 10-50MB          | リバースプロキシ     |
| **Node.js（バックエンド）**         | 100-300MB        | Express + TypeScript |
| **Node.js（フロントエンドビルド）** | 50-100MB         | ビルド時のみ         |
| **その他（システムプロセス）**      | 100-200MB        | ログ、監視など       |
| **合計**                            | **約 460-950MB** | 余裕: 約 1GB 以上    |

**結論**: 2GB メモリで十分に動作可能です。

---

## 🏗️ 推奨アーキテクチャ

### 構成図

```
インターネット
    ↓
Nginx (ポート80/443)
    ├─→ フロントエンド (静的ファイル) → /var/www/zoom-frontend/dist
    └─→ バックエンドAPI (リバースプロキシ) → http://localhost:3001
```

### ポート設定

- **Nginx**: ポート 80（HTTP）、443（HTTPS）
- **バックエンド API**: ポート 3001（内部のみ）
- **フロントエンド**: ビルド済み静的ファイル（Nginx で配信）

---

## 📦 デプロイ手順

### 1. サーバーのセットアップ

```bash
# Node.jsのインストール（LTS版推奨）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Nginxのインストール
sudo apt-get update
sudo apt-get install -y nginx

# PM2のインストール（プロセス管理）
sudo npm install -g pm2
```

### 2. フロントエンドのデプロイ

```bash
# リポジトリをクローン
git clone <repository-url>
cd zoom/frontend

# 依存関係のインストール
npm install

# ビルド
npm run build

# ビルド結果をNginxの公開ディレクトリにコピー
sudo cp -r dist/* /var/www/zoom-frontend/
```

### 3. バックエンドのデプロイ

```bash
cd ../backend

# 依存関係のインストール
npm install

# ビルド
npm run build

# 環境変数の設定
cp .env.example .env
# .envファイルを編集

# PM2で起動
pm2 start dist/index.js --name zoom-backend
pm2 save
pm2 startup  # システム起動時に自動起動
```

### 4. Nginx の設定

```nginx
# /etc/nginx/sites-available/zoom-app
server {
    listen 80;
    server_name your-domain.com;

    # フロントエンド（静的ファイル）
    location / {
        root /var/www/zoom-frontend;
        try_files $uri $uri/ /index.html;
    }

    # バックエンドAPI（リバースプロキシ）
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# 設定を有効化
sudo ln -s /etc/nginx/sites-available/zoom-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. SSL 証明書の設定（Let's Encrypt）

```bash
# Certbotのインストール
sudo apt-get install -y certbot python3-certbot-nginx

# SSL証明書の取得
sudo certbot --nginx -d your-domain.com
```

---

## ⚠️ 注意事項と制約

### 1. メモリ使用量の監視

**推奨**: メモリ使用量を定期的に監視してください。

```bash
# メモリ使用量の確認
free -h

# プロセスごとのメモリ使用量
pm2 monit
```

**目安**:

- メモリ使用率が 80%を超える場合は、最適化を検討
- 90%を超える場合は、4GB プランへの移行を検討

### 2. トラフィック増加への対応

**問題**: アクセス数が増加すると、メモリや CPU の使用率が高まる可能性があります。

**対策**:

- キャッシュの活用（Nginx、Redis）
- データベースの最適化
- CDN の使用（静的ファイル）
- 必要に応じて 4GB プランへの移行

### 3. プロセス管理

**PM2 の使用を推奨**:

- 自動再起動
- ログ管理
- パフォーマンス監視
- クラスターモード（複数プロセス）

```bash
# PM2の基本コマンド
pm2 start dist/index.js --name zoom-backend
pm2 list
pm2 logs zoom-backend
pm2 restart zoom-backend
pm2 stop zoom-backend
```

### 4. データベースの選択

**現在**: インメモリデータストア（開発用）

**本番環境での推奨**:

- **PostgreSQL**: リレーショナルデータベース（推奨）
- **MongoDB**: NoSQL データベース
- **Redis**: キャッシュ用（オプション）

**注意**: データベースを追加すると、メモリ使用量が増加します。

---

## 📊 リソース使用量の見積もり

### 軽負荷時（同時接続数: 10-50）

| リソース     | 使用量    | 余裕     |
| ------------ | --------- | -------- |
| **メモリ**   | 600-800MB | 約 1.2GB |
| **CPU**      | 10-20%    | 約 80%   |
| **ディスク** | 5-10GB    | 約 90GB  |

### 中負荷時（同時接続数: 50-200）

| リソース     | 使用量    | 余裕     |
| ------------ | --------- | -------- |
| **メモリ**   | 1.0-1.5GB | 約 500MB |
| **CPU**      | 30-50%    | 約 50%   |
| **ディスク** | 10-20GB   | 約 80GB  |

### 高負荷時（同時接続数: 200 以上）

**推奨**: 4GB プランへの移行を検討

---

## 🔧 最適化のヒント

### 1. Nginx のキャッシュ設定

```nginx
# 静的ファイルのキャッシュ
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 2. Node.js のメモリ制限

```bash
# PM2でメモリ制限を設定
pm2 start dist/index.js --name zoom-backend --max-memory-restart 500M
```

### 3. ログローテーション

```bash
# PM2のログローテーション設定
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 4. データベース接続プールの最適化

```typescript
// データベース接続プールのサイズを制限
const pool = new Pool({
  max: 10, // 最大接続数
  idleTimeoutMillis: 30000,
});
```

---

## 🚀 デプロイスクリプト例

### deploy.sh

```bash
#!/bin/bash

# フロントエンドのビルドとデプロイ
cd /path/to/zoom/frontend
git pull
npm install
npm run build
sudo cp -r dist/* /var/www/zoom-frontend/

# バックエンドのビルドとデプロイ
cd ../backend
git pull
npm install
npm run build
pm2 restart zoom-backend

# Nginxの再読み込み
sudo nginx -t && sudo systemctl reload nginx

echo "デプロイ完了"
```

---

## 📝 まとめ

### ✅ 可能なこと

- ConoHa VPS の 2GB プランでフロントエンドとバックエンドの両方をデプロイ可能
- Nginx を使用したリバースプロキシ構成
- PM2 を使用したプロセス管理
- SSL 証明書の設定（Let's Encrypt）

### ⚠️ 注意点

- メモリ使用量の監視が必要
- アクセス数が増加すると、リソース不足の可能性
- 必要に応じて 4GB プランへの移行を検討

### 🎯 推奨事項

1. **初期段階**: 2GB プランで運用開始
2. **監視**: メモリ・CPU 使用率を定期的に確認
3. **最適化**: キャッシュ、ログローテーションなどの最適化を実施
4. **スケールアップ**: 必要に応じて 4GB プランへの移行を検討

---

## 🔗 参考資料

- [ConoHa VPS 公式ドキュメント](https://www.conoha.jp/vps/)
- [Nginx 公式ドキュメント](https://nginx.org/en/docs/)
- [PM2 公式ドキュメント](https://pm2.keymetrics.io/)
- [Let's Encrypt 公式サイト](https://letsencrypt.org/)
