# リファクタリング計画

## Context

コードベースは約 2,300 行（frontend ~1,700 + backend ~600）の小規模 PWA。全体的に構造は良いが、UI コンポーネントの重複、dead code、バックエンドの非効率な DB アクセスなどの改善点がある。個人プロジェクトのため過度な抽象化は避け、実用的なリファクタリングに絞る。

---

## Phase 1: SpeedControl コンポーネント抽出 + Spinner 共通化

**目的**: 最大の UI 重複を解消（振る舞い変更なし、リスク最小）

- [ ] `src/components/SpeedControl.tsx` + `SpeedControl.module.css` 新規作成
  - Props: `speed: number`, `onSpeedChange: (speed: number) => void`
  - JSX: `Practice.tsx` lines 185-209 / `Settings.tsx` lines 19-43（同一）
  - CSS: `Practice.module.css` lines 170-218 / `Settings.module.css` lines 13-61（同一）
- [ ] `src/pages/Practice.tsx` — speed セクション JSX を `<SpeedControl>` に置換
- [ ] `src/pages/Settings.tsx` — speed セクション JSX を `<SpeedControl>` に置換
- [ ] `Practice.module.css` / `Settings.module.css` から speed 関連 CSS を削除
- [ ] Spinner 共通化: `src/index.css` にグローバル `.spinner` + `@keyframes spin` 追加
- [ ] `Practice.module.css`, `Library.module.css`, `Generate.module.css` から `.spinner` + `@keyframes spin` 削除
- [ ] 各ページ tsx で spinner を `className="spinner"` (グローバル) に変更

**検証**: `npm run lint` + `npm run build`。Practice/Settings で speed コントロール動作確認、各ページの loading spinner 表示確認。

---

## Phase 2: useAudioPlayer 整理 + Dead Code 削除

**目的**: メモリリーク修正、未使用コード除去

- [ ] `src/hooks/useAudioPlayer.ts` — プリロード削除
  - `preloaded` state (line 15) + preload useEffect (lines 42-51) を削除
  - PWA Service Worker が CacheFirst で audio キャッシュ済み → プリロード不要
- [ ] 未使用メソッド削除: `play`, `togglePlay`, `next`, `prev`, `audioRef`
  - Practice.tsx が使うのは: `currentIndex`, `isPlaying`, `speed`, `setSpeed`, `pause`, `goTo`, `loadAndPlay`, `onEnded`
- [ ] `src/hooks/useImmersiveControls.ts` をファイルごと削除（どこからも import されていない dead code）

**検証**: `npm run lint` + `npm run build`。スクリプト再生で audio 正常動作確認（再生・停止・自動進行）。

---

## Phase 3: Backend — バッチ INSERT + DB インデックス

**目的**: DB アクセス効率化（API 契約の変更なし）

- [ ] `worker/routes/generate.ts` — ループ内 INSERT を D1 `batch()` API で 1 回に集約
- [ ] `worker/services/tts.ts` — UPDATE ループも `batch()` で集約
- [ ] `worker/services/tts.ts` line 94 の未使用変数 `config` を削除
- [ ] `worker/db/migrations/0003_add_indexes.sql` 新規作成
  - `CREATE INDEX IF NOT EXISTS idx_sentences_script_id ON sentences(script_id);`
- [ ] `worker/routes/generate.ts` — topic/difficulty の enum バリデーション追加

**検証**: `npm run lint` + `npm run build`。`npm run preview` で新規スクリプト生成成功確認。

---

## Phase 4: 型定義の一元化

**目的**: `Script`/`Sentence` インターフェースの二重管理を解消

現状 `src/lib/types.ts` と `worker/types.ts` に同一の `Script`/`Sentence` 定義がある。

- [ ] `shared/types.ts` 新規作成 — `Script`, `Sentence`, `Topic`, `Difficulty`, 定数類を配置
- [ ] `tsconfig.app.json` の `include` に `"shared"` 追加
- [ ] `tsconfig.worker.json` の `include` に `"shared"` 追加
- [ ] `src/lib/types.ts` — `shared/types.ts` から re-export に変更
- [ ] `worker/types.ts` — `Script`/`Sentence` を shared から import、`Env`/`GenerateRequest`/`LLMSentence` のみ残す

**検証**: `npm run build`（両方の tsc チェック通過）。`npm run lint`。

---

## Phase 5: 細かい改善

- [ ] モデル名定数化: `worker/constants.ts` に `LLM_MODEL`, `TTS_MODEL` を定義、llm.ts/tts.ts で使用
- [ ] API エラー改善: `src/lib/api.ts` に `ApiError` クラス追加（status コード保持）
- [ ] CSS 変数化: `Library.module.css` の `rgba(239, 68, 68, 0.1)` → CSS 変数使用

**検証**: `npm run lint` + `npm run build`。

---

## 実行順序

| Phase | スコープ | 依存 |
|-------|---------|------|
| 1 | Frontend CSS/JSX | なし |
| 2 | Frontend hooks | なし |
| 3 | Backend routes/services | なし |
| 4 | 両方の型定義 | なし |
| 5 | 雑多 | なし |

各 Phase は独立してコミット可能。順番の入れ替えやスキップも問題なし。
