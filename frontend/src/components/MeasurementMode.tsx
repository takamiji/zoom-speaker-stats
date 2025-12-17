import { useState, useEffect } from 'react';
import { useZoomSpeakerStats } from '../hooks/useZoomSpeakerStats';
import { SpeakerDashboard } from './SpeakerDashboard';
import { saveRoomStats } from '../utils/api';
import styles from './MeasurementMode.module.css';

interface MeasurementModeProps {
  meetingId: string;
  roomId: string;
  meetingName: string;
  roomName: string;
  onBack: () => void;
}

/**
 * 計測モード（ブレイクアウトルーム側）
 */
export function MeasurementMode({
  meetingId,
  roomId,
  meetingName,
  roomName,
  onBack,
}: MeasurementModeProps) {
  const { participants, isLoading, error } = useZoomSpeakerStats();
  const [isRecording, setIsRecording] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 10秒ごとにDBに保存
  useEffect(() => {
    if (!isRecording) return;

    const intervalId = setInterval(async () => {
      try {
        await saveRoomStats({
          roomId,
          meetingId,
          participants: participants,
          recordedAt: Date.now(),
        });
        setLastSavedAt(Date.now());
        setSaveError(null);
      } catch (err) {
        console.error('データ保存エラー:', err);
        setSaveError(err instanceof Error ? err.message : 'データの保存に失敗しました');
      }
    }, 10000); // 10秒ごと

    return () => clearInterval(intervalId);
  }, [isRecording, roomId, meetingId, participants]);

  // 計測終了時に最終保存
  useEffect(() => {
    return () => {
      if (isRecording && participants.length > 0) {
        saveRoomStats({
          roomId,
          meetingId,
          participants: participants,
          recordedAt: Date.now(),
        }).catch((err) => {
          console.error('最終保存エラー:', err);
        });
      }
    };
  }, [isRecording, roomId, meetingId, participants]);

  const handleStart = () => {
    setIsRecording(true);
  };

  const handleStop = async () => {
    // 最終保存
    if (participants.length > 0) {
      try {
        await saveRoomStats({
          roomId,
          meetingId,
          participants: participants,
          recordedAt: Date.now(),
        });
        setLastSavedAt(Date.now());
      } catch (err) {
        console.error('最終保存エラー:', err);
        setSaveError(err instanceof Error ? err.message : 'データの保存に失敗しました');
      }
    }
    setIsRecording(false);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Zoom Apps SDKを初期化しています...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>エラーが発生しました</h2>
          <p>{error}</p>
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
        <div className={styles.info}>
          <h2 className={styles.meetingName}>{meetingName}</h2>
          <p className={styles.roomName}>ブレイクアウトルーム: {roomName}</p>
        </div>
        <div className={styles.controls}>
          {!isRecording ? (
            <button className={styles.startButton} onClick={handleStart}>
              計測開始
            </button>
          ) : (
            <button className={styles.stopButton} onClick={handleStop}>
              計測停止
            </button>
          )}
        </div>
      </div>

      {isRecording && (
        <div className={styles.statusBar}>
          <span className={styles.recordingIndicator}>● 計測中</span>
          {lastSavedAt && (
            <span className={styles.lastSaved}>
              最終保存: {new Date(lastSavedAt).toLocaleTimeString('ja-JP')}
            </span>
          )}
          {saveError && (
            <span className={styles.saveError}>⚠️ {saveError}</span>
          )}
        </div>
      )}

      {isRecording ? (
        <SpeakerDashboard />
      ) : (
        <div className={styles.waiting}>
          <p>「計測開始」ボタンを押して計測を開始してください</p>
        </div>
      )}
    </div>
  );
}

