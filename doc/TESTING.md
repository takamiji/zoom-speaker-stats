# 動作確認ガイド

このドキュメントでは、Zoom 発話者リアルタイム分析アプリの動作確認方法を説明します。

## 目次

1. [ローカル環境での基本確認](#ローカル環境での基本確認)
2. [開発モード（モックデータ）での確認](#開発モードモックデータでの確認)
3. [実際の Zoom ミーティング内での確認](#実際のzoomミーティング内での確認)

---

## ローカル環境での基本確認

### 1. 開発サーバーの起動

```bash
npm run dev
```

開発サーバーが `http://localhost:3000` で起動します。

### 2. ブラウザで確認

1. ブラウザで `http://localhost:3000` を開く
2. 以下のような画面が表示されることを確認：
   - ヘッダーに「Zoom 発話者リアルタイム分析」と表示
   - 「エラーが発生しました」メッセージが表示される（これは正常です）
   - エラーメッセージに「Zoom Apps SDK が読み込まれていません」と表示

**注意**: ローカル環境では Zoom Apps SDK が利用できないため、エラーが表示されます。これは想定された動作です。

### 3. UI の確認項目

- ✅ ヘッダーが正しく表示される
- ✅ エラーメッセージが適切に表示される
- ✅ スタイリングが正しく適用されている
- ✅ レスポンシブデザインが機能している

---

## 開発モード（モックデータ）での確認

実際の Zoom 環境がなくても、UI とロジックの動作を確認できるモックモードを追加できます。

### モックモードの有効化

`src/hooks/useZoomSpeakerStats.ts` を編集して、開発環境でモックデータを使用するように設定できます。

**簡易的な確認方法**:

1. ブラウザの開発者ツール（F12）を開く
2. コンソールタブで以下を実行：

```javascript
// モックデータでテスト
window.ZoomAppsSDK = {
  config: async () => {},
  getMeetingParticipants: async () => [
    { participantId: "user1", displayName: "テストユーザー1" },
    { participantId: "user2", displayName: "テストユーザー2" },
    { participantId: "user3", displayName: "テストユーザー3" },
  ],
  onActiveSpeakerChange: (callback) => {
    // 5秒ごとにスピーカーを切り替えるモック
    let currentIndex = 0;
    const users = ["user1", "user2", "user3"];
    setInterval(() => {
      callback({ activeSpeakerId: users[currentIndex] });
      currentIndex = (currentIndex + 1) % users.length;
    }, 5000);
  },
};
```

3. ページをリロード（F5）

これで、モックデータを使って UI の動作を確認できます。

---

## 実際の Zoom ミーティング内での確認

### 前提条件

- Zoom アカウント（開発者アカウント推奨）
- ngrok または類似のトンネリングサービス
- Zoom Marketplace Developer アカウント

### 手順

#### 1. manifest.json の作成

プロジェクトルートに `manifest.json` を作成：

```json
{
  "app_name": "発話者リアルタイム分析",
  "version": "0.0.1",
  "app_type": "iframe",
  "app_url": "https://your-ngrok-url.ngrok.io",
  "app_desc": "参加者の発話状況をリアルタイムで可視化します",
  "app_icon": "https://your-ngrok-url.ngrok.io/icon.png",
  "app_contact": "your-email@example.com",
  "app_category": "productivity",
  "app_permissions": [
    "getMeetingParticipants",
    "onActiveSpeakerChange",
    "onParticipantChange"
  ]
}
```

#### 2. ngrok のセットアップ

```bash
# ngrokをインストール（未インストールの場合）
# https://ngrok.com/download からダウンロード

# 開発サーバーを起動
npm run dev

# 別のターミナルでngrokを起動
ngrok http 3000
```

ngrok が提供する HTTPS URL（例: `https://xxxx-xxxx-xxxx.ngrok.io`）をコピーします。

#### 3. manifest.json の更新

ngrok の URL を `manifest.json` の `app_url` に設定します。

#### 4. Zoom Marketplace でのアプリ登録

1. [Zoom Marketplace Developer](https://marketplace.zoom.us/) にログイン
2. 「Develop」→「Build App」を選択
3. 「Zoom Apps」を選択
4. アプリ情報を入力
5. manifest.json をアップロード
6. アプリを公開（開発モードでテスト可能）

#### 5. Zoom ミーティングでの確認

1. Zoom クライアントでミーティングを開始
2. ミーティング内で「Apps」ボタンをクリック
3. 登録したアプリを選択して起動
4. アプリが正しく表示されることを確認
5. 参加者が話すと、リアルタイムで統計が更新されることを確認

### 確認項目

- ✅ アプリが Zoom ミーティング内で起動する
- ✅ 参加者一覧が正しく表示される
- ✅ アクティブスピーカーが正しく検出される
- ✅ 発話回数が正しくカウントされる
- ✅ 総発話時間が正しく計算される
- ✅ 現在話している人が目立つ形で表示される
- ✅ イベントログが正しく記録される

---

## トラブルシューティング

### エラー: "Zoom Apps SDK が読み込まれていません"

**原因**: ローカル環境で直接ブラウザを開いている、または Zoom ミーティング外でアクセスしている

**解決策**:

- 実際の Zoom ミーティング内でアプリとして起動する必要があります
- 開発モードで確認したい場合は、上記のモックモードを使用してください

### エラー: "参加者一覧の取得に失敗しました"

**原因**: 権限が正しく設定されていない、または SDK の API 名が異なる

**解決策**:

1. `manifest.json` の `app_permissions` を確認
2. `src/hooks/useZoomSpeakerStats.ts` の API 名を確認
3. Zoom Apps SDK の最新ドキュメントを参照

### アプリが Zoom ミーティング内で表示されない

**原因**: manifest.json の設定ミス、または ngrok の URL が正しくない

**解決策**:

1. manifest.json の構文を確認
2. ngrok の URL が正しく設定されているか確認
3. Zoom Marketplace でアプリのステータスを確認

### 発話統計が更新されない

**原因**: アクティブスピーカーイベントが正しく購読されていない

**解決策**:

1. ブラウザの開発者ツールでコンソールエラーを確認
2. `src/hooks/useZoomSpeakerStats.ts` のイベント購読部分を確認
3. Zoom Apps SDK のイベント名が正しいか確認

---

## 開発時のヒント

### ブラウザの開発者ツールを活用

1. **コンソールタブ**: エラーメッセージやログを確認
2. **ネットワークタブ**: SDK の読み込み状況を確認
3. **React Developer Tools**: コンポーネントの状態を確認

### ログの確認

アプリ内の「イベントログ」セクションで、以下の情報を確認できます：

- SDK の初期化状況
- 参加者の参加/退出
- アクティブスピーカーの変更
- エラーメッセージ

### 段階的なテスト

1. まずローカル環境で UI を確認
2. モックデータでロジックを確認
3. 実際の Zoom 環境で完全な動作を確認

---

## 次のステップ

動作確認が完了したら：

- ブレイクアウトルーム対応の実装
- 発話量の推移グラフの追加
- データのエクスポート機能の追加
