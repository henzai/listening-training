# スクリプト単位のオフラインダウンロード機能

## Context

Practice 画面では毎回 `GET /api/v1/scripts/:id`（メタデータ+文一覧）と `GET /api/v1/audio/:id/:index`（音声）をネットワーク経由で取得している。Library 画面でスクリプト単位に一括ダウンロードし、端末のキャッシュから再生できるようにしたい。キャッシュの破棄ボタンも提供する。

## 設計方針

### ストレージ戦略

| データ | 保存先 | 理由 |
|--------|--------|------|
| 音声ファイル | Cache API `"audio-cache"` | Workbox の既存 CacheFirst ハンドラと**同じキャッシュ名**に pre-populate → `useAudioPlayer` の変更ゼロ |
| スクリプト+文 JSON | Cache API `"offline-scripts"` | Workbox の `"api-cache"` は NetworkFirst/1日TTL で信頼できない。専用キャッシュで永続化 |
| DL済みトラッキング | localStorage `"offline-scripts-map"` | 同期アクセスでき Library 描画時に即判定可能。既存 `settings.ts` と同じパターン |

### なぜこの構成か

- **`useAudioPlayer` 変更不要**: `audio.src = getAudioUrl(...)` → SW の CacheFirst が `"audio-cache"` から即座に返す。並列の再生パスを作らない。
- **IndexedDB 不使用**: 現在のアプリで未使用。JSON 1個の保存に schema 管理は過剰。Cache API の Response 保存で十分。
- **`"offline-scripts"` を分離**: Workbox 管理の `"api-cache"` に入れると NetworkFirst + TTL 1日で期限切れリスクあり。自前キャッシュなら TTL なし。

### SW との相互作用

本番環境では SW が active。`downloadScript` 内の `fetch(audioUrl)` は SW の CacheFirst ハンドラが先にキャッチし、network fetch → `"audio-cache"` に格納 → response 返却する。つまり **SW 経由で自動的にキャッシュされる**。その後の手動 `cache.put()` は冗長だが無害（同キャッシュへの上書き）。

手動 `cache.put()` も残す理由: SW が未登録の初回アクセスや、SW 更新中の空白期間に対するフォールバック。

Workbox の expiration (`maxEntries: 500, maxAgeSeconds: 30日`) について:
- Workbox は strategy 経由で追加したエントリのみ IDB で追跡・期限管理する
- 手動 `cache.put()` で追加したエントリは追跡対象外 → 自動削除されない
- `clearScriptCache` で明示的に管理するので問題なし

## 実装タスク

### Step 1: キャッシュコアロジック

- [ ] `src/lib/scriptCache.ts` を新規作成

```
定数:
  OFFLINE_SCRIPTS_CACHE = "offline-scripts"
  AUDIO_CACHE = "audio-cache"
  TRACKING_KEY = "offline-scripts-map"

型:
  OfflineScriptEntry = { downloadedAt: string; sentenceCount: number }
  DownloadProgress = { completed: number; total: number }

関数:
  getDownloadedScripts(): Record<string, OfflineScriptEntry>
  isScriptDownloaded(scriptId): boolean

  downloadScript(scriptId, onProgress, signal?: AbortSignal): Promise<void>
    1. fetch script+sentences
       - response.ok チェック（失敗なら throw）
       - clone() → "offline-scripts" に put（cache と parse 両方に使うため clone 必須）
       - parse して sentenceCount 取得
    2. 音声を並行3本で fetch → 各 response.ok チェック → "audio-cache" に put
       - signal が abort されたら即中断
    3. 完了後 localStorage に記録

  getCachedScript(scriptId): Promise<{script, sentences} | null>
    "offline-scripts" から match → parse

  clearScriptCache(scriptId): Promise<void>
    両キャッシュから削除 + localStorage 除去
```

`caches` が未定義の環境ではガード (`if (!('caches' in globalThis))`) して graceful degrade。

### Step 2: React 状態管理 hook

- [ ] `src/hooks/useScriptDownload.ts` を新規作成

```
state:
  downloadedMap: Record<string, OfflineScriptEntry>  // localStorage から初期化
  activeDownloads: Map<string, DownloadProgress>      // DL 中の進捗

refs:
  abortControllers: Map<string, AbortController>      // DL 中止用

returns:
  isDownloaded(scriptId): boolean
  downloadProgress(scriptId): DownloadProgress | null
  startDownload(scriptId): void  // AbortController 生成、downloadScript に signal 渡す
  clearCache(scriptId): Promise<void>

cleanup:
  unmount 時に全 AbortController.abort() → fetch 中断、activeDownloads クリア
```

### Step 3: ダウンロードボタン UI

- [ ] `src/components/DownloadButton.tsx` を新規作成
- [ ] `src/components/DownloadButton.module.css` を新規作成

3 状態の表示:
- **未DL**: ↓ アイコン → tap で DL 開始
- **DL 中**: 進捗テキスト `3/12` → tap 不可
- **DL 済**: ✓ アイコン → tap でキャッシュ破棄

既存の `deleteButton` と同じパターン（カード右端の縦ストリップ、`border-left`）。

### Step 4: Library 画面統合

- [ ] `src/pages/Library.tsx` を変更 — `useScriptDownload` hook 使用、各カードに `<DownloadButton>` 追加
- [ ] `src/pages/Library.module.css` を変更（必要に応じて）
- [ ] `handleDelete` 時に `clearCache(id)` も呼ぶ

カードレイアウト:
```
<div class="card">
  <Link class="cardContent">...</Link>
  <DownloadButton ... />
  <button class="deleteButton">×</button>
</div>
```

### Step 5: Practice 画面統合

- [ ] `src/hooks/usePracticeSession.ts` を変更 — fetch 前にキャッシュ確認

```typescript
const cached = await getCachedScript(scriptId);
if (cached) {
  setScript(cached.script);
  setSentences(cached.sentences);
  setLoading(false);
  return;
}
// fall back to network
const data = await api.getScript(scriptId);
```

`useAudioPlayer.ts` — **変更なし**。SW が `"audio-cache"` から自動提供。

### Step 6: テスト

- [ ] `src/lib/scriptCache.test.ts` を新規作成 — `globalThis.caches` をモックして cache put/get/delete をテスト
- [ ] 手動確認: Library でダウンロード → 機内モードで Practice 画面が動作するか

## フロー図

### ダウンロード
```
Library → tap DL → fetch /scripts/:id → cache "offline-scripts"
                  → fetch /audio/:id/0..N → cache "audio-cache"
                  → localStorage に記録
                  → UI: ✓ 表示
```

### 再生（DL済み）
```
Practice mount → getCachedScript() → hit → script+sentences をセット
Audio play → audio.src = /audio/:id/:idx → SW CacheFirst → "audio-cache" hit → 即再生
```

### キャッシュ破棄
```
Library → tap ✓ → delete from "offline-scripts" + "audio-cache" + localStorage
                → UI: ↓ 表示に戻る
```

## エラーハンドリング

- **DL途中失敗**: throw → hook が activeDownloads から除去。部分キャッシュは `"audio-cache"` に残るが localStorage 未記録のため「未DL」扱い。リトライで上書き。部分キャッシュは通常再生時にも利用され無害。
- **音声 fetch が非 2xx**: `response.ok` を確認し、失敗時はスキップせず throw（1 つでも欠損ならオフライン再生に支障があるため）
- **ストレージ超過**: `QuotaExceededError` を catch → ユーザーに通知
- **スクリプト削除時**: `handleDelete` 内で `clearScriptCache` も呼び、ローカルキャッシュ残留を防止
- **DL 中にページ遷移**: AbortController.abort() で fetch 中断 → 部分キャッシュは残るが「未DL」扱い

## 変更ファイル一覧

| ファイル | 操作 |
|----------|------|
| `src/lib/scriptCache.ts` | 新規 |
| `src/lib/scriptCache.test.ts` | 新規 |
| `src/hooks/useScriptDownload.ts` | 新規 |
| `src/components/DownloadButton.tsx` | 新規 |
| `src/components/DownloadButton.module.css` | 新規 |
| `src/pages/Library.tsx` | 変更 |
| `src/pages/Library.module.css` | 変更（必要に応じて） |
| `src/hooks/usePracticeSession.ts` | 変更 |
| `src/hooks/useAudioPlayer.ts` | **変更なし** |
| `vite.config.ts` | **変更なし** |
