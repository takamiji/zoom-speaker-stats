import styles from "./ModeSelector.module.css";

interface ModeSelectorProps {
  onSelectMode: (mode: "measurement" | "host-view") => void;
}

/**
 * モード選択画面
 */
export function ModeSelector({ onSelectMode }: ModeSelectorProps) {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>モードを選択してください</h2>
      <div className={styles.modeGrid}>
        <button
          className={styles.modeCard}
          onClick={() => onSelectMode("measurement")}
        >
          <div className={styles.modeIcon}>📊</div>
          <h3 className={styles.modeTitle}>計測モード</h3>
          <p className={styles.modeDescription}>
            ブレイクアウトルーム内の話者データを計測・保存します
          </p>
        </button>
        <button
          className={styles.modeCard}
          onClick={() => onSelectMode("host-view")}
        >
          <div className={styles.modeIcon}>👁️</div>
          <h3 className={styles.modeTitle}>閲覧モード</h3>
          <p className={styles.modeDescription}>
            打ち合わせ名を入力して、全ブレイクアウトルームの計測状況を一覧表示します
          </p>
        </button>
      </div>
    </div>
  );
}
