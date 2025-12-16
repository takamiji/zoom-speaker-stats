import { useState, useEffect } from 'react';
import { fetchAllRoomsStats } from '../utils/api';
import type { AllRoomsStats } from '../types';
import styles from './HostViewMode.module.css';

interface HostViewModeProps {
  meetingId: string;
  onBack: () => void;
}

/**
 * ホスト閲覧モード（ホスト側）
 */
export function HostViewMode({ meetingId, onBack }: HostViewModeProps) {
  const [allRoomsStats, setAllRoomsStats] = useState<AllRoomsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // 10秒ごとにDBからデータを取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        const stats = await fetchAllRoomsStats(meetingId);
        setAllRoomsStats(stats);
        setLastUpdated(Date.now());
        setError(null);
      } catch (err) {
        console.error('データ取得エラー:', err);
        setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    // 初回取得
    fetchData();

    // 10秒ごとに更新
    const intervalId = setInterval(fetchData, 10000);

    return () => clearInterval(intervalId);
  }, [meetingId]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>データを取得しています...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>エラーが発生しました</h2>
          <p>{error}</p>
          <button onClick={onBack} className={styles.backButton}>
            戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={onBack}>
          ← 戻る
        </button>
        <h2 className={styles.title}>ホスト閲覧モード</h2>
        {lastUpdated && (
          <div className={styles.lastUpdated}>
            最終更新: {new Date(lastUpdated).toLocaleTimeString('ja-JP')}
          </div>
        )}
      </div>

      {allRoomsStats && allRoomsStats.rooms.length > 0 ? (
        <div className={styles.roomsGrid}>
          {allRoomsStats.rooms.map((room) => (
            <div key={room.roomId} className={styles.roomCard}>
              <h3 className={styles.roomName}>{room.roomName}</h3>
              <div className={styles.roomInfo}>
                <span>参加者数: {room.participants.length}人</span>
                <span>
                  最終更新: {new Date(room.lastUpdated).toLocaleTimeString('ja-JP')}
                </span>
              </div>
              <div className={styles.participantsList}>
                {room.participants.map((participant) => (
                  <div key={participant.participantId} className={styles.participant}>
                    <span className={styles.participantName}>{participant.displayName}</span>
                    <span className={styles.participantStats}>
                      発話回数: {participant.speakingCount}回 / 
                      総発話時間: {formatTime(participant.totalSpeakingMs)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <p>計測中のブレイクアウトルームがありません</p>
        </div>
      )}
    </div>
  );
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

