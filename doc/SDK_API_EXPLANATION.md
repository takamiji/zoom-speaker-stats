# 使用している 4 つの SDK API と取得内容

最終更新日: 2025 年 12 月

## 📋 使用している 4 つの SDK API

### 1. `getMeetingContext`

**設定**: `capabilities`に含まれているが、**実際には使用していない**

**取得できる内容（想定）**:

- ミーティング情報（ミーティング ID、ミーティング名など）
- ユーザー情報（ユーザー ID、ユーザー名、役割（host/participant）など）
- ミーティングの状態（進行中、終了など）

**現在の使用状況**: ❌ 使用していない

---

### 2. `getMeetingParticipants`

**設定**: `capabilities`に含まれている、**実際に使用している**

**取得できる内容**:

- 参加者一覧（配列）
- 各参加者の情報:
  - `participantId` または `participantUUID`
  - `displayName` または `name` または `screenName`
  - その他の参加者情報

**現在の使用状況**: ✅ 使用している

- 初期化時に参加者一覧を取得
- `onParticipantChange`イベント内でも使用

**問題点**:

- `callZoomApi`エラーが発生している（SDK の内部初期化が完了していない可能性）

---

### 3. `onActiveSpeakerChange`

**設定**: `capabilities`に含まれている、**実際に使用している**

**取得できる内容**:

- アクティブスピーカー（現在話している人）の情報
- イベントの構造:
  ```typescript
  {
    users: [
      {
        participantId: string,
        participantUUID: string,
        screenName: string,
        timestamp: string
      }
    ],
    timestamp: number
  }
  ```
- `users`配列が空の場合: ミュート状態または話者なし

**現在の使用状況**: ✅ 使用している

- 話し始めた時、話者が変わった時にイベントが来る
- **問題**: 話し続けている間はイベントが来ない可能性がある

**イベントの頻度**:

- 話し始めた時: イベントが来る
- 話し続けている間: **イベントが来ない可能性**（21 秒間イベントが来ていないログから推測）
- 話をやめた時: イベントが来る（`users`配列が空の場合）

---

### 4. `onParticipantChange`

**設定**: `capabilities`に含まれている、**実際に使用している**

**取得できる内容**:

- 参加者が追加/削除された時にイベントが来る
- イベント自体には参加者情報が含まれていない
- イベントが来たら、`getMeetingParticipants()`を呼び出して参加者一覧を取得

**現在の使用状況**: ✅ 使用している

- 参加者が追加/削除された時に、参加者一覧を更新

**問題点**:

- イベントが来た時に`getMeetingParticipants()`を呼び出すが、`callZoomApi`エラーが発生する可能性がある

---

## 🔍 各 API の取得内容の詳細

### `getMeetingContext`（未使用）

```typescript
const context = await sdk.getMeetingContext();
// 想定される構造:
// {
//   meetingId: string,
//   meetingName: string,
//   user: {
//     userId: string,
//     userName: string,
//     role: 'host' | 'participant' | 'co-host'
//   },
//   ...
// }
```

### `getMeetingParticipants`（使用中）

```typescript
const participants = await sdk.getMeetingParticipants();
// 実際の構造（想定）:
// [
//   {
//     participantId: string,
//     participantUUID: string,
//     displayName?: string,
//     name?: string,
//     screenName?: string,
//     isMuted?: boolean,        // ミュート状態（取得できる可能性）
//     isSpeaking?: boolean,     // 話しているか（取得できる可能性）
//     audioStatus?: string,     // 音声状態（取得できる可能性）
//     ...
//   },
//   ...
// ]
```

**各ユーザーの状態情報が取得できる可能性**:

- `isMuted`: ミュート状態
- `isSpeaking`: 話しているかどうか
- `audioStatus`: 音声状態（"muted", "unmuted", "speaking"など）

**確認方法**:

- 504 行目で`JSON.stringify(participantsList)`でログ出力しているので、実際に何が返ってきているかログで確認可能
- 定期的に`getMeetingParticipants()`を呼び出せば、各参加者の状態を取得できる可能性がある

### `onActiveSpeakerChange`（使用中）

```typescript
sdk.onActiveSpeakerChange((event) => {
  // 実際の構造:
  // {
  //   users: [
  //     {
  //       participantId: string,
  //       participantUUID: string,
  //       screenName: string,
  //       timestamp: string
  //     }
  //   ],
  //   timestamp: number
  // }
  //
  // users配列が空の場合: ミュート状態または話者なし
});
```

### `onParticipantChange`（使用中）

```typescript
sdk.onParticipantChange(() => {
  // イベント自体には参加者情報が含まれていない
  // イベントが来たら、getMeetingParticipants()を呼び出して参加者一覧を取得
  const participants = await sdk.getMeetingParticipants();
});
```

---

## ⚠️ 現在の問題点

1. **`getMeetingContext`を使用していない**

   - 設定には含まれているが、実際には呼び出していない
   - ミーティング情報やユーザー情報を取得できていない

2. **`getMeetingParticipants`が失敗している**

   - `callZoomApi`エラーが発生
   - SDK の内部初期化が完了していない可能性

3. **`onActiveSpeakerChange`のイベント頻度が不明確**

   - 話し続けている間はイベントが来ない可能性
   - その結果、5 秒経過で話者なしになる

4. **`onParticipantChange`のイベント処理**
   - イベントが来た時に`getMeetingParticipants()`を呼び出すが、エラーが発生する可能性

---

## 🔧 推奨される改善

1. **`getMeetingContext`を使用する**

   - ミーティング情報やユーザー情報を取得
   - ホスト判定などに活用

2. **`getMeetingParticipants`のエラーを解決**

   - SDK の内部初期化を確実に待つ
   - エラーハンドリングを改善

3. **`onActiveSpeakerChange`の動作を確認**

   - 話し続けている間もイベントが来るのか確認
   - 来ない場合は、別の方法で話し続けていることを検出

4. **`onParticipantChange`のエラーハンドリングを改善**
   - `getMeetingParticipants()`が失敗した場合の処理を追加
