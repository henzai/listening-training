# CLAUDE.md

## Project

英語シャドーイング練習 PWA。Vite + React 19 (frontend) / Hono on Cloudflare Workers (backend)。個人利用前提。

## Tech Stack

- Frontend: `src/` — Vite 7, React 19, React Router v7, CSS Modules
- Backend: `worker/` — Hono 4, Cloudflare Workers (D1 + R2)
- TypeScript 6 (strict), ES Modules
- Linter/Formatter: Biome (`biome.json` 参照)

## Commands

```bash
npm run dev        # Vite + wrangler dev 同時起動
npm run dev:frontend  # Vite dev server のみ
npm run dev:worker    # wrangler dev のみ
npm run preview    # wrangler dev (Workers ローカル実行)
npm run typecheck  # tsc -b (型チェックのみ)
npm run build      # typecheck + vite build
npm run lint       # biome check (読み取り専用)
npm run check      # biome check --write (自動修正)
npm run format     # biome format --write
npm run deploy     # build + wrangler deploy
npm test           # vitest run (全テスト)
npm run test:watch # vitest (watch モード)
npm run test:worker # vitest run --project worker
npm run test:app   # vitest run --project app
```

## Git Workflow

- main ブランチへの直接 push は禁止（ブランチ保護ルール）。変更は PR を作成し、CI パス後にマージすること。
- `git commit` 実行前に PreToolUse hook が自動で `npm run lint`（Biome チェック）を実行する。lint エラーがあるとコミットがブロックされるため、事前に修正すること。

## Code Style

Biome が強制するため手動で気にする必要はないが、主要なルール:

- ダブルクォート、セミコロンあり、2 スペースインデント
- `import type` を型のみの import に使う (`useImportType: error`)
- JSX の `<button>` には `type="button"` を明示する
- フォームラベル以外の見出しテキストには `<label>` ではなく `<span>` を使う

## Plan Files

`docs/` に計画ファイルを書き出す際は、各ステップをチェックボックス (`- [ ]` / `- [x]`) で管理し、セッション間で進捗を追跡できるようにすること。

## Project Structure

```
shared/        frontend/worker 共通の型定義 (Script, Sentence, Topic, Difficulty)
src/           React frontend
  pages/       ページコンポーネント
  hooks/       カスタムフック (useAudioPlayer, usePracticeSession, useIntervalRepeat)
  lib/         API クライアント (api.ts), 型定義 (types.ts), 設定 (settings.ts)
  components/  共有コンポーネント
worker/        Cloudflare Workers backend
  routes/      API ルートハンドラ
  services/    LLM/TTS サービス
  db/          D1 スキーマ (schema.sql)
```
