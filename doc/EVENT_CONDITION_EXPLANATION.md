# イベント取得と判定条件の説明

最終更新日: 2025 年 12 月

## 📋 取得しているイベント

### 1. アクティブスピーカー変更イベント（`onActiveSpeakerChange`）

Zoom Apps SDK から取得するイベント：

- **イベント名**: `onActiveSpeakerChange`
- **取得方法**: `sdk.onActiveSpeakerChange(callback)` または `sdk.on("activeSpeakerChange", callback)`
- **イベントの頻度**: Zoom SDK が決定（通常は話者が変わるたび、または定期的に）

## 🔍 イベントの構造解析

### `parseActiveSpeakerEvent`関数で解析

イベントから`speakerId`を取得する際、以下の 3 つのパターンをチェック：

#### パターン 1: `activeSpeakerId`または`activeSpeaker`が直接含まれている

```typescript
if (event.activeSpeakerId) {
  return { speakerId: event.activeSpeakerId };
}
if (event.activeSpeaker) {
  return { speakerId: event.activeSpeaker };
}
```

#### パターン 2: `users`配列が含まれている（実際の Zoom Apps SDK の形式）

```typescript
if (event.users && Array.isArray(event.users)) {
  if (event.users.length === 0) {
    return { speakerId: null }; // ミュート状態
  }
  const firstUser = event.users[0];
  const speakerId =
    firstUser.participantId || firstUser.participantUUID || null;
  return { speakerId, userInfo: firstUser };
}
```

#### パターン 3: `payload.users`が含まれている

```typescript
if (event.payload?.users && Array.isArray(event.payload.users)) {
  if (event.payload.users.length === 0) {
    return { speakerId: null }; // ミュート状態
  }
  const firstUser = event.payload.users[0];
  const speakerId =
    firstUser.participantId || firstUser.participantUUID || null;
  return { speakerId, userInfo: firstUser };
}
```

## 📊 判定条件（`handleActiveSpeakerChange`関数）

### 条件 1: 話者なし（`activeSpeakerId === null`）

**発生条件**:

- `users`配列が空（ミュート状態）
- イベントに話者情報が含まれていない

**処理**:

1. 前の話者の`isSpeaking`を`false`にする
2. 発話時間を集計
3. `currentSpeakerId`を`null`に設定

### 条件 2: 前の話者と異なる話者が話し始めた

**発生条件**:

- `activeSpeakerId !== prevSpeakerId`
- `prevSpeakerId`が存在する

**処理**:

1. 前の話者の`isSpeaking`を`false`にする
2. 前の話者の発話時間を集計
3. 新しい話者の`isSpeaking`を`true`にする
4. 新しい話者の`lastStartedSpeakingAt`を記録

### 条件 3: 新しい話者が話し始めた

**発生条件**:

- `activeSpeakerId !== prevSpeakerId`
- `prevSpeakerId`が`null`（最初の話者）

**処理**:

1. 新しい話者の`isSpeaking`を`true`にする
2. 新しい話者の`lastStartedSpeakingAt`を記録
3. `speakingCount`をインクリメント

### 条件 4: 同じ話者が話し続けている

**発生条件**:

- `activeSpeakerId === prevSpeakerId`
- `activeSpeakerId`が`null`でない

**処理**:

1. `isSpeaking`の状態は変更しない（既に`true`のはず）
2. `lastActiveSpeakerTimeRef.current`を更新（タイムアウトを防ぐ）

## ⏱️ タイムアウトチェック（1 秒ごと）

### チェック内容

1 秒ごとに以下のチェックを実行：

```typescript
if (lastActiveSpeakerTimeRef.current && currentSpeakerId) {
  const timeSinceLastEvent = now - lastActiveSpeakerTimeRef.current;

  // 5秒以上経過した場合
  if (timeSinceLastEvent > 5000) {
    // isSpeakingがtrueの場合、まずfalseにする
    if (isCurrentlySpeaking) {
      // isSpeakingをfalseにする処理
    }
    // 話者なしに設定
    handleActiveSpeakerChange(null);
  }
}
```

### タイムアウトの条件

- **最後のアクティブスピーカーイベントから 5 秒以上経過**
- `isSpeaking`が`true`でも`false`でも、5 秒経過したら話者なしにする

## ⚠️ 現在の問題点

1. **アクティブスピーカーイベントの頻度が不明確**

   - 話し続けている間、イベントが継続的に来るのか、来なくなるのかが不明
   - ログを見ると、21 秒間イベントが来ていないのに`isSpeaking: true`のまま

2. **同じ話者が話し続けている場合の処理**

   - 条件 4 では`isSpeaking`を変更しない
   - しかし、イベントが来なくなった場合、`isSpeaking`が`true`のままになる

3. **タイムアウトチェックのタイミング**
   - 1 秒ごとにチェックしているが、イベントが来ない場合の処理が不十分

## 🔧 推奨される修正

1. **イベントの頻度を確認**

   - ログで、話し続けている間もイベントが来るのか確認
   - 来ない場合は、別の方法で話し続けていることを検出する必要がある

2. **タイムアウトチェックの改善**

   - 5 秒経過した場合、`isSpeaking`が`true`でも`false`にする
   - その後、話者なしにする

3. **イベントのログ出力を強化**
   - イベントが来た時刻、内容を詳細にログ出力
   - タイムアウトチェックの結果も詳細にログ出力
