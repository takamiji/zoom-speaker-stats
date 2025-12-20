import { useState, useEffect, useRef, useCallback } from "react";
import type { ParticipantStats } from "../types";
import zoomSdk from "@zoom/appssdk";

/**
 * Zoom Apps SDKとのやり取りと発話統計計算を行うカスタムフック
 */
export function useZoomSpeakerStats() {
  const [participants, setParticipants] = useState<
    Map<string, ParticipantStats>
  >(new Map());
  const [currentSpeakerId, setCurrentSpeakerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const intervalRef = useRef<number | null>(null);
  const previousSpeakerIdRef = useRef<string | null>(null);
  const lastActiveSpeakerTimeRef = useRef<number | null>(null); // 最後にisSpeaking === trueだった時刻（5秒タイマーの基準時刻）
  const sdkRef = useRef<typeof zoomSdk | null>(null); // config()を実行したSDKインスタンスを保持

  /**
   * ログを追加する（アプリ内ログとコンソールログの両方に出力）
   */
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString("ja-JP");
    const logMessage = `[${timestamp}] ${message}`;
    setLogs((prev) => [logMessage, ...prev.slice(0, 99)]); // 最新100件を保持（初期化ログを確認するため）
    // コンソールにも出力（ブラウザで直接開いた時に確認できる）
    console.log("[Zoom App]", logMessage);
  }, []);

  /**
   * ミリ秒を mm:ss 形式に変換
   */
  const formatTime = useCallback((ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }, []);

  /**
   * 参加者統計を更新する
   */
  const updateParticipantStats = useCallback(
    (
      updater: (
        prev: Map<string, ParticipantStats>
      ) => Map<string, ParticipantStats>
    ) => {
      setParticipants((prev) => {
        const updated = new Map(prev);
        return updater(updated);
      });
    },
    []
  );

  /**
   * アクティブスピーカーが変更されたときの処理
   */
  /**
   * アクティブスピーカーが変更されたときの処理
   * onActiveSpeakerChangeイベントは話し続けている間には来ない（話し始めた時と話者が変わった時だけ）
   */
  const handleActiveSpeakerChange = useCallback(
    (activeSpeakerId: string | null) => {
      const now = Date.now();
      const prevSpeakerId = previousSpeakerIdRef.current;

      // ===== 条件1: 話者なし（null）の場合 =====
      // ミュート状態や、users配列が空の場合
      if (!activeSpeakerId) {
        // 前の話者の発話を終了
        if (prevSpeakerId) {
          updateParticipantStats((prev) => {
            const prevStats = prev.get(prevSpeakerId);
            if (
              prevStats &&
              prevStats.isSpeaking &&
              prevStats.lastStartedSpeakingAt
            ) {
              const speakingDuration = now - prevStats.lastStartedSpeakingAt;
              const updated = new Map(prev);
              updated.set(prevSpeakerId, {
                ...prevStats,
                isSpeaking: false,
                totalSpeakingMs: prevStats.totalSpeakingMs + speakingDuration,
                lastStartedSpeakingAt: null,
              });
              addLog(
                `${
                  prevStats.displayName
                } の発話が終了しました（ミュートまたは話者なし、${formatTime(
                  speakingDuration
                )}）`
              );

              return updated;
            }
            // 既にisSpeakingがfalseの場合でも、念のため確認
            if (prevStats && prevStats.isSpeaking) {
              const updated = new Map(prev);
              updated.set(prevSpeakerId, {
                ...prevStats,
                isSpeaking: false,
              });
              return updated;
            }
            return prev;
          });
        }
        // 話者なしに設定
        previousSpeakerIdRef.current = null;
        setCurrentSpeakerId(null);
        lastActiveSpeakerTimeRef.current = null;
        return;
      }

      // ===== 条件2: 前の話者と異なる話者が話し始めた場合 =====
      if (prevSpeakerId && prevSpeakerId !== activeSpeakerId) {
        // 前の話者の発話を終了
        updateParticipantStats((prev) => {
          const prevStats = prev.get(prevSpeakerId);
          if (
            prevStats &&
            prevStats.isSpeaking &&
            prevStats.lastStartedSpeakingAt
          ) {
            const speakingDuration = now - prevStats.lastStartedSpeakingAt;
            const updated = new Map(prev);
            updated.set(prevSpeakerId, {
              ...prevStats,
              isSpeaking: false,
              totalSpeakingMs: prevStats.totalSpeakingMs + speakingDuration,
              lastStartedSpeakingAt: null,
            });
            addLog(
              `${prevStats.displayName} の発話が終了しました（${formatTime(
                speakingDuration
              )}）`
            );

            return updated;
          }
          return prev;
        });
      }

      // ===== 条件3: 新しい話者が話し始めた場合（前の話者と異なる、または最初の話者） =====
      if (activeSpeakerId && activeSpeakerId !== prevSpeakerId) {
        updateParticipantStats((prev) => {
          const updated = new Map(prev);
          const existingStats = prev.get(activeSpeakerId);

          if (existingStats) {
            // 既存の参加者の場合
            updated.set(activeSpeakerId, {
              ...existingStats,
              isSpeaking: true, // 話し始めたのでtrueにする
              speakingCount: existingStats.speakingCount + 1,
              lastStartedSpeakingAt: now,
            });
            addLog(`${existingStats.displayName} が話し始めました`);
          } else {
            // 新規参加者の場合
            updated.set(activeSpeakerId, {
              participantId: activeSpeakerId,
              displayName: `参加者 ${activeSpeakerId}`,
              speakingCount: 1,
              totalSpeakingMs: 0,
              isSpeaking: true, // 話し始めたのでtrueにする
              lastStartedSpeakingAt: now,
            });
            addLog(`参加者 ${activeSpeakerId} が話し始めました`);
          }
          return updated;
        });

        // 5秒タイマーをスタート（最後にisSpeaking === trueだった時刻を記録）
        lastActiveSpeakerTimeRef.current = now;
      }

      // ===== 条件4: 同じ話者が話し続けている場合 =====
      // onActiveSpeakerChangeイベントは話し続けている間には来ないため、
      // この条件は通常発生しない（1秒ごとのチェックで処理される）
      if (activeSpeakerId && activeSpeakerId === prevSpeakerId) {
        // 念のため、isSpeakingがtrueの場合のみタイマーをリセット
        updateParticipantStats((prev) => {
          const stats = prev.get(activeSpeakerId);
          if (stats && stats.isSpeaking) {
            lastActiveSpeakerTimeRef.current = now;
          }
          return prev;
        });
      }

      previousSpeakerIdRef.current = activeSpeakerId;
      setCurrentSpeakerId(activeSpeakerId);
    },
    [updateParticipantStats, addLog, formatTime]
  );

  /**
   * Zoom Apps SDKの初期化
   */
  useEffect(() => {
    let mounted = true;

    const initializeZoom = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 最重要: URLの一致確認（条件3）
        const currentUrl = window.location.href;
        const expectedUrl =
          "https://starlessly-postdiphtheric-kaeden.ngrok-free.dev";
        const urlMatches =
          currentUrl === expectedUrl ||
          currentUrl.startsWith(expectedUrl + "/");

        // iframe確認（条件5）
        const isInIframe = window.top !== window;
        const isTopLevel = window === window.top;

        addLog(`=== デバッグ情報（最重要） ===`);
        addLog(`実際のURL: ${currentUrl}`);
        addLog(`期待されるURL: ${expectedUrl}`);
        addLog(
          `URL一致: ${
            urlMatches ? "✅ 一致" : "❌ 不一致（SDKは読み込まれません）"
          }`
        );
        addLog(`window.location.origin: ${window.location.origin}`);
        addLog(`window.location.pathname: ${window.location.pathname}`);
        addLog(``);
        addLog(`=== iframe確認（条件5） ===`);
        addLog(`window === window.top: ${isTopLevel}`);
        addLog(
          `iframe内で実行: ${
            isInIframe ? "✅ はい" : "❌ いいえ（問題の可能性）"
          }`
        );
        addLog(
          `トップレベルwindow: ${
            isTopLevel ? "✅ はい（問題の可能性）" : "❌ いいえ"
          }`
        );
        if (isTopLevel) {
          addLog(`⚠️ 警告: アプリがトップレベルwindowで実行されています`);
          addLog(`   Zoom Appsは通常iframe内で実行される必要があります`);
          addLog(`   ブラウザで直接URLを開いている可能性があります`);
        }
        addLog(``);
        console.log("window.location.href:", currentUrl);
        console.log("URL一致:", urlMatches);
        console.log("window === window.top:", isTopLevel);
        console.log("iframe内で実行:", isInIframe);

        // Zoom Apps SDKの確認
        // npmパッケージ(@zoom/appssdk)から直接importしているため、グローバル変数の探索は不要
        addLog(`=== SDK確認 ===`);
        addLog(`SDK読み込み方法: npmパッケージ(@zoom/appssdk)から直接import`);
        addLog(`SDKオブジェクト: ✅ 読み込み済み`);
        addLog(`SDKオブジェクトのキー: ${Object.keys(zoomSdk).join(", ")}`);
        addLog(``);

        // SDKの初期化（config）
        // 重要: @zoom/appssdkパッケージが内部でwindow.ZoomAppsSDKを参照している可能性があるため、
        // window.ZoomAppsSDKが存在する場合はそれを使用し、存在しない場合はimportしたzoomSdkを使用
        const windowSdk =
          (window as any).ZoomAppsSDK || (window as any).zoomSdk;
        const sdk = windowSdk || zoomSdk;
        sdkRef.current = sdk; // config()を実行したSDKインスタンスを保持

        // デバッグ: SDKインスタンスとwindow.ZoomAppsSDKの関係を確認
        addLog(`=== SDKインスタンス確認 ===`);
        addLog(
          `import zoomSdk === window.ZoomAppsSDK: ${
            zoomSdk === (window as any).ZoomAppsSDK
          }`
        );
        addLog(
          `import zoomSdk === window.zoomSdk: ${
            zoomSdk === (window as any).zoomSdk
          }`
        );
        addLog(`window.ZoomAppsSDK存在: ${!!(window as any).ZoomAppsSDK}`);
        addLog(`window.zoomSdk存在: ${!!(window as any).zoomSdk}`);
        addLog(
          `使用するSDK: ${
            windowSdk ? "window.ZoomAppsSDK/zoomSdk" : "import zoomSdk"
          }`
        );
        if ((window as any).ZoomAppsSDK) {
          addLog(
            `window.ZoomAppsSDKのキー: ${Object.keys(
              (window as any).ZoomAppsSDK
            ).join(", ")}`
          );
        }
        if (zoomSdk) {
          addLog(`import zoomSdkのキー: ${Object.keys(zoomSdk).join(", ")}`);
        }
        addLog(``);

        // Zoom Apps SDKの初期化
        // 注意: 実際のZoom環境では、manifest.jsonとngrokなどの設定が必要です
        // config()で必要な権限を設定
        // 重要: Zoom Marketplaceで選択したAPIに合わせて設定
        try {
          addLog(`=== SDK config()開始 ===`);
          addLog(
            `SDKインスタンスを保持: ${
              sdk === sdkRef.current
                ? "✅ 同じインスタンス"
                : "❌ 異なるインスタンス"
            }`
          );
          await sdk.config({
            capabilities: [
              "onActiveSpeakerChange", // onActiveSpeakerChangeイベントのみを使用
            ],
          });
          addLog("✅ Zoom Apps SDKの設定が完了しました");
          addLog(
            `config()で使用したSDKインスタンス: ${
              sdk === sdkRef.current
                ? "✅ sdkRef.currentと一致"
                : "❌ sdkRef.currentと不一致"
            }`
          );
          addLog(
            `config()で使用したSDK: ${
              sdk === zoomSdk
                ? "import zoomSdk"
                : sdk === (window as any).ZoomAppsSDK
                ? "window.ZoomAppsSDK"
                : sdk === (window as any).zoomSdk
                ? "window.zoomSdk"
                : "不明"
            }`
          );
        } catch (configError) {
          // config()が失敗した場合、古い形式を試す
          addLog(
            `⚠️ config()エラー: ${
              configError instanceof Error
                ? configError.message
                : String(configError)
            }`
          );
          try {
            addLog(`旧形式のconfig()を試行中...`);
            await sdk.config({
              capabilities: [
                "onActiveSpeakerChange", // onActiveSpeakerChangeイベントのみを使用
              ],
            });
            addLog("✅ Zoom Apps SDKの設定が完了しました（旧形式）");
          } catch (configError2) {
            addLog(
              `❌ config()エラー（旧形式）: ${
                configError2 instanceof Error
                  ? configError2.message
                  : String(configError2)
              }`
            );
            addLog(
              `⚠️ config()が失敗しましたが、続行します（一部のAPIが使用できない可能性があります）`
            );
          }
        }

        // onActiveSpeakerChangeイベントから参加者情報を収集するため、
        // 初期化時は空の参加者マップで開始
        const initialParticipants = new Map<string, ParticipantStats>();
        addLog(`✅ 参加者情報はonActiveSpeakerChangeイベントから収集します`);

        if (mounted) {
          setParticipants(initialParticipants);
        }

        // アクティブスピーカーの変更イベントを購読
        try {
          addLog(`=== アクティブスピーカーイベントの購読開始 ===`);
          addLog(
            `sdk.onActiveSpeakerChange: ${typeof sdk.onActiveSpeakerChange}`
          );
          addLog(`sdk.on: ${typeof sdk.on}`);

          // 注意: 実際のAPI名は onActiveSpeakerChange または on('activeSpeakerChange') の可能性があります
          // イベントの構造を解析する関数（実際のZoom Apps SDKの形式に対応）
          const parseActiveSpeakerEvent = (
            event: any
          ): { speakerId: string | null; userInfo?: any } => {
            // パターン1: activeSpeakerId または activeSpeaker が直接含まれている場合
            if (event.activeSpeakerId) {
              return { speakerId: event.activeSpeakerId };
            }
            if (event.activeSpeaker) {
              return { speakerId: event.activeSpeaker };
            }

            // パターン2: users配列が含まれている場合（実際のZoom Apps SDKの形式）
            if (event.users && Array.isArray(event.users)) {
              // users配列が空の場合は話者なし（ミュート状態など）
              if (event.users.length === 0) {
                return { speakerId: null };
              }
              const firstUser = event.users[0];
              // participantId または participantUUID を取得
              const speakerId =
                firstUser.participantId || firstUser.participantUUID || null;
              return { speakerId, userInfo: firstUser };
            }

            // パターン3: payload.users が含まれている場合
            if (event.payload?.users && Array.isArray(event.payload.users)) {
              // users配列が空の場合は話者なし（ミュート状態など）
              if (event.payload.users.length === 0) {
                return { speakerId: null };
              }
              const firstUser = event.payload.users[0];
              const speakerId =
                firstUser.participantId || firstUser.participantUUID || null;
              return { speakerId, userInfo: firstUser };
            }

            return { speakerId: null };
          };

          // config()を実行したSDKインスタンスを使用
          const currentSdk = sdkRef.current || sdk;
          if (currentSdk.onActiveSpeakerChange) {
            addLog(`onActiveSpeakerChange()を使用してイベントを購読します`);
            addLog(`=== イベント取得と判定条件 ===`);
            addLog(`取得イベント: onActiveSpeakerChange（Zoom Apps SDK）`);
            addLog(`判定条件:`);
            addLog(`  1. users配列が空 → speakerId = null（ミュート状態）`);
            addLog(
              `  2. users配列に参加者がいる → speakerId = users[0].participantId`
            );
            addLog(`  3. speakerId === null → 話者なし（条件1で処理）`);
            addLog(
              `  4. speakerId !== prevSpeakerId → 新しい話者（条件3で処理）`
            );
            addLog(
              `  5. speakerId === prevSpeakerId → 同じ話者（条件4で処理）`
            );
            currentSdk.onActiveSpeakerChange((event: any) => {
              addLog(
                `🔊 アクティブスピーカー変更イベント受信: ${JSON.stringify(
                  event
                )}`
              );
              if (mounted) {
                const { speakerId, userInfo } = parseActiveSpeakerEvent(event);
                addLog(`スピーカーID: ${speakerId}`);

                // 参加者情報が存在し、まだマップに含まれていない場合は追加
                if (speakerId && userInfo) {
                  updateParticipantStats((prev) => {
                    if (!prev.has(speakerId)) {
                      const displayName =
                        userInfo.screenName ||
                        userInfo.displayName ||
                        userInfo.name ||
                        `参加者 ${speakerId}`;
                      addLog(`新規参加者を追加: ${speakerId} - ${displayName}`);
                      const updated = new Map(prev);
                      updated.set(speakerId, {
                        participantId: speakerId,
                        displayName: displayName,
                        speakingCount: 0,
                        totalSpeakingMs: 0,
                        isSpeaking: false,
                        lastStartedSpeakingAt: null,
                      });
                      return updated;
                    }
                    return prev;
                  });
                }

                handleActiveSpeakerChange(speakerId);
              }
            });
            addLog("✅ アクティブスピーカー変更イベントを購読しました");
          } else if (currentSdk.on) {
            addLog(`on()を使用してイベントを購読します`);
            await currentSdk.on("activeSpeakerChange", (payload: any) => {
              addLog(
                `🔊 アクティブスピーカー変更イベント受信: ${JSON.stringify(
                  payload
                )}`
              );
              if (mounted) {
                const { speakerId, userInfo } =
                  parseActiveSpeakerEvent(payload);
                addLog(`スピーカーID: ${speakerId}`);

                // 参加者情報が存在し、まだマップに含まれていない場合は追加
                if (speakerId && userInfo) {
                  updateParticipantStats((prev) => {
                    if (!prev.has(speakerId)) {
                      const displayName =
                        userInfo.screenName ||
                        userInfo.displayName ||
                        userInfo.name ||
                        `参加者 ${speakerId}`;
                      addLog(`新規参加者を追加: ${speakerId} - ${displayName}`);
                      const updated = new Map(prev);
                      updated.set(speakerId, {
                        participantId: speakerId,
                        displayName: displayName,
                        speakingCount: 0,
                        totalSpeakingMs: 0,
                        isSpeaking: false,
                        lastStartedSpeakingAt: null,
                      });
                      return updated;
                    }
                    return prev;
                  });
                }

                handleActiveSpeakerChange(speakerId);
              }
            });
            addLog("✅ アクティブスピーカー変更イベントを購読しました");
          } else {
            addLog(`⚠️ アクティブスピーカーイベントの購読方法が見つかりません`);
            addLog(
              `SDKオブジェクトのキー: ${Object.keys(currentSdk).join(", ")}`
            );
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          const errorStack = err instanceof Error ? err.stack : undefined;
          console.error(
            "アクティブスピーカーイベントの購読に失敗しました:",
            err
          );
          addLog(
            `❌ アクティブスピーカーイベントの購読に失敗しました: ${errorMessage}`
          );
          if (errorStack) {
            addLog(`エラー詳細: ${errorStack}`);
          }
        }

        // onParticipantChangeイベントは使用しない（getMeetingParticipants()が必要なため）
        // 参加者の参加/退出はonActiveSpeakerChangeイベントから検知する

        if (mounted) {
          setIsLoading(false);
          addLog("Zoom Apps SDKの初期化が完了しました");
        }
      } catch (err) {
        console.error("Zoom Apps SDKの初期化に失敗しました:", err);
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "不明なエラーが発生しました"
          );
          setIsLoading(false);
          addLog(
            `エラー: ${err instanceof Error ? err.message : "不明なエラー"}`
          );
        }
      }
    };

    initializeZoom();

    return () => {
      mounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [addLog, handleActiveSpeakerChange, updateParticipantStats]);

  /**
   * 1秒ごとに再レンダリングをトリガー（現在話している人の経過時間を更新）
   * onActiveSpeakerChangeイベントのタイムスタンプと5秒タイマーを使用
   *
   * 処理フロー:
   * 1. onActiveSpeakerChangeで話者Aが来たら、isSpeaking = true、5秒タイマーをスタート
   * 2. 1秒ごとに確認:
   *    - 最後のonActiveSpeakerChangeイベントから5秒経過したら話者終了
   * 3. 5秒タイマーが満了したら話者終了
   */
  useEffect(() => {
    intervalRef.current = window.setInterval(async () => {
      const now = Date.now();

      // 1秒ごとのチェック処理
      if (currentSpeakerId) {
        try {
          // config()を実行したSDKインスタンスを使用（常に同じインスタンス）
          const sdk = sdkRef.current;

          if (!sdk) {
            addLog(`[1秒チェック] ⚠️ SDKインスタンスが保持されていません`);
            return;
          }

          // SDKの状態を確認
          const sdkKeys = Object.keys(sdk || {});
          addLog(
            `[1秒チェック] SDK状態確認: SDK存在=${!!sdk}, キー数=${
              sdkKeys.length
            }, キー=${sdkKeys.slice(0, 10).join(", ")}${
              sdkKeys.length > 10 ? "..." : ""
            }`
          );

          const getParticipants =
            sdk?.getMeetingParticipants || sdk?.getParticipants;

          if (!getParticipants) {
            addLog(
              `[1秒チェック] ⚠️ getMeetingParticipants()が見つかりません。SDKオブジェクトのキー: ${sdkKeys.join(
                ", "
              )}`
            );
            // タイムアウトチェックにフォールバック
            const currentStats = participants.get(currentSpeakerId);
            if (
              currentStats &&
              !currentStats.isSpeaking &&
              lastActiveSpeakerTimeRef.current !== null
            ) {
              const timeSinceLastSpeaking =
                now - lastActiveSpeakerTimeRef.current;
              addLog(
                `[1秒チェック] API未取得時タイムアウトチェック: isSpeaking=false, 経過時間=${Math.floor(
                  timeSinceLastSpeaking / 1000
                )}秒（残り${Math.max(
                  0,
                  5 - Math.floor(timeSinceLastSpeaking / 1000)
                )}秒でタイムアウト）`
              );
              if (timeSinceLastSpeaking > 5000) {
                // 5秒経過したので話者終了
                if (currentStats.lastStartedSpeakingAt) {
                  const speakingDuration =
                    now - currentStats.lastStartedSpeakingAt;
                  updateParticipantStats((prev) => {
                    const prevStats = prev.get(currentSpeakerId);
                    if (prevStats && prevStats.lastStartedSpeakingAt) {
                      const updated = new Map(prev);
                      updated.set(currentSpeakerId, {
                        ...prevStats,
                        isSpeaking: false,
                        totalSpeakingMs:
                          prevStats.totalSpeakingMs + speakingDuration,
                        lastStartedSpeakingAt: null,
                      });
                      addLog(
                        `${
                          prevStats.displayName
                        } の発話が終了しました（5秒タイムアウト、API未取得、${formatTime(
                          speakingDuration
                        )}）`
                      );
                      return updated;
                    }
                    return prev;
                  });
                }
                // 話者なしに設定
                handleActiveSpeakerChange(null);
                lastActiveSpeakerTimeRef.current = null;
              }
            }
          } else {
            addLog(
              `[1秒チェック] getMeetingParticipants()を呼び出し中... (型: ${typeof getParticipants})`
            );
            const participantsList = await getParticipants();
            if (Array.isArray(participantsList)) {
              // 現在話している人の情報を取得
              const currentParticipant = participantsList.find(
                (p: any) =>
                  (p.participantId || p.participantUUID) === currentSpeakerId
              );

              if (currentParticipant) {
                // isMutedを確認
                const isMuted = currentParticipant.isMuted === true;
                const isSpeakingFromAPI =
                  currentParticipant.isSpeaking === true ||
                  currentParticipant.audioStatus === "speaking";

                // 1秒ごとのデバッグログ
                const currentStats = participants.get(currentSpeakerId);
                const timeSinceLastSpeaking = lastActiveSpeakerTimeRef.current
                  ? now - lastActiveSpeakerTimeRef.current
                  : null;
                addLog(
                  `[1秒チェック] participantId=${
                    currentParticipant.participantId
                  }, isMuted=${isMuted}, isSpeaking(API)=${
                    currentParticipant.isSpeaking
                  }, audioStatus=${
                    currentParticipant.audioStatus
                  }, isSpeaking(内部)=${
                    currentStats?.isSpeaking ?? "N/A"
                  }, lastActiveSpeakerTime=${
                    lastActiveSpeakerTimeRef.current
                      ? new Date(
                          lastActiveSpeakerTimeRef.current
                        ).toLocaleTimeString("ja-JP")
                      : "null"
                  }, timeSinceLastSpeaking=${
                    timeSinceLastSpeaking !== null
                      ? `${Math.floor(timeSinceLastSpeaking / 1000)}秒`
                      : "N/A"
                  }`
                );

                // isMutedなら即座に発話終了
                if (isMuted) {
                  if (currentStats && currentStats.isSpeaking) {
                    updateParticipantStats((prev) => {
                      const prevStats = prev.get(currentSpeakerId);
                      if (
                        prevStats &&
                        prevStats.isSpeaking &&
                        prevStats.lastStartedSpeakingAt
                      ) {
                        const speakingDuration =
                          now - prevStats.lastStartedSpeakingAt;
                        const updated = new Map(prev);
                        updated.set(currentSpeakerId, {
                          ...prevStats,
                          isSpeaking: false,
                          totalSpeakingMs:
                            prevStats.totalSpeakingMs + speakingDuration,
                          lastStartedSpeakingAt: null,
                        });
                        addLog(
                          `${
                            prevStats.displayName
                          } の発話が終了しました（ミュート検出、${formatTime(
                            speakingDuration
                          )}）`
                        );
                        return updated;
                      }
                      // 既にisSpeakingがfalseの場合でも、念のため確認
                      if (prevStats && prevStats.isSpeaking) {
                        const updated = new Map(prev);
                        updated.set(currentSpeakerId, {
                          ...prevStats,
                          isSpeaking: false,
                        });
                        return updated;
                      }
                      return prev;
                    });
                    // 話者なしに設定
                    handleActiveSpeakerChange(null);
                    lastActiveSpeakerTimeRef.current = null;
                    return; // 処理を終了（以降の処理をスキップ）
                  }
                }
                // isSpeaking === trueなら5秒タイマーをリセット
                else if (isSpeakingFromAPI) {
                  updateParticipantStats((prev) => {
                    const prevStats = prev.get(currentSpeakerId);
                    if (prevStats) {
                      const updated = new Map(prev);
                      // isSpeakingがfalseの場合はtrueに更新
                      if (!prevStats.isSpeaking) {
                        updated.set(currentSpeakerId, {
                          ...prevStats,
                          isSpeaking: true,
                          lastStartedSpeakingAt:
                            prevStats.lastStartedSpeakingAt || now,
                        });
                        addLog(
                          `[1秒チェック] ${prevStats.displayName} のisSpeakingをfalse→trueに更新（タイマーリセット）`
                        );
                      } else {
                        addLog(
                          `[1秒チェック] ${prevStats.displayName} は話し続けています（タイマーリセット）`
                        );
                      }
                      // 5秒タイマーをリセット（最後にisSpeaking === trueだった時刻を更新）
                      lastActiveSpeakerTimeRef.current = now;
                      return updated;
                    }
                    return prev;
                  });
                }
                // isSpeaking === falseならタイマーはそのまま（リセットしない）
                else {
                  updateParticipantStats((prev) => {
                    const prevStats = prev.get(currentSpeakerId);
                    if (prevStats && prevStats.isSpeaking) {
                      const updated = new Map(prev);
                      updated.set(currentSpeakerId, {
                        ...prevStats,
                        isSpeaking: false,
                      });
                      addLog(
                        `[1秒チェック] ${prevStats.displayName} のisSpeakingをtrue→falseに更新（タイマーはそのまま）`
                      );
                      return updated;
                    }
                    return prev;
                  });

                  // 5秒タイマーのチェック: isSpeaking === falseが続き、5秒経過したら話者終了
                  if (lastActiveSpeakerTimeRef.current !== null) {
                    const timeSinceLastSpeaking =
                      now - lastActiveSpeakerTimeRef.current;
                    addLog(
                      `[1秒チェック] isSpeaking=falseが続いています。経過時間: ${Math.floor(
                        timeSinceLastSpeaking / 1000
                      )}秒（残り${Math.max(
                        0,
                        5 - Math.floor(timeSinceLastSpeaking / 1000)
                      )}秒でタイムアウト）`
                    );
                    if (timeSinceLastSpeaking > 5000) {
                      // 5秒経過したので話者終了
                      const currentStats = participants.get(currentSpeakerId);
                      if (currentStats && currentStats.lastStartedSpeakingAt) {
                        const speakingDuration =
                          now - currentStats.lastStartedSpeakingAt;
                        updateParticipantStats((prev) => {
                          const prevStats = prev.get(currentSpeakerId);
                          if (prevStats && prevStats.lastStartedSpeakingAt) {
                            const updated = new Map(prev);
                            updated.set(currentSpeakerId, {
                              ...prevStats,
                              isSpeaking: false,
                              totalSpeakingMs:
                                prevStats.totalSpeakingMs + speakingDuration,
                              lastStartedSpeakingAt: null,
                            });
                            addLog(
                              `${
                                prevStats.displayName
                              } の発話が終了しました（5秒タイムアウト、${formatTime(
                                speakingDuration
                              )}）`
                            );
                            return updated;
                          }
                          return prev;
                        });
                      }
                      // 話者なしに設定
                      handleActiveSpeakerChange(null);
                      lastActiveSpeakerTimeRef.current = null;
                      return; // 処理を終了
                    }
                  }
                }
              }
            } else {
              addLog(
                `[1秒チェック] ⚠️ getMeetingParticipants()の結果が配列ではありません: ${typeof participantsList}`
              );
            }
          }
        } catch (err) {
          // getMeetingParticipants()が失敗した場合、タイムアウトチェックにフォールバック
          // isSpeaking === falseが続き、5秒経過したら話者終了
          const currentStats = participants.get(currentSpeakerId);
          const errorMessage = err instanceof Error ? err.message : String(err);
          const errorStack = err instanceof Error ? err.stack : undefined;
          const errorName = err instanceof Error ? err.name : "Unknown";

          addLog(
            `[1秒チェック] ❌ getMeetingParticipants()エラー: ${errorName}: ${errorMessage}`
          );

          // エラーの詳細情報を取得
          if (err instanceof Error) {
            addLog(
              `[1秒チェック] エラー詳細: name=${err.name}, message=${err.message}`
            );
            if (errorStack) {
              // スタックトレースの最初の数行だけを表示
              const stackLines = errorStack.split("\n").slice(0, 5);
              addLog(
                `[1秒チェック] スタックトレース（最初の5行）: ${stackLines.join(
                  " | "
                )}`
              );
            }
          } else {
            addLog(`[1秒チェック] エラーオブジェクト: ${JSON.stringify(err)}`);
          }

          // SDKの状態を再確認
          try {
            // config()を実行したSDKインスタンスを使用
            const sdk = sdkRef.current;
            if (!sdk) {
              addLog(
                `[1秒チェック] ⚠️ SDKインスタンスが保持されていません（エラー時）`
              );
              return;
            }
            const sdkKeys = Object.keys(sdk || {});
            addLog(
              `[1秒チェック] エラー発生時のSDK状態: SDK存在=${!!sdk}, キー数=${
                sdkKeys.length
              }`
            );
            if (sdk) {
              addLog(
                `[1秒チェック] SDKのgetMeetingParticipants存在: ${!!sdk.getMeetingParticipants}, getParticipants存在: ${!!sdk.getParticipants}`
              );
            }
          } catch (sdkCheckError) {
            addLog(
              `[1秒チェック] SDK状態確認エラー: ${
                sdkCheckError instanceof Error
                  ? sdkCheckError.message
                  : String(sdkCheckError)
              }`
            );
          }

          addLog(`[1秒チェック] タイムアウトチェックにフォールバック`);
          if (currentStats) {
            if (
              !currentStats.isSpeaking &&
              lastActiveSpeakerTimeRef.current !== null
            ) {
              const timeSinceLastSpeaking =
                now - lastActiveSpeakerTimeRef.current;
              addLog(
                `[1秒チェック] エラー時タイムアウトチェック: isSpeaking=false, 経過時間=${Math.floor(
                  timeSinceLastSpeaking / 1000
                )}秒（残り${Math.max(
                  0,
                  5 - Math.floor(timeSinceLastSpeaking / 1000)
                )}秒でタイムアウト）`
              );
              if (timeSinceLastSpeaking > 5000) {
                // 5秒経過したので話者終了
                if (currentStats.lastStartedSpeakingAt) {
                  const speakingDuration =
                    now - currentStats.lastStartedSpeakingAt;
                  updateParticipantStats((prev) => {
                    const prevStats = prev.get(currentSpeakerId);
                    if (prevStats && prevStats.lastStartedSpeakingAt) {
                      const updated = new Map(prev);
                      updated.set(currentSpeakerId, {
                        ...prevStats,
                        isSpeaking: false,
                        totalSpeakingMs:
                          prevStats.totalSpeakingMs + speakingDuration,
                        lastStartedSpeakingAt: null,
                      });
                      addLog(
                        `${
                          prevStats.displayName
                        } の発話が終了しました（5秒タイムアウト、getMeetingParticipants失敗、${formatTime(
                          speakingDuration
                        )}）`
                      );
                      return updated;
                    }
                    return prev;
                  });
                }
                // 話者なしに設定
                handleActiveSpeakerChange(null);
                lastActiveSpeakerTimeRef.current = null;
              }
            }
          }
        }
      }

      // 現在話している人の経過時間を更新するために、状態を更新
      // （実際の計算はコンポーネント側で行う）
      setParticipants((prev) => {
        if (currentSpeakerId) {
          const updated = new Map(prev);
          const stats = updated.get(currentSpeakerId);
          if (stats && stats.isSpeaking) {
            // Mapを更新して再レンダリングをトリガー
            updated.set(currentSpeakerId, { ...stats });
            return updated;
          }
        }
        return prev;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [
    currentSpeakerId,
    handleActiveSpeakerChange,
    addLog,
    participants,
    updateParticipantStats,
    formatTime,
  ]);

  /**
   * 参加者統計の配列を取得（表示用）
   */
  const participantsArray = Array.from(participants.values()).sort((a, b) => {
    // 発話時間の降順でソート
    return b.totalSpeakingMs - a.totalSpeakingMs;
  });

  /**
   * 現在話している人の統計を取得
   */
  const currentSpeaker = currentSpeakerId
    ? participants.get(currentSpeakerId)
    : null;

  return {
    participants: participantsArray,
    currentSpeaker,
    currentSpeakerId,
    isLoading,
    error,
    logs,
  };
}
