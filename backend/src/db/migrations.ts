import { pool } from "./connection.js";

/**
 * データベーススキーマを作成
 */
export async function createSchema(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // participant_statsテーブルの作成
    await client.query(`
      CREATE TABLE IF NOT EXISTS participant_stats (
        id SERIAL PRIMARY KEY,
        meeting_name VARCHAR(255) NOT NULL,
        room_name VARCHAR(255) NOT NULL,
        participant_id VARCHAR(255) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        speaking_count INTEGER NOT NULL DEFAULT 0,
        total_speaking_ms BIGINT NOT NULL DEFAULT 0,
        average_speaking_time_ms BIGINT,
        speaking_share DECIMAL(5,2),
        balance_score INTEGER,
        recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // room_overall_statsテーブルの作成
    await client.query(`
      CREATE TABLE IF NOT EXISTS room_overall_stats (
        id SERIAL PRIMARY KEY,
        meeting_name VARCHAR(255) NOT NULL,
        room_name VARCHAR(255) NOT NULL,
        total_participants INTEGER NOT NULL,
        total_speaking_time_ms BIGINT NOT NULL DEFAULT 0,
        average_balance_score DECIMAL(5,2),
        recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // インデックスの作成
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_participant_stats_meeting_room 
      ON participant_stats(meeting_name, room_name)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_participant_stats_recorded_at 
      ON participant_stats(recorded_at)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_participant_stats_meeting_name 
      ON participant_stats(meeting_name)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_room_overall_stats_meeting_room 
      ON room_overall_stats(meeting_name, room_name)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_room_overall_stats_recorded_at 
      ON room_overall_stats(recorded_at)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_room_overall_stats_meeting_name 
      ON room_overall_stats(meeting_name)
    `);

    await client.query("COMMIT");
    console.log("✅ データベーススキーマを作成しました");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ データベーススキーマ作成エラー:", error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * マイグレーションを実行
 */
export async function runMigrations(): Promise<void> {
  try {
    await createSchema();
  } catch (error) {
    console.error("マイグレーションエラー:", error);
    throw error;
  }
}

