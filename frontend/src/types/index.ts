/**
 * 参加者の発話統計情報
 */
export interface ParticipantStats {
  participantId: string;
  displayName: string;
  speakingCount: number;
  totalSpeakingMs: number;
  isSpeaking: boolean;
  lastStartedSpeakingAt: number | null; // タイムスタンプ（ミリ秒）
  averageSpeakingTimeMs?: number; // 平均発話時間（ミリ秒）
  speakingShare?: number; // 発話シェア（0-100のパーセンテージ）
  balanceScore?: number; // バランススコア（0-100）
}

/**
 * 発話要約情報（モック）
 */
export interface SpeechSummary {
  participantId: string;
  displayName: string;
  transcript: string; // 文字起こし内容（モック）
  summary: string; // ChatGPT APIで要約した内容（モック）
  timestamp: number; // タイムスタンプ（ミリ秒）
}

/**
 * ミーティング情報
 */
export interface Meeting {
  id: string;
  meetingName: string;
  zoomMeetingId?: string;
  createdAt: number;
  endedAt?: number;
}

/**
 * ブレイクアウトルーム情報
 */
export interface BreakoutRoom {
  id: string;
  meetingId: string;
  roomName: string;
  roomNumber?: number;
  createdAt: number;
  endedAt?: number;
}

/**
 * ルーム統計データ（DB保存用）
 */
export interface RoomStatsData {
  roomId: string;
  meetingId: string;
  meetingName?: string; // 打ち合わせ名
  roomName?: string; // ルーム名
  participants: ParticipantStats[];
  recordedAt: number;
}

/**
 * 全ルーム統計データ（ホスト閲覧用）
 */
export interface AllRoomsStats {
  meetingId: string;
  rooms: {
    roomId: string;
    roomName: string;
    participants: ParticipantStats[];
    lastUpdated: number;
  }[];
}

/**
 * 打ち合わせ名で取得する統計データ（閲覧モード用）
 */
export interface MeetingStatsResponse {
  meetingName: string;
  rooms: Array<{
    roomName: string;
    participants: ParticipantStats[];
    overallStats: {
      totalParticipants: number;
      totalSpeakingTimeMs: number;
      averageBalanceScore: number | null;
    } | null;
    lastUpdated: number;
  }>;
}

/**
 * アプリモード
 */
export type AppMode = "measurement" | "host-view" | "select";
