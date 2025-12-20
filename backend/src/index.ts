import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { testConnection, closeConnection, pool } from "./db/connection.js";
import {
  saveParticipantStatsBatch,
  saveRoomOverallStats,
  getParticipantStatsByMeetingId,
  getParticipantStatsByMeeting,
  getRoomOverallStatsByMeeting,
} from "./db/repositories.js";
import { runMigrations } from "./db/migrations.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ミドルウェア
app.use(cors());
app.use(express.json());

// データベース接続のテスト（起動時）
testConnection().catch((err) => {
  console.error("データベース接続テスト失敗:", err);
});

// マイグレーション実行（起動時、環境変数で制御）
if (process.env.RUN_MIGRATIONS === "true") {
  runMigrations().catch((err) => {
    console.error("マイグレーション失敗:", err);
  });
}

// データベースを使用（インメモリストアは削除）

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

    if (!meetingName || !roomName) {
      return res.status(400).json({
        success: false,
        message: "無効なデータです。meetingNameとroomNameが必要です。",
      });
    }

    const recordedAtDate = new Date(recordedAt || Date.now());

    // 参加者統計をデータベースに保存
    const participantStatsList = participants.map((p: any) => ({
      meetingName,
      roomName,
      participantId: p.participantId,
      displayName: p.displayName,
      speakingCount: p.speakingCount,
      totalSpeakingMs: p.totalSpeakingMs,
      averageSpeakingTimeMs: p.averageSpeakingTimeMs,
      speakingShare: p.speakingShare,
      balanceScore: p.balanceScore,
      recordedAt: recordedAtDate,
    }));

    await saveParticipantStatsBatch(participantStatsList);

    // 全体統計を計算して保存
    const totalSpeakingTime = participants.reduce(
      (sum: number, p: any) => sum + (p.totalSpeakingMs || 0),
      0
    );
    const balanceScores = participants
      .map((p: any) => p.balanceScore)
      .filter((score: number | undefined) => score !== undefined) as number[];
    const avgBalanceScore =
      balanceScores.length > 0
        ? balanceScores.reduce((sum, score) => sum + score, 0) /
          balanceScores.length
        : null;

    // デバッグログ: 送られてくるデータを確認
    console.log(
      `[API] 全体統計計算: meetingName=${meetingName}, roomName=${roomName}, participants=${participants.length}`
    );
    participants.forEach((p: any, index: number) => {
      console.log(
        `[API] 参加者[${index}]: participantId=${p.participantId}, displayName=${p.displayName}, totalSpeakingMs=${p.totalSpeakingMs}, speakingCount=${p.speakingCount}`
      );
    });
    console.log(
      `[API] 計算結果: totalSpeakingTime=${totalSpeakingTime}, avgBalanceScore=${avgBalanceScore}`
    );

    await saveRoomOverallStats({
      meetingName,
      roomName,
      totalParticipants: participants.length,
      totalSpeakingTimeMs: totalSpeakingTime,
      averageBalanceScore: avgBalanceScore ?? undefined,
      recordedAt: recordedAtDate,
    });

    console.log(
      `[API] ルーム統計を保存: roomId=${roomId}, meetingName=${meetingName}, roomName=${roomName}, participants=${participants.length}, totalSpeakingTimeMs=${totalSpeakingTime}`
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

// 全ルーム統計データの取得（meetingIdで検索）
app.get("/api/rooms/stats", async (req, res) => {
  try {
    const { meetingId } = req.query;

    if (!meetingId || typeof meetingId !== "string") {
      return res.status(400).json({
        success: false,
        message: "meetingIdが必要です",
      });
    }

    // meetingIdをmeetingNameとして扱う（後で改善可能）
    const participantStats = await getParticipantStatsByMeetingId(meetingId);
    const overallStats = await getRoomOverallStatsByMeeting(meetingId);

    // ルームごとにグループ化
    const roomsMap = new Map<string, any>();

    // 参加者統計をルームごとにグループ化
    participantStats.forEach((stat) => {
      if (!roomsMap.has(stat.roomName)) {
        roomsMap.set(stat.roomName, {
          roomName: stat.roomName,
          participants: [],
          lastUpdated: stat.recordedAt.getTime(),
        });
      }
      const room = roomsMap.get(stat.roomName)!;
      room.participants.push({
        participantId: stat.participantId,
        displayName: stat.displayName,
        speakingCount: stat.speakingCount,
        totalSpeakingMs: stat.totalSpeakingMs,
        averageSpeakingTimeMs: stat.averageSpeakingTimeMs,
        speakingShare: stat.speakingShare,
        balanceScore: stat.balanceScore,
        isSpeaking: false, // DBには保存していないためfalse
        lastStartedSpeakingAt: null, // DBには保存していないためnull
      });
      // 最新の更新時刻を保持
      if (stat.recordedAt.getTime() > room.lastUpdated) {
        room.lastUpdated = stat.recordedAt.getTime();
      }
    });

    const rooms = Array.from(roomsMap.values());

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

// 打ち合わせ名で統計データを取得（新規）
app.get("/api/meetings/:meetingName/stats", async (req, res) => {
  try {
    const { meetingName } = req.params;

    if (!meetingName) {
      return res.status(400).json({
        success: false,
        message: "meetingNameが必要です",
      });
    }

    const participantStats = await getParticipantStatsByMeeting(meetingName);
    const overallStats = await getRoomOverallStatsByMeeting(meetingName);

    // ルームごとにグループ化
    const roomsMap = new Map<string, any>();

    // 参加者統計をルームごとにグループ化
    participantStats.forEach((stat) => {
      if (!roomsMap.has(stat.roomName)) {
        roomsMap.set(stat.roomName, {
          roomName: stat.roomName,
          participants: [],
          overallStats: null,
          lastUpdated: stat.recordedAt.getTime(),
        });
      }
      const room = roomsMap.get(stat.roomName)!;
      room.participants.push({
        participantId: stat.participantId,
        displayName: stat.displayName,
        speakingCount: stat.speakingCount,
        totalSpeakingMs: stat.totalSpeakingMs,
        averageSpeakingTimeMs: stat.averageSpeakingTimeMs,
        speakingShare: stat.speakingShare,
        balanceScore: stat.balanceScore,
        isSpeaking: false,
        lastStartedSpeakingAt: null,
      });
      if (stat.recordedAt.getTime() > room.lastUpdated) {
        room.lastUpdated = stat.recordedAt.getTime();
      }
    });

    // 全体統計を追加
    overallStats.forEach((stat) => {
      if (roomsMap.has(stat.roomName)) {
        const room = roomsMap.get(stat.roomName)!;
        room.overallStats = {
          totalParticipants: stat.totalParticipants,
          totalSpeakingTimeMs: stat.totalSpeakingTimeMs,
          averageBalanceScore: stat.averageBalanceScore,
        };
        if (stat.recordedAt.getTime() > room.lastUpdated) {
          room.lastUpdated = stat.recordedAt.getTime();
        }
      }
    });

    const rooms = Array.from(roomsMap.values());

    res.json({
      meetingName,
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

// 全体統計の保存
app.post("/api/rooms/:roomId/overall-stats", async (req, res) => {
  try {
    const { roomId } = req.params;
    const {
      meetingName,
      roomName,
      totalParticipants,
      totalSpeakingTimeMs,
      averageBalanceScore,
      recordedAt,
    } = req.body;

    if (!meetingName || !roomName || totalParticipants === undefined) {
      return res.status(400).json({
        success: false,
        message:
          "無効なデータです。meetingName、roomName、totalParticipantsが必要です。",
      });
    }

    await saveRoomOverallStats({
      meetingName,
      roomName,
      totalParticipants,
      totalSpeakingTimeMs: totalSpeakingTimeMs || 0,
      averageBalanceScore: averageBalanceScore ?? undefined,
      recordedAt: new Date(recordedAt || Date.now()),
    });

    console.log(
      `[API] 全体統計を保存: meetingName=${meetingName}, roomName=${roomName}`
    );

    res.json({
      success: true,
      message: "全体統計を保存しました",
    });
  } catch (error) {
    console.error("全体統計保存エラー:", error);
    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "サーバーエラーが発生しました",
    });
  }
});

// デバッグ用: すべての保存データを取得
app.get("/api/debug/stats", async (req, res) => {
  try {
    // データベースから全データを取得（簡易版）
    const query = `
      SELECT DISTINCT meeting_name, room_name, COUNT(*) as participant_count, MAX(recorded_at) as last_updated
      FROM participant_stats
      GROUP BY meeting_name, room_name
      ORDER BY meeting_name, room_name
    `;
    const result = await pool.query(query);
    const rooms = result.rows.map((row) => ({
      meetingName: row.meeting_name,
      roomName: row.room_name,
      participantCount: parseInt(row.participant_count, 10),
      lastUpdated: row.last_updated.getTime(),
    }));

    res.json({
      totalRooms: rooms.length,
      rooms,
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

// グレースフルシャットダウン
process.on("SIGTERM", async () => {
  console.log("SIGTERMシグナルを受信しました。接続を閉じます...");
  await closeConnection();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINTシグナルを受信しました。接続を閉じます...");
  await closeConnection();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(
    `🚀 バックエンドAPIサーバーが起動しました: http://localhost:${PORT}`
  );
  console.log(`📊 ヘルスチェック: http://localhost:${PORT}/health`);
});
