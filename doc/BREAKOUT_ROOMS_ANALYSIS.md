# ブレイクアウトルーム対応の実現可能性検討

最終更新日: 2025 年 12 月 16 日

## 📋 要件の整理

### 必須要件

1. **各ブレイクアウトルームで測定**

   - 各ブレイクアウトルームごとに発話統計を測定
   - 各ルーム内の参加者の発話状況を個別に集計

2. **各ルームで結果をダウンロード**

   - 各ブレイクアウトルームの参加者が、そのルームの結果をダウンロード可能
   - CSV/JSON 形式でのエクスポート

3. **ホストが全ルームの結果をリアルタイムで確認**
   - ホストはすべてのブレイクアウトルームの結果をリアルタイムで確認可能
   - 統合ビューで全ルームの状況を一覧表示

---

## 🔍 技術的実現可能性の検討

### 1. 各ブレイクアウトルームで測定

#### 実現可能性: ⚠️ **部分的に可能（要確認）**

**技術的根拠:**

- ✅ **Zoom Apps SDK の制約**: 現在の実装では、`getMeetingParticipants()` は**現在のルーム（メインルームまたはブレイクアウトルーム）の参加者のみ**を返す可能性が高い
- ✅ **ブレイクアウトルーム内での動作**: 各ブレイクアウトルーム内でアプリが起動すれば、そのルームの参加者情報は取得可能
- ⚠️ **課題**: Zoom Apps SDK がブレイクアウトルームの識別情報（ルーム ID、ルーム名など）を提供するかどうかが不明

**必要な確認事項:**

1. Zoom Apps SDK に以下の API が存在するか:

   - `getBreakoutRooms()` - 全ブレイクアウトルームの一覧取得
   - `getCurrentBreakoutRoom()` - 現在のブレイクアウトルーム情報取得
   - `getBreakoutRoomParticipants(roomId)` - 特定ルームの参加者取得
   - `onBreakoutRoomChange()` - ブレイクアウトルーム変更イベント

2. 参加者データにブレイクアウトルーム情報が含まれるか:
   ```typescript
   interface Participant {
     participantId: string;
     displayName: string;
     breakoutRoomId?: string; // ブレイクアウトルームID
     breakoutRoomName?: string; // ブレイクアウトルーム名
     isInBreakoutRoom?: boolean; // ブレイクアウトルーム内にいるか
   }
   ```

**実装アプローチ（仮説）:**

```typescript
// 各ブレイクアウトルーム内で動作する場合
const currentRoom = await zoomSdk.getCurrentBreakoutRoom();
const participants = await zoomSdk.getMeetingParticipants();

// ルームIDをキーとして統計を管理
const statsByRoom = new Map<string, Map<string, ParticipantStats>>();
statsByRoom.set(currentRoom.id, new Map());

// 各ルームごとに統計を集計
participants.forEach((participant) => {
  const roomId = participant.breakoutRoomId || "main";
  // 統計を更新
});
```

---

### 2. 各ルームで結果をダウンロード

#### 実現可能性: ✅ **可能**

**技術的根拠:**

- ✅ **クライアント側でのデータエクスポート**: ブラウザの API（`Blob`、`URL.createObjectURL`）を使用して CSV/JSON 形式でダウンロード可能
- ✅ **データの分離**: 各ルームの統計データを分離して保持すれば、そのルームのデータのみをエクスポート可能

**実装アプローチ:**

```typescript
// データエクスポート機能
function exportRoomData(roomId: string, stats: Map<string, ParticipantStats>) {
  const data = Array.from(stats.values()).map((stat) => ({
    表示名: stat.displayName,
    発話回数: stat.speakingCount,
    総発話時間: formatTime(stat.totalSpeakingMs),
    平均発話時間: formatTime(calculateAverageSpeakingTime(stat)),
    // ... その他の統計
  }));

  // CSV形式でダウンロード
  const csv = convertToCSV(data);
  downloadFile(csv, `breakout-room-${roomId}-stats.csv`);
}
```

**必要な実装:**

- `src/utils/export.ts` - データエクスポート用ユーティリティ
- `src/components/ExportButton.tsx` - エクスポートボタンコンポーネント

---

### 3. ホストが全ルームの結果をリアルタイムで確認

#### 実現可能性: ⚠️ **困難（要追加実装）**

**技術的制約:**

- ❌ **Zoom Apps SDK の制約**: 現在の SDK では、**他のブレイクアウトルームの参加者情報を直接取得できない**可能性が高い
- ❌ **プライバシー制約**: ブレイクアウトルームは通常、各ルームのプライバシーを保護するため、他のルームのデータにアクセスできない設計

**解決策の検討:**

#### 解決策 A: バックエンドサーバーを使用（推奨）

**アーキテクチャ:**

```
┌─────────────────────────────────────────┐
│  Zoom ミーティング（メインルーム）      │
│  ┌───────────────────────────────────┐ │
│  │ ホスト（全ルームのデータを表示）   │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
           │
           │ WebSocket / REST API
           │
┌──────────▼──────────────────────────────┐
│  バックエンドサーバー                   │
│  - 各ルームのデータを集約                │
│  - リアルタイムでホストに配信            │
└─────────────────────────────────────────┘
           │
           │ WebSocket / REST API
           │
┌──────────▼──────────────────────────────┐
│  ブレイクアウトルーム1, 2, 3...          │
│  ┌───────────────────────────────────┐ │
│  │ 各ルームのアプリ（データを送信）   │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**実装手順:**

1. **バックエンドサーバーの構築**

   - Node.js + Express または Python + FastAPI
   - WebSocket（Socket.io）でリアルタイム通信
   - データベース（Redis/PostgreSQL）でデータを保持

2. **各ルームのアプリからデータを送信**

   ```typescript
   // 各ブレイクアウトルーム内で
   const roomId = await getCurrentBreakoutRoomId();
   const stats = getCurrentRoomStats();

   // バックエンドに送信
   await fetch("https://your-backend.com/api/breakout-rooms/stats", {
     method: "POST",
     body: JSON.stringify({
       roomId,
       meetingId: getMeetingId(),
       stats: Array.from(stats.values()),
       timestamp: Date.now(),
     }),
   });
   ```

3. **ホストのアプリでデータを取得**
   ```typescript
   // メインルーム（ホスト）で
   useEffect(() => {
     const ws = new WebSocket("wss://your-backend.com/ws");
     ws.onmessage = (event) => {
       const allRoomsStats = JSON.parse(event.data);
       // 全ルームの統計を表示
       setAllRoomsStats(allRoomsStats);
     };
   }, []);
   ```

**必要な技術スタック:**

- バックエンド: Node.js + Express + Socket.io または Python + FastAPI + WebSocket
- データベース: Redis（リアルタイムデータ用）、PostgreSQL（永続化用）
- 認証: JWT または Zoom OAuth

#### 解決策 B: Zoom API を使用（要調査）

**可能性:**

- Zoom REST API にブレイクアウトルーム情報を取得するエンドポイントがあるか確認
- ホスト権限で全ルームの参加者情報を取得できるか確認

**制約:**

- API レート制限がある可能性
- リアルタイム性が低い（ポーリングが必要）

#### 解決策 C: ローカルストレージ + 同期（限定的）

**アプローチ:**

- 各ルームのデータをローカルストレージに保存
- メインルームに戻ったときにデータを統合

**制約:**

- リアルタイム性が低い
- メインルームに戻らないとデータが取得できない

---

## 📊 実現可能性まとめ

| 要件                                           | 実現可能性                | 難易度 | 必要な追加実装                       |
| ---------------------------------------------- | ------------------------- | ------ | ------------------------------------ |
| **各ブレイクアウトルームで測定**               | ⚠️ 部分的に可能           | 中     | Zoom Apps SDK の API 確認・実装      |
| **各ルームで結果をダウンロード**               | ✅ 可能                   | 低     | エクスポート機能の実装               |
| **ホストが全ルームの結果をリアルタイムで確認** | ⚠️ 困難（要バックエンド） | 高     | バックエンドサーバー、WebSocket 通信 |

---

## 🎯 推奨実装アプローチ

### Phase 1: 基本機能の実装（現在の実装を拡張）

1. **ブレイクアウトルーム情報の取得**

   - Zoom Apps SDK の API を調査
   - 現在のルーム情報を取得する機能を追加

2. **ルームごとのデータ分離**

   - `Map<roomId, Map<participantId, ParticipantStats>>` の構造でデータを管理
   - 各ルームの統計を個別に計算

3. **エクスポート機能の実装**
   - CSV/JSON 形式でのエクスポート
   - 各ルームのデータを個別にダウンロード可能に

### Phase 2: バックエンド統合（ホストの全ルーム表示）

1. **バックエンドサーバーの構築**

   - WebSocket サーバーの実装
   - データベースの設計と実装

2. **各ルームからのデータ送信**

   - 統計データをバックエンドに送信
   - 定期的な更新（例: 5 秒ごと）

3. **ホストの統合ビュー**
   - 全ルームの統計を一覧表示
   - リアルタイム更新

---

## ⚠️ 注意事項

### プライバシーとセキュリティ

1. **参加者の同意**: ブレイクアウトルームでのデータ収集について、参加者に事前に説明と同意を得る必要がある
2. **データの暗号化**: バックエンドサーバーでデータを送信する際は、HTTPS を使用
3. **データの保持期間**: データの保持期間を明確にし、不要になったら削除する仕組みを実装

### 技術的制約

1. **Zoom Apps SDK の制限**: SDK がブレイクアウトルーム情報を提供しない場合、代替手段が必要
2. **パフォーマンス**: 多数のブレイクアウトルームがある場合、リアルタイム更新の負荷を考慮
3. **ネットワーク**: バックエンドサーバーへの通信が不安定な場合のエラーハンドリング

---

## 📚 次のステップ

1. **Zoom Apps SDK の公式ドキュメントを確認**

   - ブレイクアウトルーム関連の API の有無を確認
   - サンプルコードやチュートリアルを調査

2. **プロトタイプの実装**

   - 単一のブレイクアウトルームでの動作確認
   - ルーム情報の取得テスト

3. **バックエンドの設計**

   - アーキテクチャの詳細設計
   - データベーススキーマの設計

4. **実装計画の策定**
   - Phase 1 と Phase 2 の詳細なタスク分解
   - 工数見積もり

---

## 🔗 参考資料

- [Zoom Apps SDK 公式ドキュメント](https://developers.zoom.us/docs/apps/)
- [Zoom REST API ドキュメント](https://developers.zoom.us/docs/api/)
- [Zoom ブレイクアウトルーム機能](https://support.zoom.us/hc/ja/articles/115005769646)

---

## 📝 結論

### 実現可能性の総合評価

- ✅ **各ブレイクアウトルームで測定**: **可能**（Zoom Apps SDK の API 確認が必要）
- ✅ **各ルームで結果をダウンロード**: **可能**（比較的簡単に実装可能）
- ⚠️ **ホストが全ルームの結果をリアルタイムで確認**: **困難**（バックエンドサーバーが必要）

**総合判断**: 基本的な機能（各ルームでの測定とダウンロード）は実現可能だが、ホストの全ルーム表示には**バックエンドサーバーの構築が必要**です。

**推奨**: まずは Phase 1（各ルームでの測定とダウンロード）を実装し、その後 Phase 2（バックエンド統合）を検討する段階的アプローチを推奨します。
