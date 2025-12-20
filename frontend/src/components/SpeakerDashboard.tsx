import { useState, useEffect } from "react";
import { useZoomSpeakerStats } from "../hooks/useZoomSpeakerStats";
import { ParticipantTable } from "./ParticipantTable";
import { OverallStats } from "./OverallStats";
import {
  findMemberByName,
  getGroupMembers,
  type GroupData,
  type GroupMember,
} from "../utils/csvParser";
import styles from "./SpeakerDashboard.module.css";

interface SpeakerDashboardProps {
  groupData?: GroupData | null;
  selectedGroupId?: number | null;
}

/**
 * 発話者リアルタイム分析ダッシュボード
 */
export function SpeakerDashboard({
  groupData,
  selectedGroupId,
}: SpeakerDashboardProps = {}) {
  const {
    participants,
    currentSpeaker,
    currentSpeakerId,
    isLoading,
    error,
    logs,
  } = useZoomSpeakerStats();

  // 1秒ごとに再レンダリングして時間表示を更新
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * 現在話している人の経過時間を計算（1秒単位）
   */
  const getCurrentSpeakingTime = (): number => {
    if (
      currentSpeaker &&
      currentSpeaker.isSpeaking &&
      currentSpeaker.lastStartedSpeakingAt
    ) {
      const currentDuration =
        currentTime - currentSpeaker.lastStartedSpeakingAt;
      // 1秒単位に丸める
      const roundedDuration = Math.floor(currentDuration / 1000) * 1000;
      return currentSpeaker.totalSpeakingMs + roundedDuration;
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
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
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

  // 話者の詳細情報を取得
  const memberInfo =
    groupData && currentSpeaker
      ? (() => {
          try {
            return findMemberByName(currentSpeaker.displayName, groupData);
          } catch (err) {
            console.error("話者情報の取得エラー:", err);
            return null;
          }
        })()
      : null;

  // 選択したグループのメンバーを取得（安全に）
  let selectedGroupMembers: GroupMember[] = [];
  if (
    selectedGroupId !== null &&
    selectedGroupId !== undefined &&
    typeof selectedGroupId === "number" &&
    !isNaN(selectedGroupId) &&
    groupData !== null &&
    groupData !== undefined
  ) {
    try {
      selectedGroupMembers = getGroupMembers(selectedGroupId, groupData);
      console.log(
        "[SpeakerDashboard] グループメンバー取得:",
        "groupId:",
        selectedGroupId,
        "members:",
        selectedGroupMembers.length,
        "名",
        "groupData keys:",
        Object.keys(groupData)
      );
    } catch (err) {
      console.error("グループメンバーの取得エラー:", err);
      selectedGroupMembers = [];
    }
  } else {
    console.log(
      "[SpeakerDashboard] グループメンバー取得スキップ:",
      "selectedGroupId:",
      selectedGroupId,
      "groupData:",
      groupData ? "存在" : "null"
    );
  }

  return (
    <div className={styles.container}>
      {/* 話者の詳細情報（上部に表示） */}
      {memberInfo && (
        <div className={styles.speakerInfoBar}>
          <span>国籍: {memberInfo.国籍}</span>
          <span>学年: {memberInfo.学年}</span>
          <span>学部: {memberInfo.学部}</span>
          <span>興味関心: {memberInfo.興味関心キーワード}</span>
        </div>
      )}

      {/* 現在話している人 */}
      <section className={styles.currentSpeakerSection}>
        {currentSpeaker ? (
          <div className={styles.currentSpeakerCard}>
            <div className={styles.speakerIcon}>
              <span className={styles.icon}>🎤</span>
              <span className={styles.pulse}></span>
            </div>
            <div className={styles.speakerInfo}>
              <h2 className={styles.speakerName}>
                {currentSpeaker.displayName}
              </h2>
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
        <ParticipantTable
          participants={participants}
          currentSpeakerId={currentSpeakerId}
        />
      </section>

      {/* 選択したグループのメンバー一覧 */}
      {selectedGroupMembers.length > 0 && (
        <section className={styles.groupMembersSection}>
          <h3 className={styles.groupMembersTitle}>
            グループ {selectedGroupId} のメンバー ({selectedGroupMembers.length}
            名)
          </h3>
          <div className={styles.groupMembersList}>
            {selectedGroupMembers.map((member, index) => (
              <div key={index} className={styles.memberCard}>
                <div className={styles.memberName}>{member.名前}</div>
                <div className={styles.memberDetails}>
                  <span>国籍: {member.国籍}</span>
                  <span>学年: {member.学年}</span>
                  <span>学部: {member.学部}</span>
                  <span>興味関心: {member.興味関心キーワード}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ログ */}
      {logs.length > 0 && (
        <section className={styles.logSection}>
          <h3 className={styles.sectionTitle}>イベントログ</h3>
          <div className={styles.logContainer}>
            {logs.map((log, index) => (
              <div key={`log-${index}`} className={styles.logItem}>
                {log}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
