import { useState } from "react";
import styles from "./MeasurementSetup.module.css";

interface MeasurementSetupProps {
  onStart: (meetingName: string, roomName: string) => void;
  onBack: () => void;
  defaultMeetingName?: string;
  defaultRoomName?: string;
}

/**
 * 計測モードの初期入力画面
 */
export function MeasurementSetup({
  onStart,
  onBack,
  defaultMeetingName = "",
  defaultRoomName = "",
}: MeasurementSetupProps) {
  const [meetingName, setMeetingName] = useState(defaultMeetingName);
  const [roomName, setRoomName] = useState(defaultRoomName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (meetingName.trim() && roomName.trim()) {
      onStart(meetingName.trim(), roomName.trim());
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>計測モード</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="meetingName" className={styles.label}>
            打ち合わせ名
          </label>
          <input
            id="meetingName"
            type="text"
            value={meetingName}
            onChange={(e) => setMeetingName(e.target.value)}
            className={styles.input}
            placeholder="例: プロジェクト会議"
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="roomName" className={styles.label}>
            ブレイクアウトルーム名
          </label>
          <input
            id="roomName"
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className={styles.input}
            placeholder="例: グループ1"
            required
          />
        </div>
        <div className={styles.buttons}>
          <button type="button" onClick={onBack} className={styles.backButton}>
            戻る
          </button>
          <button type="submit" className={styles.startButton}>
            計測開始
          </button>
        </div>
      </form>
    </div>
  );
}
