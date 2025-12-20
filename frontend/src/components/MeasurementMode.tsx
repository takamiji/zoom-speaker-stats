import { useState, useEffect, useRef } from "react";
import { useZoomSpeakerStats } from "../hooks/useZoomSpeakerStats";
import { SpeakerDashboard } from "./SpeakerDashboard";
import { saveRoomStats } from "../utils/api";
import {
  parseCSV,
  getAvailableGroupIds,
  type GroupData,
} from "../utils/csvParser";
import {
  calculateAverageSpeakingTime,
  calculateSpeakingShare,
  calculateBalanceScore,
} from "../utils/statistics";
import type { ParticipantStats } from "../types";
import styles from "./MeasurementMode.module.css";

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
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  /**
   * 参加者データに詳細統計を追加
   */
  const enrichParticipantsWithStats = (
    participants: ParticipantStats[]
  ): ParticipantStats[] => {
    return participants.map((participant) => ({
      ...participant,
      averageSpeakingTimeMs: calculateAverageSpeakingTime(participant),
      speakingShare: calculateSpeakingShare(participant, participants),
      balanceScore: calculateBalanceScore(participant, participants),
    }));
  };

  // 10秒ごとにDBに保存
  useEffect(() => {
    if (!isRecording) return;

    const intervalId = setInterval(async () => {
      // 最新のparticipantsを取得
      const currentParticipants = participantsRef.current;

      // 参加者が0人の場合は保存しない（エラーを表示しない）
      if (currentParticipants.length === 0) {
        console.log(
          "[MeasurementMode] 参加者が0人のため、保存をスキップします"
        );
        return;
      }

      try {
        console.log(
          `[MeasurementMode] 定期保存開始: 参加者数=${currentParticipants.length}`
        );
        // 詳細統計を計算して追加
        const enrichedParticipants =
          enrichParticipantsWithStats(currentParticipants);

        // デバッグログ: 送信するデータを確認
        console.log(
          `[MeasurementMode] 送信データ: 参加者数=${enrichedParticipants.length}`
        );
        enrichedParticipants.forEach((p, index) => {
          console.log(
            `[MeasurementMode] 参加者[${index}]: participantId=${p.participantId}, displayName=${p.displayName}, totalSpeakingMs=${p.totalSpeakingMs}, speakingCount=${p.speakingCount}`
          );
        });
        const totalSpeakingTime = enrichedParticipants.reduce(
          (sum, p) => sum + (p.totalSpeakingMs || 0),
          0
        );
        console.log(
          `[MeasurementMode] 合計発話時間: ${totalSpeakingTime}ms (${Math.floor(
            totalSpeakingTime / 1000
          )}秒)`
        );

        await saveRoomStats({
          roomId,
          meetingId,
          meetingName,
          roomName,
          participants: enrichedParticipants,
          recordedAt: Date.now(),
        });
        setLastSavedAt(Date.now());
        setSaveError(null);
        console.log(`[MeasurementMode] 定期保存成功`);
      } catch (err) {
        console.error("[MeasurementMode] データ保存エラー:", err);
        const errorMessage =
          err instanceof Error ? err.message : "データの保存に失敗しました";
        setSaveError(errorMessage);
        // エラーをログに記録（ユーザーには表示しない）
      }
    }, 10000); // 10秒ごと

    return () => clearInterval(intervalId);
  }, [isRecording, roomId, meetingId, meetingName, roomName]);

  // 計測終了時に最終保存
  useEffect(() => {
    return () => {
      if (isRecording) {
        const currentParticipants = participantsRef.current;
        if (currentParticipants.length > 0) {
          // 詳細統計を計算して追加
          const enrichedParticipants =
            enrichParticipantsWithStats(currentParticipants);
          saveRoomStats({
            roomId,
            meetingId,
            meetingName,
            roomName,
            participants: enrichedParticipants,
            recordedAt: Date.now(),
          }).catch((err) => {
            console.error("最終保存エラー:", err);
          });
        }
      }
    };
  }, [isRecording, roomId, meetingId, meetingName, roomName]);

  const handleStart = () => {
    setIsRecording(true);
  };

  const handleStop = async () => {
    // 最終保存
    const currentParticipants = participantsRef.current;
    if (currentParticipants.length > 0) {
      try {
        // 詳細統計を計算して追加
        const enrichedParticipants =
          enrichParticipantsWithStats(currentParticipants);
        await saveRoomStats({
          roomId,
          meetingId,
          meetingName,
          roomName,
          participants: enrichedParticipants,
          recordedAt: Date.now(),
        });
        setLastSavedAt(Date.now());
      } catch (err) {
        console.error("最終保存エラー:", err);
        setSaveError(
          err instanceof Error ? err.message : "データの保存に失敗しました"
        );
      }
    }
    setIsRecording(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        if (!csvText) {
          throw new Error("ファイルの内容が空です");
        }
        const parsedData = parseCSV(csvText);
        setGroupData(parsedData);
        setCsvError(null);

        // 最初のグループを自動選択
        const groupIds = getAvailableGroupIds(parsedData);
        if (groupIds.length > 0) {
          setSelectedGroupId(groupIds[0]);
        }
      } catch (err) {
        console.error("CSVパースエラー:", err);
        setCsvError(
          err instanceof Error
            ? err.message
            : "CSVファイルの読み込みに失敗しました"
        );
        setGroupData(null);
        setSelectedGroupId(null);
      }
    };
    reader.onerror = () => {
      setCsvError("ファイルの読み込みに失敗しました");
      setGroupData(null);
      setSelectedGroupId(null);
    };
    reader.readAsText(file, "UTF-8");
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
          <p style={{ whiteSpace: "pre-wrap" }}>{error}</p>
        </div>
        {/* イベントログを表示 */}
        {logs.length > 0 && (
          <div className={styles.logSection}>
            <h3>イベントログ（デバッグ情報）</h3>
            <div className={styles.logNote}>
              <p>
                💡 <strong>開発者ツールについて:</strong>
              </p>
              <p>Zoomアプリ内では開発者ツール（F12）が開けません。</p>
              <p>
                ログはこのセクションで確認できます。また、ブラウザで直接URLを開いた場合は、コンソール（F12）でも確認できます。
              </p>
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

      {/* CSVファイルアップロードとグループ選択 */}
      <div className={styles.csvSection}>
        <div className={styles.csvUpload}>
          <label htmlFor="csvFile" className={styles.fileLabel}>
            CSVファイルを選択
          </label>
          <input
            id="csvFile"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className={styles.fileInput}
          />
          {csvError && <span className={styles.csvError}>⚠️ {csvError}</span>}
        </div>

        {groupData && (
          <div className={styles.groupSelector}>
            <label htmlFor="groupSelect" className={styles.groupLabel}>
              グループ:
            </label>
            <select
              id="groupSelect"
              value={selectedGroupId || ""}
              onChange={(e) => setSelectedGroupId(parseInt(e.target.value, 10))}
              className={styles.groupSelect}
            >
              {getAvailableGroupIds(groupData).map((groupId) => (
                <option key={groupId} value={groupId}>
                  グループ {groupId}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isRecording && (
        <div className={styles.statusBar}>
          <span className={styles.recordingIndicator}>● 計測中</span>
          {lastSavedAt && (
            <span className={styles.lastSaved}>
              最終保存: {new Date(lastSavedAt).toLocaleTimeString("ja-JP")}
            </span>
          )}
          {saveError && (
            <span className={styles.saveError}>⚠️ {saveError}</span>
          )}
        </div>
      )}

      {isRecording ? (
        <SpeakerDashboard
          groupData={groupData}
          selectedGroupId={selectedGroupId}
        />
      ) : (
        <div className={styles.waiting}>
          <p>「計測開始」ボタンを押して計測を開始してください</p>
        </div>
      )}
    </div>
  );
}
