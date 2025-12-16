import type { RoomStatsData, AllRoomsStats } from '../types';

/**
 * バックエンドAPIのベースURL
 * 環境変数から取得、デフォルトは開発用
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

/**
 * ルーム統計データをDBに保存
 */
export async function saveRoomStats(data: RoomStatsData): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/rooms/${data.roomId}/stats`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'データの保存に失敗しました' }));
    throw new Error(error.message || 'データの保存に失敗しました');
  }
}

/**
 * 全ルームの統計データを取得（ホスト閲覧用）
 */
export async function fetchAllRoomsStats(meetingId: string): Promise<AllRoomsStats> {
  const response = await fetch(`${API_BASE_URL}/rooms/stats?meetingId=${meetingId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'データの取得に失敗しました' }));
    throw new Error(error.message || 'データの取得に失敗しました');
  }

  return response.json();
}

