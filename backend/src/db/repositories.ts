import { pool } from "./connection.js";

/**
 * 参加者統計データ
 */
export interface ParticipantStatsData {
  meetingName: string;
  roomName: string;
  participantId: string;
  displayName: string;
  speakingCount: number;
  totalSpeakingMs: number;
  averageSpeakingTimeMs?: number;
  speakingShare?: number;
  balanceScore?: number;
  recordedAt: Date;
}

/**
 * 全体統計データ
 */
export interface RoomOverallStatsData {
  meetingName: string;
  roomName: string;
  totalParticipants: number;
  totalSpeakingTimeMs: number;
  averageBalanceScore?: number;
  recordedAt: Date;
}

/**
 * 参加者統計を保存
 */
export async function saveParticipantStats(
  data: ParticipantStatsData
): Promise<void> {
  const query = `
    INSERT INTO participant_stats (
      meeting_name,
      room_name,
      participant_id,
      display_name,
      speaking_count,
      total_speaking_ms,
      average_speaking_time_ms,
      speaking_share,
      balance_score,
      recorded_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `;

  const values = [
    data.meetingName,
    data.roomName,
    data.participantId,
    data.displayName,
    data.speakingCount,
    data.totalSpeakingMs,
    data.averageSpeakingTimeMs ?? null,
    data.speakingShare ?? null,
    data.balanceScore ?? null,
    data.recordedAt,
  ];

  await pool.query(query, values);
}

/**
 * 複数の参加者統計を一括保存（トランザクション）
 */
export async function saveParticipantStatsBatch(
  statsList: ParticipantStatsData[]
): Promise<void> {
  if (statsList.length === 0) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const query = `
      INSERT INTO participant_stats (
        meeting_name,
        room_name,
        participant_id,
        display_name,
        speaking_count,
        total_speaking_ms,
        average_speaking_time_ms,
        speaking_share,
        balance_score,
        recorded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    for (const stats of statsList) {
      const values = [
        stats.meetingName,
        stats.roomName,
        stats.participantId,
        stats.displayName,
        stats.speakingCount,
        stats.totalSpeakingMs,
        stats.averageSpeakingTimeMs ?? null,
        stats.speakingShare ?? null,
        stats.balanceScore ?? null,
        stats.recordedAt,
      ];
      await client.query(query, values);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 全体統計を保存
 */
export async function saveRoomOverallStats(
  data: RoomOverallStatsData
): Promise<void> {
  const query = `
    INSERT INTO room_overall_stats (
      meeting_name,
      room_name,
      total_participants,
      total_speaking_time_ms,
      average_balance_score,
      recorded_at
    ) VALUES ($1, $2, $3, $4, $5, $6)
  `;

  const values = [
    data.meetingName,
    data.roomName,
    data.totalParticipants,
    data.totalSpeakingTimeMs,
    data.averageBalanceScore ?? null,
    data.recordedAt,
  ];

  await pool.query(query, values);
}

/**
 * 打ち合わせ名で参加者統計を取得（最新のデータのみ）
 */
export async function getParticipantStatsByMeeting(
  meetingName: string
): Promise<
  Array<{
    roomName: string;
    participantId: string;
    displayName: string;
    speakingCount: number;
    totalSpeakingMs: number;
    averageSpeakingTimeMs: number | null;
    speakingShare: number | null;
    balanceScore: number | null;
    recordedAt: Date;
  }>
> {
  const query = `
    SELECT DISTINCT ON (room_name, participant_id)
      room_name,
      participant_id,
      display_name,
      speaking_count,
      total_speaking_ms,
      average_speaking_time_ms,
      speaking_share,
      balance_score,
      recorded_at
    FROM participant_stats
    WHERE meeting_name = $1
    ORDER BY room_name, participant_id, recorded_at DESC
  `;

  const result = await pool.query(query, [meetingName]);
  return result.rows.map((row) => ({
    roomName: row.room_name,
    participantId: row.participant_id,
    displayName: row.display_name,
    speakingCount: row.speaking_count,
    totalSpeakingMs: row.total_speaking_ms,
    averageSpeakingTimeMs: row.average_speaking_time_ms,
    speakingShare: row.speaking_share,
    balanceScore: row.balance_score,
    recordedAt: row.recorded_at,
  }));
}

/**
 * 打ち合わせ名で全体統計を取得（最新のデータのみ）
 */
export async function getRoomOverallStatsByMeeting(
  meetingName: string
): Promise<
  Array<{
    roomName: string;
    totalParticipants: number;
    totalSpeakingTimeMs: number;
    averageBalanceScore: number | null;
    recordedAt: Date;
  }>
> {
  const query = `
    SELECT DISTINCT ON (room_name)
      room_name,
      total_participants,
      total_speaking_time_ms,
      average_balance_score,
      recorded_at
    FROM room_overall_stats
    WHERE meeting_name = $1
    ORDER BY room_name, recorded_at DESC
  `;

  const result = await pool.query(query, [meetingName]);
  return result.rows.map((row) => ({
    roomName: row.room_name,
    totalParticipants: row.total_participants,
    totalSpeakingTimeMs: row.total_speaking_time_ms,
    averageBalanceScore: row.average_balance_score,
    recordedAt: row.recorded_at,
  }));
}

/**
 * meetingIdで参加者統計を取得（最新のデータのみ）
 * 注意: meetingIdはmeetingNameとして扱う
 */
export async function getParticipantStatsByMeetingId(
  meetingId: string
): Promise<
  Array<{
    roomName: string;
    participantId: string;
    displayName: string;
    speakingCount: number;
    totalSpeakingMs: number;
    averageSpeakingTimeMs: number | null;
    speakingShare: number | null;
    balanceScore: number | null;
    recordedAt: Date;
  }>
> {
  // meetingIdをmeetingNameとして扱う（後で改善可能）
  return getParticipantStatsByMeeting(meetingId);
}

