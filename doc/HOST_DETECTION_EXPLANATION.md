# ホスト判定の仕組み

最終更新日: 2024年

## 📋 概要

このドキュメントでは、Zoom Apps SDKでのホスト判定の仕組みと、現在の実装での動作について説明します。

---

## 🔍 現在の実装

### App.tsxでのホスト判定ロジック

```typescript:src/App.tsx
// ホスト判定とミーティングID取得
useEffect(() => {
  const checkHostAndMeeting = async () => {
    try {
      const zoomSdk = (window as any).ZoomAppsSDK;
      if (zoomSdk) {
        // ホスト判定（SDKが提供する場合）
        // 注意: 実際のAPI名は要確認
        try {
          const userInfo = await (zoomSdk.getCurrentUser?.() || Promise.resolve({ role: 'participant' }));
          setIsHost(userInfo.role === 'host' || userInfo.role === 'co-host');
        } catch {
          // ホスト判定ができない場合はデフォルトでfalse
          setIsHost(false);
        }
        // ...
      } else {
        // 開発モード: モックデータ
        setIsHost(false);
        setMeetingId(`meeting-${Date.now()}`);
      }
    } catch (err) {
      console.error('初期化エラー:', err);
      setIsHost(false);
      setMeetingId(`meeting-${Date.now()}`);
    }
  };

  checkHostAndMeeting();
}, []);
```

---

## 📊 ホスト判定の流れ

### 1. Zoom Apps SDKの確認

```
アプリ起動
  ↓
window.ZoomAppsSDK が存在するか確認
  ↓
存在する → SDKが利用可能
存在しない → 開発モード（isHost = false）
```

### 2. ホスト判定の試行

```
SDKが利用可能
  ↓
zoomSdk.getCurrentUser() を呼び出し
  ↓
成功 → userInfo.role を確認
  ↓
role === 'host' または 'co-host' → isHost = true
それ以外 → isHost = false
```

### 3. エラー時のフォールバック

```
getCurrentUser() が失敗
  ↓
catch ブロックでエラーを捕捉
  ↓
isHost = false（デフォルト）
```

---

## ⚠️ 現在の実装の問題点

### 1. API名が未確定

**問題**: `getCurrentUser()` というAPIが実際に存在するかどうかが不明

```typescript
// 現在の実装（推測）
const userInfo = await (zoomSdk.getCurrentUser?.() || Promise.resolve({ role: 'participant' }));
```

**理由**: 
- Zoom Apps SDKの公式ドキュメントで確認が必要
- 実際のAPI名が異なる可能性がある
- コメントに「注意: 実際のAPI名は要確認」と記載

### 2. 開発環境での動作

**問題**: 開発環境（ローカル）では常に `isHost = false` になる

```typescript
} else {
  // 開発モード: モックデータ
  setIsHost(false);  // ← 常にfalse
  setMeetingId(`meeting-${Date.now()}`);
}
```

**理由**:
- ローカル環境では `window.ZoomAppsSDK` が存在しない
- 実際のZoomミーティング内でないとSDKが読み込まれない
- 開発時のテストが困難

### 3. エラー時のデフォルト値

**問題**: エラーが発生すると常に `isHost = false` になる

```typescript
} catch {
  // ホスト判定ができない場合はデフォルトでfalse
  setIsHost(false);
}
```

**理由**:
- セキュリティ上の理由で、判定できない場合は非ホストとして扱う
- ただし、実際にはホストの可能性もある

---

## 🔧 Zoom Apps SDKでのホスト判定（確認結果）

### 確認された情報

Web検索とZoom Apps SDKの調査結果から、以下のことが確認されました：

1. **ホスト判定は可能**: Zoom Apps SDKを使用して、ミーティング参加者がホストであるかどうかを判定することは可能です。

2. **推奨されるAPI**: `getMeetingContext()` メソッドを使用してホスト判定を行うことが推奨されています。

```typescript
// 推奨される方法: getMeetingContext() メソッド
const context = await zoomSdk.getMeetingContext();
// context.user.role または context.userRole で判定
const isHost = context.user?.role === 'host' || context.userRole === 'host';
```

3. **現在の実装の問題**: 現在の実装では `getCurrentUser()` を使用していますが、実際には `getMeetingContext()` を使用する方が適切な可能性があります。

### 実装例（推奨）

```typescript
// 推奨される実装
try {
  const context = await zoomSdk.getMeetingContext();
  // ユーザーの役割を取得
  const userRole = context.user?.role || context.userRole;
  setIsHost(userRole === 'host' || userRole === 'co-host');
} catch (err) {
  console.warn('ホスト判定に失敗しました:', err);
  setIsHost(false);
}
```

### 注意事項

- **UserIDの取り扱い**: ブレイクアウトルームに移動すると、ユーザーIDが変更される場合があります。UserIDベースでの判定は避けるべきです。
- **SDKのバージョン**: 使用するSDKのバージョンによって、提供されるメソッドや機能が異なる場合があります。
- **テスト環境での検証**: 実際のミーティング環境で、ホスト判定が正確に機能するかをテストすることが重要です。

### 実際のAPI名の確認方法

1. **Zoom Apps SDK公式ドキュメントを確認**
   - [Zoom Apps SDK Documentation](https://developers.zoom.us/docs/apps/)
   - ユーザー情報取得のAPIを確認

2. **実際のZoomミーティングでテスト**
   - ホストとしてミーティングを開始
   - アプリを起動してコンソールで確認
   - `window.ZoomAppsSDK` のメソッド一覧を確認

3. **ブラウザの開発者ツールで確認**
   ```javascript
   // ブラウザのコンソールで実行
   console.log(window.ZoomAppsSDK);
   // 利用可能なメソッドを確認
   ```

---

## 🎯 動作パターン

### パターン1: 実際のZoomミーティング（ホスト）

```
Zoomミーティング開始（ホストとして）
  ↓
アプリ起動
  ↓
window.ZoomAppsSDK が存在
  ↓
zoomSdk.getCurrentUser() を呼び出し
  ↓
userInfo.role === 'host'
  ↓
isHost = true
  ↓
モード選択画面で「計測モード」と「ホスト閲覧モード」の両方が表示
```

### パターン2: 実際のZoomミーティング（参加者）

```
Zoomミーティング参加（参加者として）
  ↓
アプリ起動
  ↓
window.ZoomAppsSDK が存在
  ↓
zoomSdk.getCurrentUser() を呼び出し
  ↓
userInfo.role === 'participant'
  ↓
isHost = false
  ↓
モード選択画面で「計測モード」のみ表示
```

### パターン3: 開発環境（ローカル）

```
ローカル環境でアプリ起動
  ↓
window.ZoomAppsSDK が存在しない
  ↓
else ブロックに分岐
  ↓
isHost = false（デフォルト）
  ↓
モード選択画面で「計測モード」のみ表示
```

### パターン4: APIが存在しない/エラー

```
Zoomミーティング内でアプリ起動
  ↓
window.ZoomAppsSDK が存在
  ↓
zoomSdk.getCurrentUser() を呼び出し
  ↓
エラー発生（APIが存在しない、権限不足など）
  ↓
catch ブロックでエラーを捕捉
  ↓
isHost = false（デフォルト）
  ↓
モード選択画面で「計測モード」のみ表示
```

---

## 💡 改善案

### 1. 開発環境でのテスト用フラグ

```typescript
// .env ファイル
VITE_USE_MOCK_DATA=true
VITE_MOCK_IS_HOST=true  // 開発時にホストとしてテスト

// App.tsx
const mockIsHost = import.meta.env.VITE_MOCK_IS_HOST === 'true';
if (isDevMode && useMockData) {
  setIsHost(mockIsHost);
}
```

### 2. より堅牢なエラーハンドリング

```typescript
try {
  const userInfo = await zoomSdk.getCurrentUser();
  setIsHost(userInfo.role === 'host' || userInfo.role === 'co-host');
} catch (err) {
  console.warn('ホスト判定に失敗しました:', err);
  // エラーの種類によって処理を分岐
  if (err.message.includes('permission')) {
    // 権限不足の場合は非ホストとして扱う
    setIsHost(false);
  } else {
    // その他のエラーの場合は再試行またはデフォルト値
    setIsHost(false);
  }
}
```

### 3. ログ出力の追加

```typescript
console.log('Zoom SDK:', zoomSdk ? '利用可能' : '利用不可');
console.log('利用可能なメソッド:', Object.keys(zoomSdk || {}));
console.log('ホスト判定結果:', isHost);
```

---

## 📚 参考資料

- [Zoom Apps SDK 公式ドキュメント](https://developers.zoom.us/docs/apps/)
- [Zoom Apps SDK API Reference](https://developers.zoom.us/docs/apps/reference/)

---

## 🔄 まとめ

### 現在の実装の特徴

1. **安全なデフォルト値**: 判定できない場合は非ホストとして扱う
2. **エラーハンドリング**: エラー時もアプリが動作し続ける
3. **開発環境対応**: ローカル環境でも動作する（ただし常に非ホスト）

### 課題

1. **API名の未確定**: `getCurrentUser()` が実際に存在するか不明
2. **開発時のテスト困難**: ローカル環境でホストモードをテストできない
3. **エラー時の情報不足**: なぜ判定できなかったかの情報が少ない

### 次のステップ

1. ✅ **API名の確認**: `getMeetingContext()` メソッドの使用を推奨（確認済み）
2. ⏳ **実装の更新**: `getCurrentUser()` から `getMeetingContext()` に変更
3. ⏳ **実際のZoomミーティングでテスト**: 実装後に動作確認
4. ⏳ **開発環境でのテスト用フラグを追加**: ローカル環境でのテストを容易にする
5. ⏳ **エラーハンドリングとログ出力を改善**: デバッグを容易にする

### 実装の更新が必要

現在の実装では `getCurrentUser()` を使用していますが、`getMeetingContext()` に変更することを推奨します。

