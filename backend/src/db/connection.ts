import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

/**
 * PostgreSQL接続プール
 */
export const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "zoom_stats",
  user: process.env.DB_USER || "zoom_user",
  password: process.env.DB_PASSWORD || "",
  max: 20, // 最大接続数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * データベース接続のテスト
 */
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT NOW()");
    client.release();
    console.log("✅ データベース接続成功:", result.rows[0].now);
    return true;
  } catch (error) {
    console.error("❌ データベース接続エラー:", error);
    return false;
  }
}

/**
 * データベース接続を閉じる
 */
export async function closeConnection(): Promise<void> {
  await pool.end();
}

