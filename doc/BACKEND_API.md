# バックエンド API 仕様

最終更新日: 2024 年

## 概要

ブレイクアウトルーム対応機能で使用するバックエンド API の仕様です。

## エンドポイント

### 1. ルーム統計データの保存

**エンドポイント**: `POST /api/rooms/{roomId}/stats`

**説明**: ブレイクアウトルームの統計データを DB に保存します。

**リクエスト**:

```typescript
POST /api/rooms/{roomId}/stats
Content-Type: application/json

{
  "roomId": "room-1234567890-abc",
  "meetingId": "meeting-1234567890",
  "participants": [
    {
      "participantId": "user-1",
      "displayName": "参加者A",
      "speakingCount": 5,
      "totalSpeakingMs": 120000,
      "isSpeaking": false,
      "lastStartedSpeakingAt": null
    }
  ],
  "recordedAt": 1234567890000
}
```

**レスポンス**:

```typescript
200 OK
Content-Type: application/json

{
  "success": true,
  "message": "データを保存しました"
}
```

**エラーレスポンス**:

```typescript
400 Bad Request
Content-Type: application/json

{
  "success": false,
  "message": "無効なデータです"
}
```

### 2. 全ルーム統計データの取得

**エンドポイント**: `GET /api/rooms/stats?meetingId={meetingId}`

**説明**: 指定されたミーティングの全ブレイクアウトルームの統計データを取得します（ホスト閲覧用）。

**リクエスト**:

```typescript
GET /api/rooms/stats?meetingId=meeting-1234567890
```

**レスポンス**:

```typescript
200 OK
Content-Type: application/json

{
  "meetingId": "meeting-1234567890",
  "rooms": [
    {
      "roomId": "room-1234567890-abc",
      "roomName": "グループ1",
      "participants": [
        {
          "participantId": "user-1",
          "displayName": "参加者A",
          "speakingCount": 5,
          "totalSpeakingMs": 120000,
          "isSpeaking": false,
          "lastStartedSpeakingAt": null
        }
      ],
      "lastUpdated": 1234567890000
    }
  ]
}
```

**エラーレスポンス**:

```typescript
404 Not Found
Content-Type: application/json

{
  "success": false,
  "message": "ミーティングが見つかりません"
}
```

## データベーススキーマ

### meetings テーブル

```sql
CREATE TABLE meetings (
  id UUID PRIMARY KEY,
  meeting_name VARCHAR(255) NOT NULL,
  zoom_meeting_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);
```

### breakout_rooms テーブル

```sql
CREATE TABLE breakout_rooms (
  id UUID PRIMARY KEY,
  meeting_id UUID REFERENCES meetings(id),
  room_name VARCHAR(255) NOT NULL,
  room_number INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);
```

### room_stats テーブル

```sql
CREATE TABLE room_stats (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES breakout_rooms(id),
  participant_id VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  speaking_count INTEGER DEFAULT 0,
  total_speaking_ms BIGINT DEFAULT 0,
  is_speaking BOOLEAN DEFAULT FALSE,
  last_started_speaking_at TIMESTAMP,
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_room_stats_room_id ON room_stats(room_id);
CREATE INDEX idx_room_stats_recorded_at ON room_stats(recorded_at);
```

## 実装例

### Node.js + Express の例

```javascript
const express = require("express");
const app = express();

app.use(express.json());

// ルーム統計データの保存
app.post("/api/rooms/:roomId/stats", async (req, res) => {
  const { roomId } = req.params;
  const { meetingId, participants, recordedAt } = req.body;

  try {
    // データベースに保存
    await saveRoomStats(roomId, meetingId, participants, recordedAt);
    res.json({ success: true, message: "データを保存しました" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 全ルーム統計データの取得
app.get("/api/rooms/stats", async (req, res) => {
  const { meetingId } = req.query;

  try {
    const stats = await getAllRoomsStats(meetingId);
    res.json(stats);
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

app.listen(3001, () => {
  console.log("APIサーバーが起動しました: http://localhost:3001");
});
```

## 環境変数

フロントエンド側で以下の環境変数を設定してください：

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

## 注意事項

1. **CORS 設定**: バックエンド API で CORS を有効にする必要があります
2. **認証**: 本番環境では認証（JWT 等）を実装することを推奨します
3. **エラーハンドリング**: 適切なエラーハンドリングを実装してください
4. **データの保持期間**: データの保持期間を設定し、自動削除機能を実装してください
