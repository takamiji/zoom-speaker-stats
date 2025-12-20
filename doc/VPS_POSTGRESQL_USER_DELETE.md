# PostgreSQL ユーザーの削除手順

## 📋 概要

誤って作成した PostgreSQL ユーザー `zoom_user` を削除する手順です。

---

## 🔧 ユーザー削除の手順

### ステップ 1: PostgreSQL に接続

```bash
# postgresユーザーでPostgreSQLに接続
sudo -u postgres psql
```

### ステップ 2: ユーザーが所有するオブジェクトを確認（オプション）

```sql
-- ユーザーが所有するデータベースやオブジェクトを確認
SELECT datname FROM pg_database WHERE datdba = (SELECT oid FROM pg_roles WHERE rolname = 'zoom_user');

-- ユーザーが所有するスキーマを確認
SELECT schema_name FROM information_schema.schema_privileges WHERE grantee = 'zoom_user';
```

### ステップ 3: ユーザーを削除

```sql
-- ユーザーを削除
DROP USER zoom_user;
```

**注意**: ユーザーがデータベースやオブジェクトを所有している場合、エラーが発生する可能性があります。その場合は、先に所有権を移譲するか、オブジェクトを削除する必要があります。

### ステップ 4: 削除の確認

```sql
-- ユーザー一覧を確認
\du
-- または
SELECT usename FROM pg_user;

-- zoom_userが表示されなければ削除成功
```

### ステップ 5: PostgreSQL から抜ける

```sql
\q
```

---

## ⚠️ エラーが発生した場合

### エラー: "cannot be dropped because some objects depend on it"

ユーザーがデータベースやオブジェクトを所有している場合、以下のいずれかの方法で対処します。

#### 方法 A: データベースの所有権を変更してから削除

```sql
-- データベースの所有権をpostgresに変更
ALTER DATABASE zoom_stats OWNER TO postgres;

-- その後、ユーザーを削除
DROP USER zoom_user;
```

#### 方法 B: データベースを削除してからユーザーを削除

```sql
-- データベースを削除（注意: すべてのデータが消えます）
DROP DATABASE zoom_stats;

-- その後、ユーザーを削除
DROP USER zoom_user;
```

#### 方法 C: CASCADE オプションを使用（注意: 関連オブジェクトも削除されます）

```sql
-- ユーザーとその所有オブジェクトをすべて削除（危険）
DROP USER zoom_user CASCADE;
```

**重要**: `CASCADE`オプションは、ユーザーが所有するすべてのオブジェクト（データベース、テーブルなど）を削除します。データを保持したい場合は、方法 A を使用してください。

---

## ✅ 削除後の再作成（必要に応じて）

ユーザーを削除した後、正しいパスワードで再作成する場合:

```sql
-- ユーザーを作成（実際の強力なパスワードを設定）
CREATE USER zoom_user WITH PASSWORD '実際の強力なパスワード';

-- データベースへの権限を付与
GRANT ALL PRIVILEGES ON DATABASE zoom_stats TO zoom_user;

-- スキーマへの権限も付与
\c zoom_stats
GRANT ALL ON SCHEMA public TO zoom_user;
```

---

## 📝 まとめ

1. `sudo -u postgres psql` で PostgreSQL に接続
2. `DROP USER zoom_user;` でユーザーを削除
3. エラーが発生した場合は、所有権を変更するか、`CASCADE`オプションを使用
4. `\du` で削除を確認

