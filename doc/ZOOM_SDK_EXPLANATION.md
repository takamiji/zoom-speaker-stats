# Zoom Apps SDK の仕組みと使用方法

このドキュメントでは、Zoom Apps SDK とは何か、そしてこのプロジェクトでどのように使用しているかをわかりやすく説明します。

## 📚 目次

1. [Zoom Apps SDK とは](#zoom-apps-sdkとは)
2. [このプロジェクトでの使用方法](#このプロジェクトでの使用方法)
3. [実際の SDK とモックデータの違い](#実際のsdkとモックデータの違い)
4. [動作環境による違い](#動作環境による違い)

---

## Zoom Apps SDK とは

### 基本的な説明

**Zoom Apps SDK** は、Zoom ミーティング内で動作するアプリケーションを開発するための JavaScript ライブラリです。

### 特徴

1. **CDN から読み込む**: npm パッケージではなく、Zoom が提供する CDN から JavaScript ファイルを読み込みます
2. **グローバルオブジェクト**: ブラウザの `window.ZoomAppsSDK` というグローバルオブジェクトとして利用できます
3. **Zoom 環境でのみ動作**: 実際の Zoom ミーティング内でアプリとして起動したときのみ、SDK が正しく機能します

### 提供される機能

- **参加者情報の取得**: ミーティング参加者の一覧を取得
- **アクティブスピーカーの検出**: 現在話している人を検出
- **イベントの購読**: 参加者の参加/退出、スピーカーの変更などのイベントを受け取る
- **その他**: ブレイクアウトルーム管理、チャット機能など

---

## このプロジェクトでの使用方法

### 1. SDK の読み込み

`index.html` で、Zoom が提供する CDN から SDK を読み込んでいます：

```html
<!-- index.html -->
<script src="https://appssdk.zoom.us/sdk.min.js"></script>
```

このスクリプトが読み込まれると、`window.ZoomAppsSDK` というオブジェクトが利用可能になります。

### 2. SDK の使用

`src/hooks/useZoomSpeakerStats.ts` で、以下のように SDK を使用しています：

```typescript
// 1. SDKが読み込まれているか確認
if (!window.ZoomAppsSDK) {
  throw new Error("Zoom Apps SDKが読み込まれていません");
}

// 2. SDKオブジェクトを取得
const zoomSdk = window.ZoomAppsSDK;

// 3. 必要な権限を設定
await zoomSdk.config({
  capabilities: [
    "getMeetingParticipants", // 参加者一覧を取得する権限
    "onActiveSpeakerChange", // アクティブスピーカー変更イベントを受け取る権限
    "onParticipantChange", // 参加者変更イベントを受け取る権限
  ],
});

// 4. 参加者一覧を取得
const participants = await zoomSdk.getMeetingParticipants();

// 5. アクティブスピーカー変更イベントを購読
zoomSdk.onActiveSpeakerChange((event) => {
  const speakerId = event.activeSpeakerId;
  // スピーカーが変更されたときの処理
});
```

### 3. 型定義

TypeScript で使用するため、グローバルオブジェクトの型を定義しています：

```typescript
// src/hooks/useZoomSpeakerStats.ts
declare global {
  interface Window {
    ZoomAppsSDK?: {
      config: (options: { capabilities: string[] }) => Promise<void>;
      getMeetingParticipants?: () => Promise<any[]>;
      onActiveSpeakerChange?: (callback: (event: {...}) => void) => void;
      // ... その他のメソッド
    };
  }
}
```

---

## 実際の SDK とモックデータの違い

### 実際の Zoom Apps SDK

**動作環境**: Zoom ミーティング内でアプリとして起動したとき

**特徴**:

- ✅ 実際の参加者情報を取得できる
- ✅ リアルタイムでアクティブスピーカーを検出できる
- ✅ 参加者の参加/退出イベントを受け取れる
- ✅ Zoom クライアントと連携して動作する

**使用例**:

```typescript
// 実際のZoom環境では、window.ZoomAppsSDKが自動的に利用可能
const zoomSdk = window.ZoomAppsSDK; // Zoomが提供するSDK
const participants = await zoomSdk.getMeetingParticipants(); // 実際の参加者
```

### モックデータ（開発用）

**動作環境**: ローカル開発環境（Zoom 環境外）

**特徴**:

- ✅ 開発時に UI やロジックをテストできる
- ✅ 実際の Zoom 環境がなくても動作確認できる
- ❌ 実際の参加者情報は取得できない
- ❌ 実際のスピーカー検出はできない

**使用例**:

```typescript
// 開発モードでは、モックSDKを作成
const zoomSdk = {
  config: async () => {},
  getMeetingParticipants: async () => [
    { participantId: "mock-user-1", displayName: "テストユーザー1" },
    // ... モックデータ
  ],
  onActiveSpeakerChange: (callback) => {
    // 5秒ごとに自動でスピーカーを切り替える（テスト用）
    setInterval(() => {
      callback({ activeSpeakerId: "mock-user-1" });
    }, 5000);
  },
};
```

---

## 動作環境による違い

### 環境 1: ローカル開発環境（通常のブラウザ）

```
ブラウザで http://localhost:3000 を開く
↓
window.ZoomAppsSDK は undefined
↓
エラーメッセージが表示される
```

**表示される内容**:

- 「Zoom Apps SDK が読み込まれていません」というエラー

### 環境 2: ローカル開発環境（モックモード有効）

```
.env ファイルに VITE_USE_MOCK_DATA=true を設定
↓
開発サーバーを起動
↓
モックSDKが自動的に作成される
↓
モックデータで動作確認できる
```

**表示される内容**:

- テストユーザーが表示される
- 5 秒ごとに自動でスピーカーが切り替わる
- 発話統計が更新される

### 環境 3: 実際の Zoom ミーティング内

```
Zoomミーティングを開始
↓
アプリを起動
↓
Zoomが window.ZoomAppsSDK を自動的に提供
↓
実際の参加者情報を取得できる
↓
リアルタイムでスピーカーを検出できる
```

**表示される内容**:

- 実際の参加者が表示される
- 実際に話している人が検出される
- リアルタイムで統計が更新される

---

## コードの流れ

### 1. SDK の読み込み確認

```typescript
// src/hooks/useZoomSpeakerStats.ts (131-175行目あたり)

// 開発モードかどうか確認
const isDevMode = import.meta.env.DEV;
const useMockData = import.meta.env.VITE_USE_MOCK_DATA === "true";

// SDKが読み込まれているか確認
let zoomSdk = window.ZoomAppsSDK;

// 開発モードでモックデータを使用する場合
if ((isDevMode && useMockData) || (!zoomSdk && isDevMode)) {
  // モックSDKを作成
  zoomSdk = {
    /* モック実装 */
  };
} else if (!zoomSdk) {
  // SDKが読み込まれていない場合はエラー
  throw new Error("Zoom Apps SDKが読み込まれていません");
}
```

### 2. SDK の初期化

```typescript
// 必要な権限を設定
await zoomSdk.config({
  capabilities: [
    "getMeetingParticipants",
    "onActiveSpeakerChange",
    "onParticipantChange",
  ],
});
```

### 3. 参加者情報の取得

```typescript
// 参加者一覧を取得
const participantsList = await zoomSdk.getMeetingParticipants();

// 各参加者の統計情報を初期化
participantsList.forEach((participant) => {
  // ParticipantStatsを作成
});
```

### 4. イベントの購読

```typescript
// アクティブスピーカー変更イベントを購読
zoomSdk.onActiveSpeakerChange((event) => {
  const speakerId = event.activeSpeakerId;
  // スピーカーが変更されたときの処理
  handleActiveSpeakerChange(speakerId);
});
```

---

## まとめ

### 実際の Zoom Apps SDK を使っているか？

**答え**: はい、使っています。ただし、環境によって動作が異なります。

1. **実際の Zoom 環境**: 実際の Zoom Apps SDK を使用
2. **ローカル開発環境（モックモード）**: モック SDK を使用（開発用）
3. **ローカル開発環境（通常）**: SDK が読み込まれないためエラー

### 重要なポイント

- ✅ **CDN から読み込む**: npm パッケージではなく、`https://appssdk.zoom.us/sdk.min.js` から読み込む
- ✅ **グローバルオブジェクト**: `window.ZoomAppsSDK` として利用可能
- ✅ **Zoom 環境でのみ動作**: 実際の Zoom ミーティング内でアプリとして起動したときのみ、完全に機能する
- ✅ **開発用モック**: ローカル開発環境でも動作確認できるように、モックデータ機能を実装している

### 確認方法

1. **実際の SDK が使われているか確認**:

   - ブラウザの開発者ツール（F12）を開く
   - コンソールで `window.ZoomAppsSDK` を確認
   - Zoom 環境内では、実際の SDK オブジェクトが表示される

2. **モックデータが使われているか確認**:
   - `.env` ファイルに `VITE_USE_MOCK_DATA=true` を設定
   - アプリ内のログに「開発モード: モックデータを使用します」と表示される

---

## 参考リンク

- [Zoom Apps SDK 公式ドキュメント](https://developers.zoom.us/docs/apps/)
- [Zoom App Marketplace](https://marketplace.zoom.us/)
