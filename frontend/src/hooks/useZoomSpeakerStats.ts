import { useState, useEffect, useRef, useCallback } from 'react';
import type { ParticipantStats, SpeechSummary } from '../types';

// Zoom Apps SDKの型定義
declare global {
  interface Window {
    ZoomAppsSDK?: {
      config: (options: { capabilities: string[] }) => Promise<void>;
      getMeetingParticipants?: () => Promise<any[]>;
      getParticipants?: () => Promise<any[]>;
      onActiveSpeakerChange?: (callback: (event: { activeSpeakerId?: string | null; activeSpeaker?: string | null }) => void) => void;
      onParticipantChange?: (callback: () => void) => void;
      on?: (event: string, callback: (...args: any[]) => void) => Promise<void>;
    };
  }
}

/**
 * Zoom Apps SDKとのやり取りと発話統計計算を行うカスタムフック
 */
export function useZoomSpeakerStats() {
  const [participants, setParticipants] = useState<Map<string, ParticipantStats>>(new Map());
  const [currentSpeakerId, setCurrentSpeakerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [speechSummaries, setSpeechSummaries] = useState<SpeechSummary[]>([]);

  const intervalRef = useRef<number | null>(null);
  const previousSpeakerIdRef = useRef<string | null>(null);
  const speakingStartTimeRef = useRef<Map<string, number>>(new Map());

  /**
   * ログを追加する
   */
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('ja-JP');
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]); // 最新10件を保持
  }, []);

  /**
   * モック: 発話内容の文字起こしを生成
   */
  const generateMockTranscript = useCallback((displayName: string, speakingTimeMs: number): string => {
    const mockTranscripts: Record<string, string[]> = {
      'テストユーザー1': [
        '今日の会議の議題についてですが、まずは前回の議事録を確認したいと思います。',
        'プロジェクトの進捗状況を共有させていただきます。現在、開発フェーズに入っており、順調に進んでいます。',
        '来週のスケジュールについて確認したいのですが、皆さんの都合はいかがでしょうか？',
      ],
      'テストユーザー2': [
        '前回の議事録を確認しました。いくつか質問があります。',
        'スケジュールについては、来週の水曜日が空いています。',
        'プロジェクトの進捗について、もう少し詳しく教えていただけますか？',
      ],
      'テストユーザー3': [
        '了解しました。それでは、次のステップに進みましょう。',
        'リスク管理についても検討する必要があると思います。',
        '皆さんの意見を聞かせていただき、ありがとうございます。',
      ],
    };

    const transcripts = mockTranscripts[displayName] || [
      `${displayName}の発話内容です。会議の進行について議論しています。`,
    ];

    // 発話時間に応じて、適切な文字起こしを選択
    const index = Math.floor(speakingTimeMs / 5000) % transcripts.length;
    return transcripts[index];
  }, []);

  /**
   * モック: ChatGPT APIで要約を生成（実際のAPI呼び出しは後で実装）
   */
  const generateMockSummary = useCallback((transcript: string): string => {
    // モック: 実際のChatGPT APIの代わりに、200文字程度の詳細な要約を生成
    const summaries: Record<string, string> = {
      '今日の会議の議題についてですが、まずは前回の議事録を確認したいと思います。': '会議の開始にあたり、前回の議事録を確認することを提案。前回の会議で決定した事項や未解決の課題を振り返り、今回の会議の進行に活かすことを目的としている。',
      'プロジェクトの進捗状況を共有させていただきます。現在、開発フェーズに入っており、順調に進んでいます。': 'プロジェクトの現状について報告。開発フェーズに突入しており、予定通りに進行していることを共有。チームメンバーの協力により、スケジュール通りに進捗していることを確認。',
      '来週のスケジュールについて確認したいのですが、皆さんの都合はいかがでしょうか？': '来週のスケジュール調整について、参加者全員の都合を確認。会議や打ち合わせの日程を調整するため、各メンバーの空き時間を把握したいとの意向。',
      '前回の議事録を確認しました。いくつか質問があります。': '前回の議事録を精査した結果、いくつかの疑問点や確認したい事項があることを伝達。詳細な説明や補足情報が必要な点について、質問を準備している。',
      'スケジュールについては、来週の水曜日が空いています。': '個人のスケジュール状況を報告。来週の水曜日が空いているため、その日の会議や打ち合わせに参加可能であることを伝達。他のメンバーとの調整を希望。',
      'プロジェクトの進捗について、もう少し詳しく教えていただけますか？': 'プロジェクトの進捗状況について、より詳細な情報を求めている。現在の報告では不十分と感じており、具体的な数値や達成状況、課題点などについて追加の説明を希望。',
      '了解しました。それでは、次のステップに進みましょう。': '前の議題について理解し、合意したことを表明。次の段階に進むことを提案し、会議の進行を促している。効率的な進行を目指す姿勢を示している。',
      'リスク管理についても検討する必要があると思います。': 'プロジェクトのリスク管理について、改めて検討する必要性を指摘。潜在的な問題点や課題を事前に把握し、対策を講じることで、プロジェクトの成功確率を高めることを提案。',
      '皆さんの意見を聞かせていただき、ありがとうございます。': '参加者からの意見やフィードバックに対して感謝の意を表明。多様な視点からの意見が得られたことを評価し、今後の検討に活かしていく姿勢を示している。',
    };

    // デフォルトの要約（200文字程度）
    const defaultSummary = transcript.length > 200 
      ? `${transcript.substring(0, 180)}...（要約: 発話内容を確認しました。詳細については文字起こしを参照してください。）`
      : `要約: ${transcript}`;

    return summaries[transcript] || defaultSummary;
  }, []);

  /**
   * 発話要約を生成して追加（モック）
   */
  const addSpeechSummary = useCallback((participantId: string, displayName: string, speakingTimeMs: number) => {
    const transcript = generateMockTranscript(displayName, speakingTimeMs);
    const summary = generateMockSummary(transcript);
    
    const speechSummary: SpeechSummary = {
      participantId,
      displayName,
      transcript,
      summary,
      timestamp: Date.now(),
    };

    setSpeechSummaries((prev) => [speechSummary, ...prev.slice(0, 9)]); // 最新10件を保持
    
    // イベントログにも追加
    const timestamp = new Date().toLocaleTimeString('ja-JP');
    addLog(`${displayName} の発話要約: ${summary}`);
  }, [generateMockTranscript, generateMockSummary, addLog]);

  /**
   * ミリ秒を mm:ss 形式に変換
   */
  const formatTime = useCallback((ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  /**
   * 参加者統計を更新する
   */
  const updateParticipantStats = useCallback((updater: (prev: Map<string, ParticipantStats>) => Map<string, ParticipantStats>) => {
    setParticipants((prev) => {
      const updated = new Map(prev);
      return updater(updated);
    });
  }, []);

  /**
   * アクティブスピーカーが変更されたときの処理
   */
  const handleActiveSpeakerChange = useCallback((activeSpeakerId: string | null) => {
    const now = Date.now();
    const prevSpeakerId = previousSpeakerIdRef.current;

    // 前の話者の発話を終了
    if (prevSpeakerId && prevSpeakerId !== activeSpeakerId) {
      updateParticipantStats((prev) => {
        const prevStats = prev.get(prevSpeakerId);
        if (prevStats && prevStats.isSpeaking && prevStats.lastStartedSpeakingAt) {
          const speakingDuration = now - prevStats.lastStartedSpeakingAt;
          const updated = new Map(prev);
          updated.set(prevSpeakerId, {
            ...prevStats,
            isSpeaking: false,
            totalSpeakingMs: prevStats.totalSpeakingMs + speakingDuration,
            lastStartedSpeakingAt: null,
          });
          addLog(`${prevStats.displayName} の発話が終了しました（${formatTime(speakingDuration)}）`);
          
          // 発話要約を生成（モック）
          // 実際の実装では、ここで文字起こしAPIを呼び出し、その後ChatGPT APIで要約
          if (speakingDuration > 2000) { // 2秒以上話した場合のみ要約を生成
            addSpeechSummary(prevSpeakerId, prevStats.displayName, speakingDuration);
          }
          
          return updated;
        }
        return prev;
      });
    }

    // 新しい話者の発話を開始
    if (activeSpeakerId && activeSpeakerId !== prevSpeakerId) {
      updateParticipantStats((prev) => {
        const updated = new Map(prev);
        const existingStats = prev.get(activeSpeakerId);
        
        if (existingStats) {
          updated.set(activeSpeakerId, {
            ...existingStats,
            isSpeaking: true,
            speakingCount: existingStats.speakingCount + 1,
            lastStartedSpeakingAt: now,
          });
          addLog(`${existingStats.displayName} が話し始めました`);
        } else {
          // 新規参加者の場合（通常は発生しないが、念のため）
          updated.set(activeSpeakerId, {
            participantId: activeSpeakerId,
            displayName: `参加者 ${activeSpeakerId}`,
            speakingCount: 1,
            totalSpeakingMs: 0,
            isSpeaking: true,
            lastStartedSpeakingAt: now,
          });
          addLog(`参加者 ${activeSpeakerId} が話し始めました`);
        }
        return updated;
      });
    }

    previousSpeakerIdRef.current = activeSpeakerId;
    setCurrentSpeakerId(activeSpeakerId);
  }, [updateParticipantStats, addLog, formatTime]);

  /**
   * Zoom Apps SDKの初期化
   */
  useEffect(() => {
    let mounted = true;

    const initializeZoom = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 開発モード: 環境変数でモックモードを有効化可能
        const isDevMode = import.meta.env.DEV;
        const useMockData = import.meta.env.VITE_USE_MOCK_DATA === 'true';

        // Zoom Apps SDKの読み込み確認
        let zoomSdk = window.ZoomAppsSDK;

        // 開発モードでモックデータを使用する場合
        if ((isDevMode && useMockData) || (!zoomSdk && isDevMode)) {
          addLog('開発モード: モックデータを使用します');
          
          // モックデータの作成
          const mockParticipants = [
            { participantId: 'mock-user-1', displayName: 'テストユーザー1' },
            { participantId: 'mock-user-2', displayName: 'テストユーザー2' },
            { participantId: 'mock-user-3', displayName: 'テストユーザー3' },
          ];

          // モックSDKの作成
          zoomSdk = {
            config: async () => {
              addLog('モックSDK: 設定完了');
            },
            getMeetingParticipants: async () => mockParticipants,
            onActiveSpeakerChange: (callback) => {
              addLog('モックSDK: アクティブスピーカー変更イベントを購読');
              // 5秒ごとにスピーカーを切り替える（テスト用）
              let currentIndex = 0;
              const intervalId = setInterval(() => {
                if (mounted) {
                  const speakerId = mockParticipants[currentIndex].participantId;
                  callback({ activeSpeakerId: speakerId });
                  currentIndex = (currentIndex + 1) % mockParticipants.length;
                } else {
                  clearInterval(intervalId);
                }
              }, 5000);
            },
            onParticipantChange: (callback) => {
              addLog('モックSDK: 参加者変更イベントを購読');
            },
          } as any;
        } else if (!zoomSdk) {
          throw new Error('Zoom Apps SDKが読み込まれていません。Zoomミーティング内でアプリとして起動してください。');
        }

        // Zoom Apps SDKの初期化
        // 注意: 実際のZoom環境では、manifest.jsonとngrokなどの設定が必要です
        // config()で必要な権限を設定
        await zoomSdk.config({
          capabilities: [
            'getMeetingParticipants',
            'onActiveSpeakerChange',
            'onParticipantChange'
          ]
        });
        addLog('Zoom Apps SDKの設定が完了しました');

        // 参加者一覧の取得
        try {
          // 注意: 実際のAPI名は getMeetingParticipants または getParticipants の可能性があります
          // ドキュメントに合わせて調整してください
          const getParticipants = zoomSdk.getMeetingParticipants || zoomSdk.getParticipants;
          const participantsList = getParticipants ? await getParticipants() : [];
          addLog(`参加者数: ${participantsList.length}人`);

          const initialParticipants = new Map<string, ParticipantStats>();
          if (Array.isArray(participantsList)) {
            participantsList.forEach((participant: any) => {
              initialParticipants.set(participant.participantId, {
                participantId: participant.participantId,
                displayName: participant.displayName || `参加者 ${participant.participantId}`,
                speakingCount: 0,
                totalSpeakingMs: 0,
                isSpeaking: false,
                lastStartedSpeakingAt: null,
              });
            });
          }

          if (mounted) {
            setParticipants(initialParticipants);
          }
        } catch (err) {
          console.warn('参加者一覧の取得に失敗しました（開発環境の可能性）:', err);
          // 開発環境では参加者一覧が取得できない場合があるため、エラーにしない
          addLog('参加者一覧の取得に失敗しました（開発環境の可能性）');
        }

        // アクティブスピーカーの変更イベントを購読
        try {
          // 注意: 実際のAPI名は onActiveSpeakerChange または on('activeSpeakerChange') の可能性があります
          if (zoomSdk.onActiveSpeakerChange) {
            zoomSdk.onActiveSpeakerChange((event: { activeSpeakerId?: string | null; activeSpeaker?: string | null }) => {
              if (mounted) {
                const speakerId = event.activeSpeakerId || event.activeSpeaker || null;
                handleActiveSpeakerChange(speakerId);
              }
            });
            addLog('アクティブスピーカー変更イベントを購読しました');
          } else if (zoomSdk.on) {
            await zoomSdk.on('activeSpeakerChange', (payload: { activeSpeakerId: string | null }) => {
              if (mounted) {
                handleActiveSpeakerChange(payload.activeSpeakerId);
              }
            });
            addLog('アクティブスピーカー変更イベントを購読しました');
          }
        } catch (err) {
          console.warn('アクティブスピーカーイベントの購読に失敗しました:', err);
          addLog('アクティブスピーカーイベントの購読に失敗しました');
        }

        // 参加者変更イベントを購読（参加者が追加/削除された場合）
        try {
          const updateParticipants = async () => {
            if (mounted) {
              try {
                const getParticipants = zoomSdk.getMeetingParticipants || zoomSdk.getParticipants;
                const participantsList = getParticipants ? await getParticipants() : [];
                if (Array.isArray(participantsList)) {
                  updateParticipantStats((prev) => {
                    const updated = new Map(prev);
                    
                    // 既存の参加者を保持しつつ、新しい参加者を追加
                    participantsList.forEach((participant: any) => {
                      if (!updated.has(participant.participantId)) {
                        updated.set(participant.participantId, {
                          participantId: participant.participantId,
                          displayName: participant.displayName || `参加者 ${participant.participantId}`,
                          speakingCount: 0,
                          totalSpeakingMs: 0,
                          isSpeaking: false,
                          lastStartedSpeakingAt: null,
                        });
                        addLog(`${participant.displayName || participant.participantId} が参加しました`);
                      }
                    });

                    // 削除された参加者を除去
                    const currentIds = new Set(participantsList.map((p: any) => p.participantId));
                    for (const [id, stats] of updated.entries()) {
                      if (!currentIds.has(id)) {
                        updated.delete(id);
                        addLog(`${stats.displayName} が退出しました`);
                      }
                    }

                    return updated;
                  });
                }
              } catch (err) {
                console.error('参加者一覧の更新に失敗しました:', err);
              }
            }
          };

          if (zoomSdk.onParticipantChange) {
            zoomSdk.onParticipantChange(updateParticipants);
            addLog('参加者変更イベントを購読しました');
          } else if (zoomSdk.on) {
            await zoomSdk.on('participantChange', updateParticipants);
            addLog('参加者変更イベントを購読しました');
          }
        } catch (err) {
          console.warn('参加者変更イベントの購読に失敗しました:', err);
        }

        if (mounted) {
          setIsLoading(false);
          addLog('Zoom Apps SDKの初期化が完了しました');
        }
      } catch (err) {
        console.error('Zoom Apps SDKの初期化に失敗しました:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
          setIsLoading(false);
          addLog(`エラー: ${err instanceof Error ? err.message : '不明なエラー'}`);
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
   */
  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
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
  }, [currentSpeakerId]);

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
  const currentSpeaker = currentSpeakerId ? participants.get(currentSpeakerId) : null;

  return {
    participants: participantsArray,
    currentSpeaker,
    currentSpeakerId,
    isLoading,
    error,
    logs,
    speechSummaries,
  };
}

