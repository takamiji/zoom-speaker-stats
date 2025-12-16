#!/bin/bash

# ConoHa VPSの初期セットアップスクリプト
# 使用方法: VPS上で実行してください

set -e

echo "🔧 ConoHa VPSの初期セットアップを開始します..."

# Node.jsのインストール
echo "📦 Node.jsをインストールしています..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Nginxのインストール
echo "📦 Nginxをインストールしています..."
sudo apt-get update
sudo apt-get install -y nginx

# PM2のインストール
echo "📦 PM2をインストールしています..."
sudo npm install -g pm2

# ディレクトリの作成
echo "📁 ディレクトリを作成しています..."
sudo mkdir -p /var/www/zoom-frontend
sudo chown -R $USER:$USER /var/www/zoom-frontend

# Nginx設定ファイルの作成
echo "⚙️ Nginx設定ファイルを作成しています..."
sudo tee /etc/nginx/sites-available/zoom-app > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    # フロントエンド（静的ファイル）
    location / {
        root /var/www/zoom-frontend;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
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

    # ヘルスチェック
    location /health {
        proxy_pass http://localhost:3001/health;
    }
}
EOF

# Nginx設定を有効化
sudo ln -sf /etc/nginx/sites-available/zoom-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Nginx設定のテスト
echo "🧪 Nginx設定をテストしています..."
sudo nginx -t

# Nginxを再起動
echo "🔄 Nginxを再起動しています..."
sudo systemctl restart nginx
sudo systemctl enable nginx

echo "✅ 初期セットアップが完了しました！"
echo ""
echo "次のステップ:"
echo "1. バックエンドの.envファイルを設定してください"
echo "2. フロントエンドとバックエンドをデプロイしてください"
echo "3. PM2でバックエンドを起動してください: pm2 start dist/index.js --name zoom-backend"

