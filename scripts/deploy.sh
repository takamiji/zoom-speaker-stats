#!/bin/bash

# ConoHa VPSへのデプロイスクリプト
# 使用方法: ./scripts/deploy.sh

set -e

echo "🚀 ConoHa VPSへのデプロイを開始します..."

# 変数の設定
VPS_USER="${VPS_USER:-ubuntu}"
VPS_HOST="${VPS_HOST:-your-server-ip}"
VPS_PORT="${VPS_PORT:-22}"
DEPLOY_PATH="/home/${VPS_USER}/zoom-app"
FRONTEND_DIST="/var/www/zoom-frontend"

# フロントエンドのビルド
echo "📦 フロントエンドをビルドしています..."
cd frontend
npm install
npm run build
cd ..

# バックエンドのビルド
echo "📦 バックエンドをビルドしています..."
cd backend
npm install
npm run build
cd ..

# VPSへのファイル転送
echo "📤 VPSにファイルを転送しています..."
ssh -p ${VPS_PORT} ${VPS_USER}@${VPS_HOST} "mkdir -p ${DEPLOY_PATH}/frontend/dist ${DEPLOY_PATH}/backend/dist"

scp -P ${VPS_PORT} -r frontend/dist/* ${VPS_USER}@${VPS_HOST}:${DEPLOY_PATH}/frontend/dist/
scp -P ${VPS_PORT} -r backend/dist/* ${VPS_USER}@${VPS_HOST}:${DEPLOY_PATH}/backend/dist/
scp -P ${VPS_PORT} backend/package.json ${VPS_USER}@${VPS_HOST}:${DEPLOY_PATH}/backend/

# VPS上でデプロイを実行
echo "🔧 VPS上でデプロイを実行しています..."
ssh -p ${VPS_PORT} ${VPS_USER}@${VPS_HOST} << EOF
  # フロントエンドのデプロイ
  sudo cp -r ${DEPLOY_PATH}/frontend/dist/* ${FRONTEND_DIST}/
  
  # バックエンドのデプロイ
  cd ${DEPLOY_PATH}/backend
  npm ci --production
  
  # PM2で再起動または起動
  pm2 restart zoom-backend || pm2 start dist/index.js --name zoom-backend
  pm2 save
  
  # Nginxの再読み込み
  sudo nginx -t && sudo systemctl reload nginx
  
  echo "✅ デプロイが完了しました"
EOF

echo "🎉 デプロイが完了しました！"

