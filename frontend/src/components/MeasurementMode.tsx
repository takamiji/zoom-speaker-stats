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
  const { participants, isLoading, error, logs } = useZoomSpeakerStats();
  const [isRecording, setIsRecording] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 10秒ごとにDBに保存
  useEffect(() => {
    if (!isRecording) return;
    
    // 参加者が0人の場合は保存しない（エラーを表示しない）
    if (participants.length === 0) {
      console.log('[MeasurementMode] 参加者が0人のため、保存をスキップします');
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        console.log(`[MeasurementMode] 定期保存開始: 参加者数=${participants.length}`);
        await saveRoomStats({
          roomId,
          meetingId,
          participants: participants,
          recordedAt: Date.now(),
        });
        setLastSavedAt(Date.now());
        setSaveError(null);
        console.log(`[MeasurementMode] 定期保存成功`);
      } catch (err) {
        console.error('[MeasurementMode] データ保存エラー:', err);
        const errorMessage = err instanceof Error ? err.message : 'データの保存に失敗しました';
        setSaveError(errorMessage);
        // エラーをログに記録（ユーザーには表示しない）
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
          <p style={{ whiteSpace: 'pre-wrap' }}>{error}</p>
        </div>
        {/* イベントログを表示 */}
        {logs.length > 0 && (
          <div className={styles.logSection}>
            <h3>イベントログ（デバッグ情報）</h3>
            <div className={styles.logNote}>
              <p>💡 <strong>開発者ツールについて:</strong></p>
              <p>Zoomアプリ内では開発者ツール（F12）が開けません。</p>
              <p>ログはこのセクションで確認できます。また、ブラウザで直接URLを開いた場合は、コンソール（F12）でも確認できます。</p>
            </div>
            <div className={styles.logContainer}>
              {logs.map((log, index) => (
                <div key={`log-${index}`} className={styles.logItem}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
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

