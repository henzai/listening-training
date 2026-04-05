# リファクタリング計画

## Context

コードベースは約 2,300 行（frontend ~1,700 + backend ~600）の小規模 PWA。全体的に構造は良いが、UI コンポーネントの重複、dead code、バックエンドの非効率な DB アクセスなどの改善点がある。個人プロジェクトのため過度な抽象化は避け、実用的なリファクタリングに絞る。

テスト基盤 (Vitest) が Phase 1 まで完了し CI も稼働中のため、各 Phase の検証に `npm test` を含める。

---

## Phase A: Dead Code 削除

**目的**: 未使用コードを除去し、見通しを良くする。preload 削除で不要なネットワークリクエストも修正。

- [x] `src/hooks/useImmersiveControls.ts` をファイルごと削除（どこからも import されていない）
- [x] `docs/test-plan.md` Phase 3 から `useImmersiveControls.test.ts` のエントリを削除
- [x] `src/hooks/useAudioPlayer.ts` から未使用メンバーを削除:
  - `preloaded` state (line 15) + preload useEffect (lines 42-51) — Service Worker の CacheFirst が audio キャッシュ済みで不要
  - `play` (lines 71-73), `togglePlay` (lines 80-86), `next` (lines 99-101), `prev` (lines 103-105) — Practice.tsx が唯一の consumer で未使用
  - return object から `audioRef` を除外
  - 削除後の return: `{ currentIndex, isPlaying, speed, setSpeed, pause, goTo, loadAndPlay, onEnded }`

**検証**: `npm test` → `npm run lint` → `npm run build`

---

## Phase B: SpeedControl コンポーネント抽出 + Spinner 共通化

**目的**: 最大の UI 重複を解消（振る舞い変更なし、リスク最小）。

### SpeedControl

- [ ] `src/components/SpeedControl.tsx` + `SpeedControl.module.css` 新規作成
  - Props: `speed: number`, `onSpeedChange: (speed: number) => void`
  - JSX: Practice.tsx lines 184-210 / Settings.tsx lines 19-43 から抽出（構造同一、変数名のみ異なる）
  - CSS: Practice.module.css lines 171-218 / Settings.module.css lines 14-61（バイト単位で同一）
- [ ] `src/pages/Practice.tsx` — speed セクション JSX を `<SpeedControl speed={player.speed} onSpeedChange={player.setSpeed} />` に置換
- [ ] `src/pages/Settings.tsx` — speed セクション JSX を `<SpeedControl speed={settings.speed} onSpeedChange={(s) => update({ speed: s })} />` に置換
- [ ] `Practice.module.css` / `Settings.module.css` から speed 関連 CSS を削除

### Spinner

- [ ] `src/index.css` にグローバル `.spinner` + `@keyframes spin` 追加（3 ファイルで完全同一の定義）
- [ ] `Practice.module.css`, `Library.module.css`, `Generate.module.css` から `.spinner` + `@keyframes spin` 削除
- [ ] 各ページ tsx で `className={styles.spinner}` → `className="spinner"` に変更

**検証**: `npm test` → `npm run lint` → `npm run build`。Practice/Settings の speed 操作、各ページの loading spinner 表示を目視確認。

---

## Phase C: Backend — バッチ操作 + バリデーション

**目的**: D1 ラウンドトリップ削減、入力検証追加。API 契約の変更なし。

- [ ] `worker/routes/generate.ts` — topic/difficulty の enum バリデーション追加
  - 有効な topic: business, daily, news, tech, travel, academic, entertainment, health, sports
  - 有効な difficulty: intermediate, upper-intermediate, advanced
  - 無効値には 400 + エラーメッセージを返す
- [ ] `worker/routes/generate.ts` — ループ内 INSERT (lines 37-52) を `db.batch()` で 1 回に集約
- [ ] `worker/services/tts.ts` — UPDATE ループ (lines 128-134) を `db.batch()` で集約（バッチ単位で）

**検証**: `npm test` → `npm run lint` → `npm run build` → `npm run preview` で新規スクリプト生成成功確認。

**注意**: バリデーション追加は test-plan Phase 2-1/2-2 の前に実施するとテストで invalid input ケースを最初からカバーできる。batch 化はテスト後に実施すると safety net として機能する。

---

## Phase D: 細かい改善

- [ ] モデル名定数化: `worker/constants.ts` に `LLM_MODEL`, `TTS_MODEL` を定義
  - `worker/services/llm.ts` line 125 の `"gpt-5.4-mini"` → `LLM_MODEL`
  - `worker/services/tts.ts` line 65 の `"gpt-4o-mini-tts"` → `TTS_MODEL`
- [ ] CSS エラー色変数化: `rgba(239, 68, 68, 0.1)` → `color-mix(in srgb, var(--color-error) 10%, transparent)`
  - `Library.module.css` line 108
  - `Generate.module.css` line 96
  - ※ `color-mix` パターンは Practice.module.css (lines 30, 35) で既に使用済み

**検証**: `npm test` → `npm run lint` → `npm run build`

---

## 検討の上で削除した項目

| 項目 | 削除理由 |
|------|----------|
| shared types (`shared/types.ts`) | tsconfig の lib/types が frontend と worker で異なり導入コスト > 利益。10 行の安定した型は二重管理で十分 |
| `idx_sentences_script_id` インデックス | `UNIQUE(script_id, index_in_script)` が SQLite では script_id 単体クエリにも有効。冗長 |
| tts.ts `config` 変数削除 | line 108 で `config.default` として使用中。未使用ではなかった |
| `ApiError` クラス | status code で分岐する caller が現状ゼロ。早計な抽象化 |

---

## 実行順序

| Phase | スコープ | リスク | 依存 |
|-------|---------|--------|------|
| A | Dead Code 削除 | 最低 | なし |
| B | Frontend CSS/JSX | 低 | なし |
| C | Backend routes/services | 中 | なし |
| D | 雑多 | 低 | なし |

各 Phase は独立してコミット可能。順番の入れ替えやスキップも問題なし。

### test-plan との推奨実行順

1. **Phase A** — Dead Code 削除
2. **Phase C (バリデーション部分のみ)** — generate.ts に enum 検証追加
3. **test-plan Phase 2-1, 2-2** — Worker ルート統合テスト実装
4. **Phase C (batch 部分)** — テストが safety net になった上で batch 化
5. **Phase B, D** — 任意のタイミングで実施可能
