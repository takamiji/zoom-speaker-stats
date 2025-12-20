# VPS での PostgreSQL 設定手順（詳細解説）

## 📋 概要

ConoHa VPS 上で PostgreSQL をセットアップし、Zoom Speaker Stats アプリケーションのデータベースを構築する手順です。

---

## 🔧 ステップ 1: VPS 上で PostgreSQL をインストール

### 1-1. VPS に SSH 接続

```bash
# ローカルマシンからVPSに接続
ssh user@your-server-ip
# 例: ssh ubuntu@160.251.237.190
```

### 1-2. システムパッケージの更新

```bash
# パッケージリストを更新
sudo apt-get update

# 既存パッケージを最新化（オプション）
sudo apt-get upgrade -y
```

### 1-3. PostgreSQL のインストール

```bash
# PostgreSQLをインストール
sudo apt-get install -y postgresql postgresql-contrib

# PostgreSQLのバージョンを確認
psql --version
# 例: psql (PostgreSQL) 14.x など
```

**注意**: ConoHa VPS の Ubuntu イメージによっては、PostgreSQL が既にインストールされている場合があります。その場合は、このステップをスキップできます。

### 1-4. PostgreSQL サービスの確認

```bash
# PostgreSQLが起動しているか確認
sudo systemctl status postgresql

# 起動していない場合は起動
sudo systemctl start postgresql
sudo systemctl enable postgresql  # システム起動時に自動起動
```

---

## 🗄️ ステップ 2: データベースとユーザーを作成

### 2-1. PostgreSQL に接続

```bash
# postgresユーザーでPostgreSQLに接続
sudo -u postgres psql
```

接続に成功すると、プロンプトが `postgres=#` に変わります。

### 2-2. データベースの作成

```sql
-- データベースを作成
CREATE DATABASE zoom_stats;

-- データベースが作成されたか確認
\l
-- または
\list
```

`zoom_stats` がリストに表示されれば成功です。

### 2-3. ユーザーの作成と権限設定

```sql
-- ユーザーを作成（パスワードを設定）
CREATE USER zoom_user WITH PASSWORD 'your_secure_password_here';

-- データベースへの権限を付与
GRANT ALL PRIVILEGES ON DATABASE zoom_stats TO zoom_user;

-- スキーマへの権限も付与（重要）
\c zoom_stats
GRANT ALL ON SCHEMA public TO zoom_user;

-- PostgreSQLから抜ける
\q
```

**重要**: `your_secure_password_here` は実際の強力なパスワードに置き換えてください。

### 2-4. 作成と権限設定の確認

```sql
-- ユーザーが作成されたか確認
\du
-- または
SELECT usename FROM pg_user WHERE usename = 'zoom_user';

-- データベースへの権限を確認
\l zoom_stats
-- または
SELECT datname, datdba::regrole FROM pg_database WHERE datname = 'zoom_stats';

-- スキーマへの権限を確認
\c zoom_stats

-- 方法1: メタコマンドで確認（最も簡単・確実）
\dn+ public

-- 方法2: スキーマの権限を確認（PostgreSQLのバージョンに依存しない方法）
SELECT nspname, nspowner::regrole FROM pg_namespace WHERE nspname = 'public';

-- 方法3: ユーザーがスキーマを使用できるか確認
SELECT has_schema_privilege('zoom_user', 'public', 'USAGE') as can_use, has_schema_privilege('zoom_user', 'public', 'CREATE') as can_create;
```

**期待される結果**:

- `\du` で `zoom_user` が表示される
- データベース `zoom_stats` の所有者または権限が `zoom_user` に付与されている
- `public` スキーマへの権限が `zoom_user` に付与されている

### 2-5. 接続テスト

```bash
# 作成したユーザーで接続テスト
psql -U zoom_user -d zoom_stats -h localhost

# パスワードを求められたら、設定したパスワードを入力
# 接続できれば成功（プロンプトが zoom_stats=> に変わる）
```

接続に成功したら、以下のコマンドで権限を確認:

```sql
-- 現在のユーザーを確認
SELECT current_user;

-- データベース名を確認
SELECT current_database();

-- スキーマの権限を確認（方法1: メタコマンド - 最も簡単）
\dn+ public

-- スキーマの権限を確認（方法2: 権限チェック関数）
SELECT has_schema_privilege(current_user, 'public', 'USAGE') as can_use, has_schema_privilege(current_user, 'public', 'CREATE') as can_create;

-- スキーマの所有者を確認
SELECT nspname, nspowner::regrole FROM pg_namespace WHERE nspname = 'public';

-- 接続を確認したら抜ける
\q
```

**期待される結果**:

- `current_user` が `zoom_user` である
- `current_database` が `zoom_stats` である
- `public` スキーマへの権限が表示される

**トラブルシューティング**: 接続できない場合

```bash
# PostgreSQLの認証設定を確認
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

以下の行を確認・修正（必要に応じて）:

```
# IPv4 local connections:
host    all             all             127.0.0.1/32            md5
```

変更後、PostgreSQL を再起動:

```bash
sudo systemctl restart postgresql
```

---

## ⚙️ ステップ 3: .env ファイルにデータベース接続情報を設定

### 3-1. バックエンドディレクトリに移動

```bash
# VPS上で、デプロイされたバックエンドディレクトリに移動
cd ~/zoom-app/backend
# または、実際のデプロイパスに応じて調整
```

### 3-2. .env ファイルの作成

```bash
# .envファイルを作成
nano .env
```

### 3-3. 環境変数の設定

以下の内容を記述（実際の値に置き換える）:

```env
PORT=3001

# データベース接続情報
DB_HOST=localhost
DB_PORT=5432
DB_NAME=zoom_stats
DB_USER=zoom_user
DB_PASSWORD=your_secure_password_here

# マイグレーション実行（初回のみ true に設定）
RUN_MIGRATIONS=false
```

**重要**:

- `DB_PASSWORD` は、ステップ 2-3 で設定したパスワードと一致させる
- `.env` ファイルは機密情報を含むため、Git にコミットしない（`.gitignore`に含まれていることを確認）

### 3-4. ファイルの保存と権限設定

```bash
# ファイルを保存（nanoの場合: Ctrl+O → Enter → Ctrl+X）

# セキュリティのため、.envファイルの権限を制限
chmod 600 .env

# ファイルの内容を確認（パスワードが正しく設定されているか）
cat .env
```

---

## 🔄 ステップ 4: マイグレーションを実行

### 4-1. 依存関係のインストール（まだの場合）

```bash
# バックエンドディレクトリで
cd ~/zoom-app/backend

# 依存関係をインストール
npm ci --production
```

### 4-2. マイグレーションの実行方法（VPS 環境推奨）

**重要**: VPS 環境では `npm ci --production` でインストールするため、`tsx` が含まれていません。そのため、環境変数を使う方法を推奨します。

#### 方法 A: 環境変数でマイグレーションを有効化（VPS 環境推奨）

```bash
# .envファイルで RUN_MIGRATIONS=true に設定
nano .env
# RUN_MIGRATIONS=true に変更

# バックエンドを起動（起動時にマイグレーションが実行される）
pm2 restart zoom-backend
# または、まだ起動していない場合
pm2 start dist/index.js --name zoom-backend

# ログで確認
pm2 logs zoom-backend
```

**期待される出力**:

```
✅ データベース接続成功: 2024-01-01 12:00:00+00
✅ データベーススキーマを作成しました
🚀 バックエンドAPIサーバーが起動しました: http://localhost:3001
```

**マイグレーション完了後**: `.env` ファイルで `RUN_MIGRATIONS=false` に戻してください。

#### 方法 B: 開発依存関係をインストールして実行（開発環境のみ）

```bash
# 開発依存関係も含めてインストール
npm install

# マイグレーションスクリプトを実行
npm run migrate
```

**注意**: 本番環境では通常、`npm ci --production` を使用するため、この方法は開発環境でのみ使用してください。

### 4-3. テーブルの確認

```bash
# PostgreSQLに接続
psql -U zoom_user -d zoom_stats -h localhost

# テーブル一覧を確認
\dt

# 期待される出力:
#                    List of relations
#  Schema |         Name          | Type  |   Owner
# --------+-----------------------+-------+----------
#  public | participant_stats     | table | zoom_user
#  public | room_overall_stats    | table | zoom_user
```

各テーブルの構造を確認:

```sql
-- participant_statsテーブルの構造を確認
\d participant_stats

-- room_overall_statsテーブルの構造を確認
\d room_overall_stats

-- PostgreSQLから抜ける
\q
```

---

## ✅ ステップ 5: 動作確認

### 5-1. バックエンド API の起動

```bash
# PM2でバックエンドを起動（既に起動している場合は再起動）
cd ~/zoom-app/backend

# PM2で起動
pm2 start dist/index.js --name zoom-backend

# または、既に起動している場合は再起動
pm2 restart zoom-backend

# PM2の状態を確認
pm2 list

# ログを確認
pm2 logs zoom-backend
```

**期待されるログ**:

```
✅ データベース接続成功: 2024-01-01 12:00:00+00
🚀 バックエンドAPIサーバーが起動しました: http://localhost:3001
📊 ヘルスチェック: http://localhost:3001/health
```

### 5-2. ヘルスチェック API の確認

```bash
# ローカルマシンから、またはVPS上で
curl http://localhost:3001/health
# または、外部から
curl http://your-server-ip/api/health
```

**期待されるレスポンス**:

```json
{ "status": "ok", "timestamp": 1234567890000 }
```

### 5-3. データベース接続の確認

```bash
# バックエンドのログで、データベース接続成功メッセージを確認
pm2 logs zoom-backend | grep "データベース接続"
```

### 5-4. 実際のデータ保存テスト（オプション）

フロントエンドから測定を開始し、データが保存されることを確認:

```bash
# PostgreSQLに接続
psql -U zoom_user -d zoom_stats -h localhost

# データが保存されているか確認
SELECT COUNT(*) FROM participant_stats;
SELECT COUNT(*) FROM room_overall_stats;

# 最新のデータを確認
SELECT * FROM participant_stats ORDER BY recorded_at DESC LIMIT 5;
SELECT * FROM room_overall_stats ORDER BY recorded_at DESC LIMIT 5;

\q
```

---

## 🔍 トラブルシューティング

### 問題 1: PostgreSQL に接続できない

**原因**: 認証設定の問題

**解決方法**:

```bash
# pg_hba.confを確認
sudo nano /etc/postgresql/*/main/pg_hba.conf

# 以下の行が存在することを確認
host    all             all             127.0.0.1/32            md5

# PostgreSQLを再起動
sudo systemctl restart postgresql
```

### 問題 2: マイグレーションが失敗する

**原因**: 権限不足

**解決方法**:

```sql
-- PostgreSQLに接続
sudo -u postgres psql

-- 権限を再付与
\c zoom_stats
GRANT ALL ON SCHEMA public TO zoom_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO zoom_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO zoom_user;

\q
```

### 問題 3: バックエンドが起動しない

**原因**: 環境変数の設定ミス

**解決方法**:

```bash
# .envファイルの内容を確認
cat ~/zoom-app/backend/.env

# データベース接続を手動でテスト
psql -U zoom_user -d zoom_stats -h localhost
# パスワードを入力して接続できるか確認

# PM2のログを詳細に確認
pm2 logs zoom-backend --lines 50
```

### 問題 4: ポート 5432 が使用できない

**原因**: ファイアウォール設定

**解決方法**:

```bash
# ファイアウォールの状態を確認
sudo ufw status

# PostgreSQLのポートは通常、外部からはアクセスしないため
# localhostからのみアクセス可能な設定で問題ありません
# ただし、必要に応じて:
sudo ufw allow 5432/tcp
```

---

## 📝 まとめ

1. ✅ **PostgreSQL のインストール**: `sudo apt-get install -y postgresql postgresql-contrib`
2. ✅ **データベースとユーザーの作成**: `CREATE DATABASE` と `CREATE USER`
3. ✅ **.env ファイルの設定**: データベース接続情報を記述
4. ✅ **マイグレーションの実行**: `npm run migrate`
5. ✅ **動作確認**: ヘルスチェック API とデータ保存の確認

これで、VPS 上で PostgreSQL が正常に動作し、アプリケーションからデータベースに接続できるようになりました。

---

## 🔐 セキュリティのベストプラクティス

1. **強力なパスワードを使用**: データベースユーザーのパスワードは複雑なものにする
2. **.env ファイルの保護**: `chmod 600 .env` で権限を制限
3. **外部アクセスの制限**: PostgreSQL は通常、localhost からのみアクセス可能にする
4. **定期的なバックアップ**: データベースのバックアップを定期的に取得

---

## 📚 参考資料

- [PostgreSQL 公式ドキュメント](https://www.postgresql.org/docs/)
- [ConoHa VPS 公式ドキュメント](https://www.conoha.jp/vps/)
- [PM2 公式ドキュメント](https://pm2.keymetrics.io/)
