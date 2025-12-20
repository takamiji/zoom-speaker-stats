# PostgreSQL ユーザー作成の修正手順

## 📋 状況

`zoom_user` ではなく `miji` というユーザーが作成されてしまった場合の修正手順です。

---

## 🔍 現在の状況確認

ターミナルの出力から、以下の状況が確認できます：

- ✅ データベース `zoom_stats` は作成されている
- ❌ ユーザー `zoom_user` が存在しない
- ⚠️ ユーザー `miji` が作成されている

---

## 🔧 修正手順

### ステップ 1: 現在のユーザーを確認

```sql
-- PostgreSQLに接続（postgresユーザーで）
sudo -u postgres psql

-- ユーザー一覧を確認
\du
```

### ステップ 2: miji ユーザーの権限を確認

```sql
-- mijiユーザーが所有するデータベースを確認
SELECT datname FROM pg_database WHERE datdba = (SELECT oid FROM pg_roles WHERE rolname = 'miji');

-- zoom_statsデータベースの権限を確認
\l zoom_stats
```

### ステップ 3: miji ユーザーを削除（オプション）

`miji` ユーザーが不要な場合は削除できます：

```sql
-- データベースの所有権をpostgresに変更（必要に応じて）
ALTER DATABASE zoom_stats OWNER TO postgres;

-- mijiユーザーを削除
DROP USER miji;
```

**注意**: `miji` ユーザーを今後も使用する場合は、このステップをスキップしてください。

### ステップ 4: zoom_user ユーザーを作成

```sql
-- ユーザーを作成（実際の強力なパスワードを設定）
CREATE USER zoom_user WITH PASSWORD '実際の強力なパスワード';

-- データベースへの権限を付与
GRANT ALL PRIVILEGES ON DATABASE zoom_stats TO zoom_user;

-- スキーマへの権限も付与（重要）
\c zoom_stats
GRANT ALL ON SCHEMA public TO zoom_user;
```

### ステップ 5: 作成と権限設定の確認

```sql
-- ユーザーが作成されたか確認
\du
-- zoom_userが表示されれば成功

-- データベースへの権限を確認
\l zoom_stats
-- zoom_userへの権限が表示されれば成功

-- スキーマへの権限を確認
SELECT schema_name, grantee, privilege_type
FROM information_schema.schema_privileges
WHERE grantee = 'zoom_user' AND schema_name = 'public';
```

### ステップ 6: 接続テスト

```bash
# PostgreSQLから抜ける
\q

# 作成したユーザーで接続テスト
psql -U zoom_user -d zoom_stats -h localhost
```

パスワードを求められたら、設定したパスワードを入力します。接続できれば成功です。

```sql
-- 現在のユーザーを確認
SELECT current_user;
-- 期待される結果: zoom_user

-- データベース名を確認
SELECT current_database();
-- 期待される結果: zoom_stats

-- 接続を確認したら抜ける
\q
```

---

## ⚠️ よくある間違い

### 間違い 1: ユーザー名を間違えて入力

```sql
-- ❌ 間違い: ユーザー名を間違える
CREATE USER miji WITH PASSWORD 'password';

-- ✅ 正しい: 正しいユーザー名を使用
CREATE USER zoom_user WITH PASSWORD 'password';
```

### 間違い 2: データベースに接続せずにスキーマ権限を付与

```sql
-- ❌ 間違い: データベースに接続せずに権限を付与
GRANT ALL ON SCHEMA public TO zoom_user;

-- ✅ 正しい: データベースに接続してから権限を付与
\c zoom_stats
GRANT ALL ON SCHEMA public TO zoom_user;
```

### 間違い 3: パスワードをそのまま使用

```sql
-- ❌ 間違い: サンプルパスワードをそのまま使用
CREATE USER zoom_user WITH PASSWORD 'your_secure_password_here';

-- ✅ 正しい: 実際の強力なパスワードを設定
CREATE USER zoom_user WITH PASSWORD 'MyStr0ng!P@ssw0rd2024';
```

---

## 📝 まとめ

1. `\du` で現在のユーザーを確認
2. 必要に応じて `miji` ユーザーを削除
3. `CREATE USER zoom_user` で正しいユーザーを作成
4. `GRANT` コマンドで権限を付与
5. `\du` と `\l zoom_stats` で確認
6. `psql -U zoom_user -d zoom_stats` で接続テスト

---

## 🔄 完全にやり直す場合

すべてを削除して最初からやり直す場合：

```sql
-- PostgreSQLに接続
sudo -u postgres psql

-- データベースを削除（注意: すべてのデータが消えます）
DROP DATABASE zoom_stats;

-- ユーザーを削除
DROP USER miji;
DROP USER zoom_user;  -- 既に存在する場合

-- データベースを再作成
CREATE DATABASE zoom_stats;

-- ユーザーを作成
CREATE USER zoom_user WITH PASSWORD '実際の強力なパスワード';

-- 権限を付与
GRANT ALL PRIVILEGES ON DATABASE zoom_stats TO zoom_user;
\c zoom_stats
GRANT ALL ON SCHEMA public TO zoom_user;
```
