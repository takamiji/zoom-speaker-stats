import type { ParticipantStats } from '../types';
import { calculateBalanceScore, getBalanceStatus } from '../utils/statistics';
import styles from './OverallStats.module.css';

interface OverallStatsProps {
  participants: ParticipantStats[];
}

/**
 * 全体統計を表示するコンポーネント
 */
export function OverallStats({ participants }: OverallStatsProps) {
  if (participants.length === 0) {
    return null;
  }

  // 全体の発話時間の合計
  const totalSpeakingTime = participants.reduce(
    (sum, p) => sum + p.totalSpeakingMs,
    0
  );

  // 理想的な発話時間（全員が均等に話した場合）
  const idealSpeakingTime = totalSpeakingTime / participants.length;

  // 各参加者のバランススコアを計算
  const balanceScores = participants.map((p) =>
    calculateBalanceScore(p, participants)
  );

  // 平均バランススコア
  const avgBalanceScore = balanceScores.reduce((sum, score) => sum + score, 0) / balanceScores.length;
  const overallStatus = getBalanceStatus(Math.round(avgBalanceScore));

  // 発話時間の標準偏差を計算
  const mean = idealSpeakingTime;
  const variance =
    participants.reduce((sum, p) => {
      const diff = p.totalSpeakingMs - mean;
      return sum + diff * diff;
    }, 0) / participants.length;
  const standardDeviation = Math.sqrt(variance);
  const coefficientOfVariation = mean > 0 ? (standardDeviation / mean) * 100 : 0;

  // バランスの評価
  let balanceLevel: 'excellent' | 'good' | 'fair' | 'poor';
  if (coefficientOfVariation < 20) {
    balanceLevel = 'excellent';
  } else if (coefficientOfVariation < 40) {
    balanceLevel = 'good';
  } else if (coefficientOfVariation < 60) {
    balanceLevel = 'fair';
  } else {
    balanceLevel = 'poor';
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>全体統計</h3>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>参加者数</div>
          <div className={styles.statValue}>{participants.length}人</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>総発話時間</div>
          <div className={styles.statValue}>
            {Math.floor(totalSpeakingTime / 60000)}分
            {Math.floor((totalSpeakingTime % 60000) / 1000)}秒
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>平均バランススコア</div>
          <div
            className={styles.statValue}
            style={{ color: overallStatus.color }}
          >
            {Math.round(avgBalanceScore)}/100
            <span className={styles.statusIcon}>{overallStatus.icon}</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>発話バランス</div>
          <div
            className={styles.statValue}
            style={{ color: overallStatus.color }}
          >
            {balanceLevel === 'excellent' && '優秀'}
            {balanceLevel === 'good' && '良好'}
            {balanceLevel === 'fair' && '普通'}
            {balanceLevel === 'poor' && '偏りあり'}
          </div>
        </div>
      </div>
    </div>
  );
}


