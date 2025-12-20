import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア
app.use(cors());
app.use(express.json());

// インメモリデータストア（開発用）
// 本番環境ではデータベースを使用してください
interface RoomStats {
  roomId: string;
  meetingId: string;
  meetingName?: string; // 打ち合わせ名
  roomName?: string; // ルーム名
  participants: any[];
  lastUpdated: number;
}

const roomStatsStore = new Map<string, RoomStats>();

// ルーム統計データの保存
app.post("/api/rooms/:roomId/stats", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { meetingId, meetingName, roomName, participants, recordedAt } =
      req.body;

    if (!meetingId || !participants || !Array.isArray(participants)) {
      return res.status(400).json({
        success: false,
        message: "無効なデータです。meetingIdとparticipantsが必要です。",
      });
    }

    // データを保存（インメモリ）
    roomStatsStore.set(roomId, {
      roomId,
      meetingId,
      meetingName: meetingName || undefined, // 打ち合わせ名
      roomName: roomName || undefined, // ルーム名
      participants,
      lastUpdated: recordedAt || Date.now(),
    });

    console.log(
      `[API] ルーム統計を保存: roomId=${roomId}, meetingName=${meetingName}, roomName=${roomName}`
    );

    res.json({
      success: true,
      message: "データを保存しました",
    });
  } catch (error) {
    console.error("データ保存エラー:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "サーバーエラーが発生しました",
    });
  }
});

// 全ルーム統計データの取得
app.get("/api/rooms/stats", async (req, res) => {
  try {
    const { meetingId } = req.query;

    if (!meetingId || typeof meetingId !== "string") {
      return res.status(400).json({
        success: false,
        message: "meetingIdが必要です",
      });
    }

    // 指定されたミーティングの全ルームを取得
    const rooms = Array.from(roomStatsStore.values())
      .filter((stats) => stats.meetingId === meetingId)
      .map((stats) => ({
        roomId: stats.roomId,
        meetingName: stats.meetingName, // 打ち合わせ名
        roomName: stats.roomName || `ルーム ${stats.roomId}`,
        participants: stats.participants,
        lastUpdated: stats.lastUpdated,
      }));

    res.json({
      meetingId,
      rooms,
    });
  } catch (error) {
    console.error("データ取得エラー:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "サーバーエラーが発生しました",
    });
  }
});

// デバッグ用: すべての保存データを取得
app.get("/api/debug/stats", (req, res) => {
  try {
    const allStats = Array.from(roomStatsStore.entries()).map(
      ([roomId, stats]) => ({
        roomId,
        meetingId: stats.meetingId,
        meetingName: stats.meetingName,
        roomName: stats.roomName,
        participantCount: stats.participants.length,
        lastUpdated: stats.lastUpdated,
        participants: stats.participants,
      })
    );

    res.json({
      totalRooms: roomStatsStore.size,
      rooms: allStats,
    });
  } catch (error) {
    console.error("デバッグデータ取得エラー:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "サーバーエラーが発生しました",
    });
  }
});

// ヘルスチェック
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(
    `🚀 バックエンドAPIサーバーが起動しました: http://localhost:${PORT}`
  );
  console.log(`📊 ヘルスチェック: http://localhost:${PORT}/health`);
});
