# リファクタリング計画

## Context

コードベースは約 2,300 行（frontend ~1,700 + backend ~600）の小規模 PWA。個人プロジェクトのため過度な抽象化は避け、実用的なリファクタリングに絞る。

テスト基盤 (Vitest) と CI (GitHub Actions) が稼働中。test-plan Phase 2（Worker 統合テスト）を先に実装し、safety net を確保してからリファクタリングを進める方針。

---

## Phase A: Dead Code 削除 ✅

- [x] `src/hooks/useImmersiveControls.ts` 削除
- [x] `src/hooks/useAudioPlayer.ts` から未使用メンバー削除

## Phase B: SpeedControl 抽出 + Spinner 共通化 ✅

- [x] `src/components/SpeedControl.tsx` + CSS 抽出
- [x] グローバル `.spinner` + `@keyframes spin` 共通化

## Phase D: モデル名定数化 + CSS 変数化 ✅

- [x] `worker/constants.ts` に `LLM_MODEL`, `TTS_MODEL` 定義
- [x] エラー色 `rgba(239, 68, 68, 0.1)` → `color-mix(in srgb, var(--color-error) 10%, transparent)`

## Phase C (バリデーション部分) ✅

- [x] `worker/routes/generate.ts` — topic/difficulty の enum バリデーション追加

---

## Phase C: DB バッチ操作

**目的**: D1 ラウンドトリップ削減。API 契約の変更なし。

- [ ] `worker/routes/generate.ts` — ループ内 INSERT (lines 59-73) を `db.batch()` で 1 回に集約
- [ ] `worker/services/tts.ts` — UPDATE ループ (lines 129-135) を `db.batch()` でバッチ単位に集約

**検証**: `npm test` → `npm run lint` → `npm run build` → `npm run preview` で新規スクリプト生成成功確認

---

## Phase E: Backend 堅牢性改善

**目的**: ランタイムエラーの防止、デバッグ容易性の向上、無駄な API コールの削減。

### E-1. R2 キーフォーマットのヘルパー関数化

`audio/${scriptId}/${index}.mp3` が 2 箇所でハードコードされている。フォーマット変更時にどちらかの更新漏れを防ぐ。

- [ ] `worker/constants.ts` に `audioR2Key(scriptId: string, index: number): string` を追加
- [ ] `worker/routes/audio.ts:9` — ヘルパー使用に置換
- [ ] `worker/services/tts.ts:116` — ヘルパー使用に置換

### E-2. LLM レスポンスの JSON parse 安全化

`worker/services/llm.ts:163` で `JSON.parse()` が try-catch なし。OpenAI が不正な JSON を返した場合にクラッシュする。

- [ ] `JSON.parse` を try-catch で囲み、パース失敗時は意味のあるエラーメッセージを throw
- [ ] `data.choices[0]` の存在チェックを追加

### E-3. TTS リトライ対象の限定

`worker/services/tts.ts:76-84` で全ての非 ok レスポンスをリトライしている。400 (Bad Request) などの永続的なエラーでもリトライし、API クォータを浪費する。

- [ ] 429 (Rate Limit) / 5xx のみリトライ、4xx はそのまま throw

### E-4. catch ブロックのエラーログ追加

`generate.ts:46` と `tts.ts:143` の catch ブロックが空。障害時のデバッグが不可能。

- [ ] `console.error` でエラー内容をログ出力

### E-5. ステータスチェッククエリの統合

`worker/routes/generate.ts:86-99` で scripts テーブルと sentences テーブルを 2 回クエリしている。

- [ ] LEFT JOIN + COUNT で 1 クエリに統合:
  ```sql
  SELECT s.status, s.sentence_count,
         COUNT(sn.audio_r2_key) AS completed_audio
  FROM scripts s
  LEFT JOIN sentences sn ON sn.script_id = s.id AND sn.audio_r2_key IS NOT NULL
  WHERE s.id = ?
  GROUP BY s.id
  ```

**検証**: `npm test` → `npm run lint` → `npm run build`

---

## 検討の上で除外した項目

| 項目 | 除外理由 |
|------|----------|
| shared types (`shared/types.ts`) | tsconfig の lib/types が frontend と worker で異なり導入コスト > 利益 |
| `idx_sentences_script_id` インデックス | `UNIQUE(script_id, index_in_script)` が SQLite では script_id 単体クエリにも有効。冗長 |
| tts.ts `config` 変数削除 | line 108 で `config.default` として使用中。未使用ではなかった |
| `ApiError` クラス | status code で分岐する caller が現状ゼロ。早計な抽象化 |
| ToggleButton / OptionButton 共通化 | CSS スタイルが各ページで異なり（`.selected` / `.active` / `.toggleActive`）真の重複でない |
| LoadingSpinner コンポーネント | 2 箇所のみ。インライン `<div className="spinner" />` で十分 |
| エラーメッセージ一元化 | 3 箇所の日本語文字列。個人利用では定数ファイルのメリット薄い |
| useAsyncOperation フック | 2 箇所のための汎用フックは早計な抽象化 |
| Zod バリデーション / リクエスト検証ミドルウェア | 個人利用かつ enum 検証済み。過剰 |
| API エンドポイント定数化 | OpenAI URL は安定しており変更可能性が低い |
| バッチサイズ / temperature の env 化 | 頻繁に変更しない値。定数で十分 |

---

## 実行順序

test-plan Phase 2 を先に実装し、Worker ルートの統合テストを safety net として確保してから Phase C / E を進める。

| 順序 | 内容 | 依存 |
|------|------|------|
| 1 | ~~Phase A~~ ✅ | — |
| 2 | ~~Phase C バリデーション~~ ✅ | — |
| 3 | ~~Phase B~~ ✅ | — |
| 4 | ~~Phase D~~ ✅ | — |
| 5 | **test-plan Phase 2** — Worker ルート統合テスト | — |
| 6 | **Phase C** — DB バッチ操作 | テストが safety net |
| 7 | **Phase E** — Backend 堅牢性改善 | テストが safety net |
| 8 | test-plan Phase 3-4 — Frontend テスト + カバレッジ | — |
