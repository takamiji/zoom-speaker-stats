# PostgreSQL テーブル削除手順

## 📋 概要

既存の`participant_stats`と`room_overall_stats`テーブルを削除する手順です。

---

## ⚠️ 警告

**この操作は既存のデータをすべて削除します。**  
削除前にバックアップが必要な場合は、事前にバックアップを取得してください。

---

## 🔧 テーブル削除手順

### ステップ 1: PostgreSQL に接続

```bash
# VPSにSSH接続
ssh user@your-server-ip

# PostgreSQLに接続（mijiユーザーで）
psql -U miji -d zoom_stats -h localhost
```

### ステップ 2: 既存データの確認（オプション）

```sql
-- 参加者統計の件数を確認
SELECT COUNT(*) FROM participant_stats;

-- 全体統計の件数を確認
SELECT COUNT(*) FROM room_overall_stats;

-- 最新のデータを確認（必要に応じて）
SELECT * FROM participant_stats ORDER BY recorded_at DESC LIMIT 5;
SELECT * FROM room_overall_stats ORDER BY recorded_at DESC LIMIT 5;
```

### ステップ 3: テーブルを削除

```sql
-- 参加者統計テーブルを削除
DROP TABLE IF EXISTS participant_stats;

-- 全体統計テーブルを削除
DROP TABLE IF EXISTS room_overall_stats;

-- 削除の確認
\dt
```

**期待される出力**: テーブルが表示されない（空）

### ステップ 4: PostgreSQL から抜ける

```sql
\q
```

---

## ✅ 削除完了後の確認

```bash
# PostgreSQLに再接続
psql -U miji -d zoom_stats -h localhost

# テーブル一覧を確認（空であることを確認）
\dt

\q
```

---

## 📝 次のステップ

テーブル削除後、新しいマイグレーションを実行して、ユニーク制約付きのテーブルを再作成してください。
