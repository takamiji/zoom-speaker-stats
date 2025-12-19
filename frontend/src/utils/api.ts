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
  const url = `${API_BASE_URL}/rooms/${data.roomId}/stats`;
  console.log(`[API] saveRoomStats呼び出し: ${url}`, data);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] エラーレスポンス: ${response.status} ${response.statusText}`, errorText);
      let errorMessage = 'データの保存に失敗しました';
      try {
        const error = JSON.parse(errorText);
        errorMessage = error.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(`${response.status} ${response.statusText}: ${errorMessage}`);
    }
    
    console.log(`[API] saveRoomStats成功`);
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
      console.error(`[API] ネットワークエラー: ${err.message}`);
      throw new Error(`バックエンドAPIに接続できませんでした。API_BASE_URL: ${API_BASE_URL}。バックエンドサーバーが起動しているか確認してください。`);
    }
    throw err;
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

