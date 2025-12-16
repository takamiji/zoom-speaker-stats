import { useZoomSpeakerStats } from '../hooks/useZoomSpeakerStats';
import { ParticipantTable } from './ParticipantTable';
import { OverallStats } from './OverallStats';
import styles from './SpeakerDashboard.module.css';

/**
 * 発話者リアルタイム分析ダッシュボード
 */
export function SpeakerDashboard() {
  const { participants, currentSpeaker, currentSpeakerId, isLoading, error, logs, speechSummaries } = useZoomSpeakerStats();

  /**
   * 現在話している人の経過時間を計算
   */
  const getCurrentSpeakingTime = (): number => {
    if (currentSpeaker && currentSpeaker.isSpeaking && currentSpeaker.lastStartedSpeakingAt) {
      return currentSpeaker.totalSpeakingMs + (Date.now() - currentSpeaker.lastStartedSpeakingAt);
    }
    return currentSpeaker?.totalSpeakingMs || 0;
  };

  /**
   * ミリ秒を mm:ss 形式に変換
   */
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <p>Zoom Apps SDKを初期化しています...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>エラーが発生しました</h2>
          <p>{error}</p>
          <p className={styles.errorNote}>
            注意: 開発環境ではZoom Apps SDKが正常に動作しない場合があります。
            <br />
            実際のZoomミーティング内でアプリとして起動する必要があります。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* 現在話している人 */}
      <section className={styles.currentSpeakerSection}>
        {currentSpeaker ? (
          <div className={styles.currentSpeakerCard}>
            <div className={styles.speakerIcon}>
              <span className={styles.icon}>🎤</span>
              <span className={styles.pulse}></span>
            </div>
            <div className={styles.speakerInfo}>
              <h2 className={styles.speakerName}>{currentSpeaker.displayName}</h2>
              <p className={styles.speakerTime}>
                発話時間: {formatTime(getCurrentSpeakingTime())}
              </p>
            </div>
          </div>
        ) : (
          <div className={styles.noSpeakerCard}>
            <p>現在話している人はいません</p>
          </div>
        )}
      </section>

      {/* 全体統計 */}
      <section className={styles.statsSection}>
        <OverallStats participants={participants} />
      </section>

      {/* 参加者統計テーブル */}
      <section className={styles.tableSection}>
        <h3 className={styles.sectionTitle}>参加者ごとの発話統計</h3>
        <ParticipantTable participants={participants} currentSpeakerId={currentSpeakerId} />
      </section>

      {/* ログ */}
      {(logs.length > 0 || speechSummaries.length > 0) && (
        <section className={styles.logSection}>
          <h3 className={styles.sectionTitle}>イベントログ</h3>
          <div className={styles.logContainer}>
            {/* 通常のイベントログ */}
            {logs.map((log, index) => (
              <div key={`log-${index}`} className={styles.logItem}>
                {log}
              </div>
            ))}
            
            {/* 発話要約（モック） */}
            {speechSummaries.map((summary, index) => {
              const timestamp = new Date(summary.timestamp).toLocaleTimeString('ja-JP');
              return (
                <div key={`summary-${index}`} className={styles.summaryItem}>
                  <div className={styles.summaryHeader}>
                    <span className={styles.summaryTimestamp}>[{timestamp}]</span>
                    <span className={styles.summarySpeaker}>{summary.displayName}</span>
                    <span className={styles.summaryLabel}>発話要約</span>
                  </div>
                  <div className={styles.summaryContent}>
                    <div className={styles.summaryText}>
                      <strong>要約:</strong> {summary.summary}
                    </div>
                    <details className={styles.summaryDetails}>
                      <summary className={styles.summaryToggle}>文字起こしを表示</summary>
                      <div className={styles.transcriptText}>{summary.transcript}</div>
                    </details>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

