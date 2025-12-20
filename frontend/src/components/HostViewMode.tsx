import { useState, useEffect } from "react";
import { fetchMeetingStatsByMeetingName } from "../utils/api";
import type { MeetingStatsResponse } from "../types";
import { formatTime } from "../utils/statistics";
import styles from "./HostViewMode.module.css";

interface HostViewModeProps {
  onBack: () => void;
}

/**
 * ホスト閲覧モード（打ち合わせ名で統計を表示）
 */
export function HostViewMode({ onBack }: HostViewModeProps) {
  const [meetingName, setMeetingName] = useState<string>("");
  const [inputMeetingName, setInputMeetingName] = useState<string>("");
  const [meetingStats, setMeetingStats] = useState<MeetingStatsResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // 打ち合わせ名が入力されている場合、10秒ごとにDBからデータを取得
  useEffect(() => {
    if (!meetingName.trim()) {
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const stats = await fetchMeetingStatsByMeetingName(meetingName);
        console.log("[HostViewMode] データ取得成功:", stats);
        // データ構造の検証
        if (!stats || !Array.isArray(stats.rooms)) {
          throw new Error("無効なデータ形式が返されました");
        }
        setMeetingStats(stats);
        setLastUpdated(Date.now());
      } catch (err) {
        console.error("[HostViewMode] データ取得エラー:", err);
        setError(
          err instanceof Error ? err.message : "データの取得に失敗しました"
        );
        setMeetingStats(null);
      } finally {
        setIsLoading(false);
      }
    };

    // 初回取得
    fetchData();

    // 10秒ごとに更新
    const intervalId = setInterval(fetchData, 10000);

    return () => clearInterval(intervalId);
  }, [meetingName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMeetingName.trim()) {
      setMeetingName(inputMeetingName.trim());
      setError(null);
    }
  };

  // デバッグ用: 状態をログ出力
  console.log("[HostViewMode] レンダリング:", {
    meetingName,
    isLoading,
    error,
    hasStats: !!meetingStats,
    roomsCount: meetingStats?.rooms?.length || 0,
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={onBack}>
          ← 戻る
        </button>
        <h2 className={styles.title}>閲覧モード</h2>
        {lastUpdated && (
          <div className={styles.lastUpdated}>
            最終更新: {new Date(lastUpdated).toLocaleTimeString("ja-JP")}
          </div>
        )}
      </div>

      {/* 打ち合わせ名入力フォーム */}
      <div className={styles.inputSection}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label htmlFor="meetingName" className={styles.label}>
            打ち合わせ名
          </label>
          <div className={styles.inputGroup}>
            <input
              id="meetingName"
              type="text"
              value={inputMeetingName}
              onChange={(e) => setInputMeetingName(e.target.value)}
              className={styles.input}
              placeholder="例: プロジェクト会議"
            />
            <button type="submit" className={styles.submitButton}>
              表示
            </button>
          </div>
        </form>
        {meetingName && (
          <div className={styles.currentMeetingName}>
            表示中: <strong>{meetingName}</strong>
          </div>
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className={styles.error}>
          <h3>エラー</h3>
          <p>{error}</p>
        </div>
      )}

      {/* 読み込み中 */}
      {isLoading && meetingName && (
        <div className={styles.loading}>データを取得しています...</div>
      )}

      {/* データ表示 */}
      {!isLoading &&
        !error &&
        meetingStats &&
        meetingStats.rooms &&
        meetingStats.rooms.length > 0 && (
          <div className={styles.roomsGrid}>
            {meetingStats.rooms.map((room) => {
              if (!room || !room.roomName) return null;
              return (
                <div key={room.roomName} className={styles.roomCard}>
                  <h3 className={styles.roomName}>{room.roomName}</h3>

                  {/* 全体統計 */}
                  {room.overallStats && (
                    <div className={styles.overallStats}>
                      <h4 className={styles.overallStatsTitle}>全体統計</h4>
                      <div className={styles.overallStatsGrid}>
                        <div className={styles.statItem}>
                          <span className={styles.statLabel}>参加者数</span>
                          <span className={styles.statValue}>
                            {room.overallStats.totalParticipants || 0}人
                          </span>
                        </div>
                        <div className={styles.statItem}>
                          <span className={styles.statLabel}>総発話時間</span>
                          <span className={styles.statValue}>
                            {formatTime(
                              room.overallStats.totalSpeakingTimeMs || 0
                            )}
                          </span>
                        </div>
                        {room.overallStats.averageBalanceScore !== null &&
                          room.overallStats.averageBalanceScore !==
                            undefined && (
                            <div className={styles.statItem}>
                              <span className={styles.statLabel}>
                                平均バランススコア
                              </span>
                              <span className={styles.statValue}>
                                {(() => {
                                  const score =
                                    room.overallStats.averageBalanceScore;
                                  if (typeof score === "number") {
                                    return score.toFixed(1);
                                  }
                                  const numScore = parseFloat(String(score));
                                  return isNaN(numScore)
                                    ? "-"
                                    : numScore.toFixed(1);
                                })()}
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {/* メンバー一覧 */}
                  <div className={styles.participantsSection}>
                    <h4 className={styles.participantsTitle}>メンバー統計</h4>
                    {room.participants && room.participants.length > 0 ? (
                      <div className={styles.participantsTable}>
                        <div className={styles.tableHeader}>
                          <div className={styles.tableCell}>名前</div>
                          <div className={styles.tableCell}>発話回数</div>
                          <div className={styles.tableCell}>総発話時間</div>
                          <div className={styles.tableCell}>平均発話時間</div>
                          <div className={styles.tableCell}>発話シェア</div>
                          <div className={styles.tableCell}>バランススコア</div>
                        </div>
                        {room.participants.map((participant) => {
                          if (!participant || !participant.participantId)
                            return null;
                          return (
                            <div
                              key={participant.participantId}
                              className={styles.tableRow}
                            >
                              <div className={styles.tableCell}>
                                {participant.displayName || "-"}
                              </div>
                              <div className={styles.tableCell}>
                                {participant.speakingCount || 0}回
                              </div>
                              <div className={styles.tableCell}>
                                {formatTime(participant.totalSpeakingMs || 0)}
                              </div>
                              <div className={styles.tableCell}>
                                {participant.averageSpeakingTimeMs
                                  ? formatTime(
                                      participant.averageSpeakingTimeMs
                                    )
                                  : "-"}
                              </div>
                              <div className={styles.tableCell}>
                                {participant.speakingShare !== null &&
                                participant.speakingShare !== undefined
                                  ? `${participant.speakingShare.toFixed(1)}%`
                                  : "-"}
                              </div>
                              <div className={styles.tableCell}>
                                {participant.balanceScore !== null &&
                                participant.balanceScore !== undefined
                                  ? participant.balanceScore
                                  : "-"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className={styles.empty}>
                        <p>メンバーが登録されていません</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* データなし */}
      {!isLoading &&
        !error &&
        meetingName &&
        meetingStats &&
        (!meetingStats.rooms || meetingStats.rooms.length === 0) && (
          <div className={styles.empty}>
            <p>打ち合わせ「{meetingName}」のデータが見つかりませんでした</p>
          </div>
        )}

      {/* 初期表示（打ち合わせ名未入力） */}
      {!meetingName && !error && (
        <div className={styles.empty}>
          <p>打ち合わせ名を入力して統計を表示してください</p>
        </div>
      )}
    </div>
  );
}
