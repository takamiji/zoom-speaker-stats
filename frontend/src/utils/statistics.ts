import type { ParticipantStats } from "../types";

/**
 * 統計計算用のユーティリティ関数
 */

/**
 * 1回あたりの平均発話時間を計算（ミリ秒）
 * BIGINT型のカラムに保存するため、整数に丸める
 */
export function calculateAverageSpeakingTime(stats: ParticipantStats): number {
  if (stats.speakingCount === 0) return 0;
  return Math.round(stats.totalSpeakingMs / stats.speakingCount);
}

/**
 * 発話シェア（全体に占める割合）を計算（0-100のパーセンテージ）
 */
export function calculateSpeakingShare(
  participantStats: ParticipantStats,
  allParticipants: ParticipantStats[]
): number {
  const totalSpeakingTime = allParticipants.reduce(
    (sum, p) => sum + p.totalSpeakingMs,
    0
  );
  if (totalSpeakingTime === 0) return 0;
  return (participantStats.totalSpeakingMs / totalSpeakingTime) * 100;
}

/**
 * 発話バランススコアを計算（0-100のスコア）
 * 理想的な発話時間からの偏差を基に計算
 */
export function calculateBalanceScore(
  participantStats: ParticipantStats,
  allParticipants: ParticipantStats[]
): number {
  if (allParticipants.length === 0) return 100;

  const totalSpeakingTime = allParticipants.reduce(
    (sum, p) => sum + p.totalSpeakingMs,
    0
  );
  const idealSpeakingTime = totalSpeakingTime / allParticipants.length;

  if (idealSpeakingTime === 0) return 100;

  const deviation =
    Math.abs(participantStats.totalSpeakingMs - idealSpeakingTime) /
    idealSpeakingTime;
  const score = Math.max(0, Math.min(100, 100 - deviation * 100));

  return Math.round(score);
}

/**
 * バランススコアに基づいて状態を判定
 */
export function getBalanceStatus(score: number): {
  status: "good" | "fair" | "poor";
  label: string;
  color: string;
  icon: string;
} {
  if (score >= 80) {
    return {
      status: "good",
      label: "良好",
      color: "#4caf50",
      icon: "🟢",
    };
  } else if (score >= 60) {
    return {
      status: "fair",
      label: "普通",
      color: "#ff9800",
      icon: "🟡",
    };
  } else {
    return {
      status: "poor",
      label: "偏り",
      color: "#f44336",
      icon: "🔴",
    };
  }
}

/**
 * ミリ秒を mm:ss 形式に変換
 */
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

/**
 * ミリ秒を秒単位で表示（短い時間用）
 */
export function formatTimeShort(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}秒`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}分${seconds}秒`;
}
