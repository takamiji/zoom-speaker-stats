import type { ParticipantStats } from '../types';
import {
  calculateAverageSpeakingTime,
  calculateSpeakingShare,
  calculateBalanceScore,
  getBalanceStatus,
  formatTime,
  formatTimeShort,
} from '../utils/statistics';
import styles from './ParticipantTable.module.css';

interface ParticipantTableProps {
  participants: ParticipantStats[];
  currentSpeakerId: string | null;
}

/**
 * 参加者ごとの発話統計テーブル
 */
export function ParticipantTable({ participants, currentSpeakerId }: ParticipantTableProps) {
  /**
   * 現在話している人の経過時間を計算（表示用）
   */
  const getCurrentSpeakingTime = (stats: ParticipantStats): number => {
    if (stats.isSpeaking && stats.lastStartedSpeakingAt) {
      return stats.totalSpeakingMs + (Date.now() - stats.lastStartedSpeakingAt);
    }
    return stats.totalSpeakingMs;
  };

  if (participants.length === 0) {
    return (
      <div className={styles.empty}>
        <p>参加者がいません</p>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>表示名</th>
            <th>発話回数</th>
            <th>総発話時間</th>
            <th>平均発話時間</th>
            <th>発話シェア</th>
            <th>バランススコア</th>
            <th>状態</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((participant) => {
            const isCurrentSpeaker = participant.participantId === currentSpeakerId;
            const displayTime = getCurrentSpeakingTime(participant);
            
            // 統計計算
            const avgTime = calculateAverageSpeakingTime(participant);
            const share = calculateSpeakingShare(participant, participants);
            const balanceScore = calculateBalanceScore(participant, participants);
            const balanceStatus = getBalanceStatus(balanceScore);
            
            // 最大発話時間を取得（プログレスバー用）
            const maxTime = Math.max(...participants.map((p) => getCurrentSpeakingTime(p)), 1);
            const progressPercentage = (displayTime / maxTime) * 100;
            
            return (
              <tr
                key={participant.participantId}
                className={isCurrentSpeaker ? styles.currentSpeaker : ''}
              >
                <td>
                  <span className={styles.name}>
                    {participant.displayName}
                    {isCurrentSpeaker && <span className={styles.speakingBadge}>話し中</span>}
                  </span>
                </td>
                <td className={styles.count}>{participant.speakingCount}</td>
                <td className={styles.time}>
                  <div className={styles.timeWithProgress}>
                    <span>{formatTime(displayTime)}</span>
                    <div className={styles.progressBarContainer}>
                      <div
                        className={styles.progressBar}
                        style={{
                          width: `${progressPercentage}%`,
                          backgroundColor: balanceStatus.color,
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td className={styles.avgTime}>
                  {participant.speakingCount > 0 ? formatTimeShort(avgTime) : '-'}
                </td>
                <td className={styles.share}>
                  <div className={styles.shareContainer}>
                    <span>{share.toFixed(1)}%</span>
                    <div className={styles.shareBarContainer}>
                      <div
                        className={styles.shareBar}
                        style={{
                          width: `${share}%`,
                          backgroundColor: balanceStatus.color,
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td className={styles.score}>
                  <span style={{ color: balanceStatus.color }}>
                    {balanceScore}/100
                  </span>
                </td>
                <td className={styles.status}>
                  <span
                    className={styles.statusBadge}
                    style={{ backgroundColor: balanceStatus.color }}
                    title={balanceStatus.label}
                  >
                    {balanceStatus.icon}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

