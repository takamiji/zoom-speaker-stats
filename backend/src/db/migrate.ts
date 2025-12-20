import { runMigrations } from "./migrations.js";
import { testConnection, closeConnection } from "./connection.js";

/**
 * マイグレーション実行スクリプト
 */
async function main() {
  try {
    console.log("🔄 データベース接続をテストしています...");
    const connected = await testConnection();
    if (!connected) {
      console.error("❌ データベースに接続できませんでした");
      process.exit(1);
    }

    console.log("🔄 マイグレーションを実行しています...");
    await runMigrations();
    console.log("✅ マイグレーションが完了しました");

    await closeConnection();
    process.exit(0);
  } catch (error) {
    console.error("❌ マイグレーションエラー:", error);
    await closeConnection();
    process.exit(1);
  }
}

main();

