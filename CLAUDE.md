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
npm run dev        # Vite dev server (frontend)
npm run preview    # wrangler dev (Workers ローカル実行)
npm run build      # tsc -b && vite build
npm run lint       # biome check (読み取り専用)
npm run check      # biome check --write (自動修正)
npm run format     # biome format --write
npm run deploy     # build + wrangler deploy
```

## Before Commit

コミット前に必ず以下を実行し、エラー 0 を確認すること:

```bash
npm run lint && npm run build
```

## Code Style

Biome が強制するため手動で気にする必要はないが、主要なルール:

- ダブルクォート、セミコロンあり、2 スペースインデント
- `import type` を型のみの import に使う (`useImportType: error`)
- JSX の `<button>` には `type="button"` を明示する
- フォームラベル以外の見出しテキストには `<label>` ではなく `<span>` を使う

## Project Structure

```
src/           React frontend
  pages/       ページコンポーネント
  hooks/       カスタムフック (useAudioPlayer, usePracticeSession, useIntervalRepeat)
  lib/         API クライアント (api.ts), 型定義 (types.ts), 設定 (settings.ts)
  components/  共有��ンポーネント
worker/        Cloudflare Workers backend
  routes/      API ルートハンドラ
  services/    LLM/TTS サービス
  db/          D1 スキーマ (schema.sql)
```
