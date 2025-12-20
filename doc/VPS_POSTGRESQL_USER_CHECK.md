# PostgreSQL ユーザーと権限の確認方法

## 📋 概要

作成したユーザー（例: `miji`）とその権限が正しく設定されているかを確認する手順です。

---

## ✅ 確認手順

### 1. PostgreSQL に接続

```bash
# postgresユーザーでPostgreSQLに接続
sudo -u postgres psql
```

### 2. ユーザーの存在確認

```sql
-- ユーザー一覧を表示
\du

-- または、特定のユーザーを確認
SELECT usename FROM pg_user WHERE usename = 'miji';
```

**期待される結果**: `miji` がリストに表示される

**現在の状態**: ✅ `miji` ユーザーは作成されています

---

### 3. データベースへの権限確認

```sql
-- データベースの権限を確認
\l zoom_stats

-- または、SQLで確認
SELECT
  datname,
  datdba::regrole AS owner,
  (SELECT string_agg(privilege_type, ', ')
   FROM (
     SELECT DISTINCT privilege_type
     FROM information_schema.database_privileges
     WHERE grantee = 'miji' AND object_catalog = 'zoom_stats'
   ) p
  ) AS privileges
FROM pg_database
WHERE datname = 'zoom_stats';
```

**期待される結果**:

- `Access privileges` に `miji=CTc/postgres` などが表示される
- `CTc` は `CREATE`, `TEMPORARY`, `CONNECT` 権限を意味します

**現在の状態**: ✅ `miji=CTc/postgres` が表示されているので、データベースへの権限は付与されています

---

### 4. スキーマ（public）への権限確認

```sql
-- zoom_statsデータベースに接続
\c zoom_stats

-- スキーマへの権限を確認
SELECT
  schema_name,
  grantee,
  privilege_type
FROM information_schema.schema_privileges
WHERE grantee = 'miji' AND schema_name = 'public';
```

**期待される結果**:

```
 schema_name | grantee | privilege_type
-------------+---------+----------------
 public      | miji    | USAGE
 public      | miji    | CREATE
```

**注意**: もし何も表示されない場合は、スキーマへの権限が付与されていません。以下のコマンドで付与してください：

```sql
-- スキーマへの権限を付与
GRANT ALL ON SCHEMA public TO miji;

-- 既存のテーブルへの権限も付与（重要）
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO miji;

-- 将来作成されるテーブルへの権限も付与
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO miji;

-- シーケンス（SERIAL型など）への権限も付与
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO miji;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO miji;
```

---

### 5. 実際の接続テスト

```bash
# mijiユーザーで接続テスト
psql -U miji -d zoom_stats -h localhost
```

接続に成功したら、以下のコマンドで権限を確認：

```sql
-- 現在のユーザーを確認
SELECT current_user;
-- 期待される結果: miji

-- データベース名を確認
SELECT current_database();
-- 期待される結果: zoom_stats

-- スキーマの権限を確認
SELECT schema_name, privilege_type
FROM information_schema.schema_privileges
WHERE grantee = current_user AND schema_name = 'public';

-- テーブルを作成できるかテスト（オプション）
CREATE TABLE test_permissions (id SERIAL PRIMARY KEY, name VARCHAR(100));
-- 成功すれば権限は正しく設定されています

-- テストテーブルを削除
DROP TABLE test_permissions;

-- PostgreSQLから抜ける
\q
```

---

## 📊 現在の状態の確認

ターミナルの出力から：

### ✅ 確認できていること

1. **ユーザーの作成**: `miji` ユーザーは作成されています

   - `\du` で `miji` が表示されている

2. **データベースへの権限**: 付与されています
   - `\l zoom_stats` で `miji=CTc/postgres` が表示されている
   - `CTc` は `CREATE`, `TEMPORARY`, `CONNECT` 権限

### ⚠️ 確認が必要なこと

1. **スキーマ（public）への権限**: 確認が必要です
   - 上記の「4. スキーマ（public）への権限確認」を実行してください

---

## 🔧 権限が不足している場合の対処

もしスキーマへの権限が不足している場合は、以下を実行：

```sql
-- postgresユーザーで接続
sudo -u postgres psql

-- zoom_statsデータベースに接続
\c zoom_stats

-- スキーマへの権限を付与
GRANT ALL ON SCHEMA public TO miji;

-- 既存のテーブルへの権限を付与
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO miji;

-- 将来作成されるテーブルへの権限も付与
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO miji;

-- シーケンスへの権限も付与
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO miji;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO miji;

-- 確認
SELECT schema_name, grantee, privilege_type
FROM information_schema.schema_privileges
WHERE grantee = 'miji' AND schema_name = 'public';

\q
```

---

## 📝 まとめ

1. ✅ **ユーザーの作成**: `miji` ユーザーは作成されています
2. ✅ **データベースへの権限**: `miji=CTc/postgres` で確認できています
3. ⚠️ **スキーマへの権限**: 確認が必要です（上記の手順で確認・設定してください）

権限が正しく設定されていれば、`miji` ユーザーでデータベースに接続し、テーブルの作成・操作ができるようになります。
