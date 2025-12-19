# ConoHa VPS デプロイガイド（完全版）

最終更新日: 2024 年

## 📋 概要

このガイドでは、ConoHa VPS へのデプロイ方法を 2 つの方法で説明します：

1. **手動デプロイ**: 初回セットアップと手動でのデプロイ
2. **自動デプロイ（CI/CD）**: GitHub Actions を使用した自動デプロイ

---

## 🚀 方法 1: 手動デプロイ

### ステップ 0: ConoHa VPS のセキュリティグループ設定（重要）

**ConoHa VPS のコントロールパネルで設定**:

1. ConoHa VPS のコントロールパネルにログイン
2. 対象の VPS を選択
3. 「セキュリティグループ」または「ファイアウォール」設定を開く
4. 以下のセキュリティグループを設定:

   - **IPv4v6-SSH**: ポート 22（SSH 接続用）
   - **IPv4v6-Web**: ポート 80（HTTP 接続用）

**注意**: これらのセキュリティグループを設定しないと、SSH 接続や HTTP 接続ができません。

### ステップ 1: VPS の初期セットアップ

**VPS に SSH 接続して実行**:

```bash
# セットアップスクリプトをVPSに転送
scp scripts/setup-vps.sh user@your-server-ip:~/

# VPSにSSH接続
ssh user@your-server-ip

# セットアップスクリプトを実行
chmod +x setup-vps.sh
./setup-vps.sh
```

または、手動でセットアップ:

```bash
# ファイアウォールの設定（重要）
# ポート80（HTTP）を開放
sudo ufw allow 80/tcp
sudo ufw reload
sudo ufw status

# Node.jsのインストール
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Nginxのインストール
sudo apt-get update
sudo apt-get install -y nginx

# PM2のインストール
sudo npm install -g pm2

# ディレクトリの作成
sudo mkdir -p /var/www/zoom-frontend
sudo chown -R $USER:$USER /var/www/zoom-frontend
```

### ステップ 2: Nginx 設定

```bash
# Nginx設定ファイルを作成
sudo vi /etc/nginx/sites-available/zoom-app
```

以下の内容を記述:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # ドメイン名またはIPアドレス

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
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### ステップ 3: アプリケーションのデプロイ

**ローカルマシンで実行**:

```bash
# フロントエンドのビルド
cd frontend
npm install
npm run build
cd ..

# バックエンドのビルド
cd backend
npm install
npm run build
cd ..

# VPSにファイルを転送
scp -r frontend/dist/* user@your-server-ip:/var/www/zoom-frontend/
scp -r backend/dist backend/package.json user@your-server-ip:~/zoom-app/backend/

# VPSにSSH接続してバックエンドを起動
ssh user@your-server-ip
cd ~/zoom-app/backend
npm ci --production
pm2 start dist/index.js --name zoom-backend
pm2 save
pm2 startup  # システム起動時に自動起動
```

### ステップ 4: 環境変数の設定

**VPS 上で実行**:

```bash
cd ~/zoom-app/backend
cp .env.example .env
vi .env
```

`.env`ファイルの内容:

```env
PORT=3001
```

---

## 🤖 方法 2: 自動デプロイ（CI/CD）

### GitHub Actions を使用した自動デプロイ

この方法では、GitHub リポジトリにコードをプッシュするだけで、自動的に VPS にデプロイされます。

#### ステップ 1: GitHub リポジトリの作成

1. **GitHub にログイン**して、新しいリポジトリを作成します

   - GitHub の右上の「+」→「New repository」をクリック
   - リポジトリ名: `zoom-speaker-stats`（任意）
   - 公開/非公開: どちらでも可
   - **重要**: README、.gitignore、ライセンスは追加しない（既存のプロジェクトをプッシュするため）

2. **ローカルで Git リポジトリを初期化**（まだの場合）:

```bash
# プロジェクトルートで実行
git init
git branch -M main
```

#### ステップ 2: 初回コミットとプッシュ

```bash
# すべてのファイルをステージング
git add .

# 初回コミット
git commit -m "Initial commit: Zoom Speaker Stats App"

# GitHubリポジトリをリモートとして追加
# <your-username>と<repository-name>を実際の値に置き換えてください
git remote add origin https://github.com/<your-username>/<repository-name>.git

# メインブランチにプッシュ
git push -u origin main
```

**注意**: 初回プッシュ時に GitHub の認証が求められる場合があります。Personal Access Token を使用してください。

#### ステップ 3: SSH 鍵の生成と設定

**ローカルマシンで実行**:

```bash
# SSH鍵を生成（まだない場合）
# Windows (PowerShell)の場合:
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
# 保存場所: C:\Users\<username>\.ssh\id_rsa
# パスフレーズは空でも可（Enterキーを2回押す）

# Linux/Macの場合:
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
# デフォルトの保存場所: ~/.ssh/id_rsa
# パスフレーズは空でも可（Enterキーを2回押す）
```

**公開鍵を VPS に転送**:

```bash
# Windowsの場合（PowerShell）:
type $env:USERPROFILE\.ssh\id_rsa.pub | ssh user@your-server-ip "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"

# Linux/Macの場合:
ssh-copy-id -p 22 user@your-server-ip

# または手動で（Windows/Linux/Mac共通）:
cat ~/.ssh/id_rsa.pub | ssh user@your-server-ip "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

**SSH 接続のテスト**:

```bash
# VPSにSSH接続できるか確認
ssh user@your-server-ip
# パスワードなしで接続できればOK
# 接続できたら exit で抜ける
```

#### ステップ 4: GitHub Secrets の設定

1. **GitHub リポジトリにアクセス**

   - リポジトリのページで「Settings」をクリック
   - 左サイドバーから「Secrets and variables」→「Actions」を選択

2. **「New repository secret」をクリック**して、以下の 4 つのシークレットを追加:

   **① VPS_HOST**

   - Name: `VPS_HOST`
   - Secret: VPS の IP アドレスまたはドメイン名（例: `123.45.67.89` または `example.com`）

   **② VPS_USER**

   - Name: `VPS_USER`
   - Secret: SSH ユーザー名（例: `ubuntu` または `root`）

   **③ VPS_SSH_KEY**

   - Name: `VPS_SSH_KEY`
   - Secret: SSH 秘密鍵の内容（`id_rsa`ファイルの内容全体）

     ```bash
     # Windows (PowerShell):
     type $env:USERPROFILE\.ssh\id_rsa

     # Linux/Mac:
     cat ~/.ssh/id_rsa
     ```

     - **重要**: 秘密鍵の内容全体をコピー（`-----BEGIN OPENSSH PRIVATE KEY-----`から`-----END OPENSSH PRIVATE KEY-----`まで、改行も含めて）

   **④ VPS_PORT**（オプション）

   - Name: `VPS_PORT`
   - Secret: SSH ポート番号（デフォルト: `22`）
   - カスタムポートを使用している場合のみ設定

#### ステップ 5: VPS の初期セットアップ（初回のみ）

**VPS に SSH 接続して実行**:

```bash
# VPSにSSH接続
ssh user@your-server-ip

# セットアップスクリプトをダウンロードまたは作成
# 方法1: ローカルから転送
# ローカルマシンで:
scp scripts/setup-vps.sh user@your-server-ip:~/

# VPS上で:
chmod +x ~/setup-vps.sh
~/setup-vps.sh
```

または、**手動でセットアップ**:

```bash
# ファイアウォールの設定（重要）
# ポート80（HTTP）を開放
sudo ufw allow 80/tcp
sudo ufw reload
sudo ufw status

# Node.jsのインストール
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Nginxのインストール
sudo apt-get update
sudo apt-get install -y nginx

# PM2のインストール
sudo npm install -g pm2

# ディレクトリの作成
sudo mkdir -p /var/www/zoom-frontend
sudo chown -R $USER:$USER /var/www/zoom-frontend

# デプロイ用ディレクトリの作成
mkdir -p ~/zoom-app/backend
```

**Nginx 設定ファイルの作成**:

```bash
sudo nano /etc/nginx/sites-available/zoom-app
```

以下の内容を記述:

```nginx
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
```

```bash
# Nginx設定を有効化
sudo ln -sf /etc/nginx/sites-available/zoom-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# バックエンドの環境変数設定（必要に応じて）
cd ~/zoom-app/backend
# .envファイルを作成（必要に応じて）
```

#### ステップ 6: GitHub Actions ワークフローの確認

`.github/workflows/deploy.yml`が正しく設定されているか確認してください。

```bash
# ローカルで確認
cat .github/workflows/deploy.yml
```

このファイルが存在しない場合は、プロジェクトルートに`.github/workflows/deploy.yml`を作成してください（既に作成済みのはずです）。

#### ステップ 7: 初回デプロイの実行

**コードをコミットしてプッシュ**:

```bash
# 変更をコミット
git add .
git commit -m "Add CI/CD deployment configuration"

# GitHubにプッシュ
git push origin main
```

**GitHub Actions の実行を確認**:

1. GitHub リポジトリのページで「Actions」タブをクリック
2. ワークフローの実行状況を確認
3. 緑色のチェックマークが表示されれば成功
4. エラーがある場合は、ログを確認して修正

#### ステップ 8: 動作確認

**フロントエンドの確認**:

```bash
curl http://your-server-ip/
```

ブラウザで `http://your-server-ip/` を開いて確認

**バックエンド API の確認**:

```bash
curl http://your-server-ip/api/health
```

レスポンス: `{"status":"ok","timestamp":...}`

**PM2 の状態確認**:

```bash
ssh user@your-server-ip
pm2 list
pm2 logs zoom-backend
```

---

### 今後のデプロイ

`main`ブランチまたは`master`ブランチにプッシュするだけで、自動的にデプロイが実行されます。

```bash
git add .
git commit -m "Update: 変更内容の説明"
git push origin main
```

GitHub Actions が自動的に以下を実行します:

1. フロントエンドとバックエンドのビルド
2. VPS へのファイル転送
3. PM2 でのバックエンド再起動
4. Nginx の再読み込み

---

## 🔧 デプロイスクリプトの使用

### 手動デプロイスクリプト

```bash
# 環境変数を設定
export VPS_USER=ubuntu
export VPS_HOST=your-server-ip
export VPS_PORT=22

# デプロイスクリプトを実行
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

---

## ✅ 動作確認

### 1. フロントエンドの確認

```bash
curl http://your-server-ip/
```

ブラウザで `http://your-server-ip/` を開いて確認

### 2. バックエンド API の確認

```bash
curl http://your-server-ip/api/health
```

レスポンス: `{"status":"ok","timestamp":...}`

### 3. PM2 の状態確認

```bash
ssh user@your-server-ip
pm2 list
pm2 logs zoom-backend
```

---

## 🔒 HTTPS 化（SSL 証明書の設定）

### Let's Encrypt を使用した SSL 証明書の取得

ドメインを取得済みの場合、Let's Encrypt の無料 SSL 証明書を使用して HTTPS 化できます。

#### ステップ 1: Certbot のインストール

```bash
# VPSにSSH接続
ssh user@your-server-ip

# Certbotのインストール
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
```

#### ステップ 2: DNS 設定の確認

**重要**: ドメインの DNS 設定で、VPS の IP アドレスに A レコードを設定してください。

例:

- ドメイン: `example.com`
- サブドメイン: `app.example.com`（任意）
- A レコード: `@` または `app` → `160.251.237.190`（VPS の IP アドレス）

DNS 設定が反映されるまで数分〜数時間かかる場合があります。確認方法:

```bash
# DNS設定が反映されているか確認
# お名前.comのDNSサーバーに問い合わせる場合
nslookup zoom.katsun.info 01.dnsv.jp

# または、デフォルトのDNSサーバーで確認
nslookup zoom.katsun.info
# または
dig zoom.katsun.info
```

#### ステップ 3: Nginx 設定ファイルの更新

ドメイン名を指定するように Nginx 設定を更新:

```bash
# Nginx設定ファイルを編集
sudo vi /etc/nginx/sites-available/zoom-app
```

以下のように`server_name`を更新:

**`server_name`の設定方法**:

- サブドメインを使用する場合: `server_name zoom.katsun.info;`
- メインドメインを使用する場合: `server_name katsun.info;`
- 複数のドメインを使用する場合: `server_name zoom.katsun.info katsun.info;`

```nginx
server {
    listen 80;
    server_name zoom.katsun.info;  # サブドメイン名を指定（zoom.katsun.infoを使用）

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
```

```bash
# Nginx設定をテスト
sudo nginx -t

# Nginxを再読み込み
sudo systemctl reload nginx
```

#### ステップ 4: SSL 証明書の取得

```bash
# SSL証明書の取得（インタラクティブ）
sudo certbot --nginx -d zoom.katsun.info

# または、非インタラクティブモード（メールアドレスを指定）
sudo certbot --nginx -d zoom.katsun.info --email your-email@example.com --agree-tos --non-interactive
```

**注意**:

- `zoom.katsun.info`を実際のサブドメイン名に置き換えてください
- メインの`katsun.info`も含める場合は: `sudo certbot --nginx -d zoom.katsun.info -d katsun.info`
- メールアドレスは証明書の有効期限通知などに使用されます

#### ステップ 5: 自動更新の設定

Let's Encrypt の証明書は 90 日で期限切れになるため、自動更新を設定します。

```bash
# 自動更新のテスト
sudo certbot renew --dry-run

# 自動更新が正常に動作することを確認
# systemdのタイマーが自動的に設定されているか確認
sudo systemctl status certbot.timer
```

Certbot は自動的に systemd タイマーを設定するため、手動での設定は通常不要です。

#### ステップ 6: 動作確認

```bash
# HTTPSでアクセスできるか確認
curl https://zoom.katsun.info/api/health

# ブラウザで確認
# https://zoom.katsun.info を開く
```

#### ステップ 7: HTTP から HTTPS へのリダイレクト（推奨）

Nginx 設定を更新して、HTTP アクセスを自動的に HTTPS にリダイレクト:

```bash
# Nginx設定ファイルを確認（Certbotが自動的に更新しているはず）
cat /etc/nginx/sites-available/zoom-app
```

Certbot は通常、HTTP から HTTPS へのリダイレクトを自動的に設定します。設定されていない場合は、手動で追加:

```nginx
# HTTPからHTTPSへのリダイレクト
server {
    listen 80;
    server_name zoom.katsun.info;
    return 301 https://$server_name$request_uri;
}

# HTTPS設定
server {
    listen 443 ssl http2;
    server_name zoom.katsun.info;

    ssl_certificate /etc/letsencrypt/live/zoom.katsun.info/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/zoom.katsun.info/privkey.pem;

    # SSL設定（推奨）
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

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
```

```bash
# Nginx設定をテスト
sudo nginx -t

# Nginxを再読み込み
sudo systemctl reload nginx
```

### ConoHa VPS のセキュリティグループ設定

HTTPS を使用する場合、ポート 443 も開放する必要があります。

1. ConoHa VPS のコントロールパネルにログイン
2. 対象の VPS を選択
3. 「セキュリティグループ」設定を開く
4. **IPv4v6-HTTPS**: ポート 443 を追加

### トラブルシューティング

#### SSL 証明書の取得に失敗する場合

```bash
# Certbotのログを確認
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# よくある原因:
# 1. DNS設定が反映されていない
# 2. ポート80が外部からアクセスできない（ファイアウォール設定）
# 3. ドメイン名のタイプミス
```

#### 証明書の更新

```bash
# 手動で更新
sudo certbot renew

# 更新後のNginx再読み込み
sudo systemctl reload nginx
```

#### 証明書の確認

```bash
# 証明書の有効期限を確認
sudo certbot certificates
```

---

## 🔄 更新のデプロイ

### 手動デプロイの場合

```bash
# フロントエンドの更新
cd frontend
npm run build
scp -r dist/* user@your-server-ip:/var/www/zoom-frontend/

# バックエンドの更新
cd ../backend
npm run build
scp -r dist/* backend/package.json user@your-server-ip:~/zoom-app/backend/
ssh user@your-server-ip "cd ~/zoom-app/backend && npm ci --production && pm2 restart zoom-backend"
```

### 自動デプロイの場合

`main`ブランチにプッシュするだけで自動的にデプロイされます。

---

## 🐛 トラブルシューティング

### 接続できない（リモートサーバーに接続できません）

**原因 1: ConoHa セキュリティグループが設定されていない**

ConoHa VPS のコントロールパネルで以下を確認:

- **IPv4v6-SSH**: ポート 22 が開放されているか
- **IPv4v6-Web**: ポート 80 が開放されているか

**原因 2: ファイアウォールでポート 80 が閉じている**

```bash
# ファイアウォールの状態を確認
sudo ufw status

# ポート80を開放
sudo ufw allow 80/tcp
sudo ufw reload
sudo ufw status
```

**原因 3: Nginx が起動していない**

```bash
# Nginxの状態を確認
sudo systemctl status nginx

# Nginxを起動
sudo systemctl start nginx
sudo systemctl enable nginx
```

### フロントエンドが表示されない

```bash
# Nginxのログを確認
sudo tail -f /var/log/nginx/error.log

# ファイルの権限を確認
ls -la /var/www/zoom-frontend/

# Nginx設定ファイルの構文を確認
sudo nginx -t
```

### バックエンドが起動しない

```bash
# PM2のログを確認
pm2 logs zoom-backend

# ポートが使用中か確認
sudo netstat -tlnp | grep 3001
```

### API 接続エラー

```bash
# バックエンドが起動しているか確認
pm2 list

# Nginxの設定を確認
sudo nginx -t
```

---

## 📚 参考資料

- [ConoHa VPS 公式ドキュメント](https://www.conoha.jp/vps/)
- [Nginx 公式ドキュメント](https://nginx.org/en/docs/)
- [PM2 公式ドキュメント](https://pm2.keymetrics.io/)
- [GitHub Actions 公式ドキュメント](https://docs.github.com/actions)
