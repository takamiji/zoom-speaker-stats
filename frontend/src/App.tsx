import { useState, useEffect } from "react";
import { ModeSelector } from "./components/ModeSelector";
import { MeasurementSetup } from "./components/MeasurementSetup";
import { MeasurementMode } from "./components/MeasurementMode";
import { HostViewMode } from "./components/HostViewMode";
// AppMode型を拡張
type ExtendedAppMode =
  | "select"
  | "measurement-setup"
  | "measurement-active"
  | "host-view";
import "./App.css";

/**
 * メインアプリケーションコンポーネント
 */
function App() {
  const [mode, setMode] = useState<ExtendedAppMode>("select");
  const [meetingId, setMeetingId] = useState<string>("");
  const [meetingName, setMeetingName] = useState<string>("");
  const [roomName, setRoomName] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");

  // ミーティングID取得
  useEffect(() => {
    const checkMeeting = async () => {
      try {
        const zoomSdk = (window as any).ZoomAppsSDK;
        if (zoomSdk) {
          // ミーティングID取得（SDKが提供する場合）
          try {
            const meetingInfo = await (zoomSdk.getMeetingInfo?.() ||
              Promise.resolve({ meetingNumber: "" }));
            setMeetingId(
              meetingInfo.meetingNumber ||
                meetingInfo.meetingId ||
                `meeting-${Date.now()}`
            );
          } catch {
            // ミーティングIDが取得できない場合はタイムスタンプを使用
            setMeetingId(`meeting-${Date.now()}`);
          }
        } else {
          // 開発モード: モックデータ
          setMeetingId(`meeting-${Date.now()}`);
        }
      } catch (err) {
        console.error("初期化エラー:", err);
        setMeetingId(`meeting-${Date.now()}`);
      }
    };

    checkMeeting();
  }, []);

  const handleSelectMode = (selectedMode: "measurement" | "host-view") => {
    if (selectedMode === "measurement") {
      // 計測モードの場合は初期設定画面へ
      setMode("measurement-setup");
    } else if (selectedMode === "host-view") {
      setMode("host-view");
    }
  };

  const handleMeasurementStart = (name: string, room: string) => {
    setMeetingName(name);
    setRoomName(room);
    // ルームIDを生成（実際にはSDKから取得する可能性がある）
    setRoomId(`room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    setMode("measurement-active");
  };

  const handleBack = () => {
    if (mode === "measurement-setup") {
      setMode("select");
    } else if (mode === "measurement-active") {
      setMode("measurement-setup");
      setMeetingName("");
      setRoomName("");
      setRoomId("");
    } else {
      setMode("select");
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Zoom 発話者リアルタイム分析</h1>
      </header>
      <main>
        {mode === "select" && <ModeSelector onSelectMode={handleSelectMode} />}
        {mode === "measurement-setup" && (
          <MeasurementSetup
            onStart={handleMeasurementStart}
            onBack={handleBack}
          />
        )}
        {mode === "measurement-active" && meetingName && roomName && roomId && (
          <MeasurementMode
            meetingId={meetingId}
            roomId={roomId}
            meetingName={meetingName}
            roomName={roomName}
            onBack={handleBack}
          />
        )}
        {mode === "host-view" && <HostViewMode onBack={handleBack} />}
      </main>
    </div>
  );
}

export default App;
