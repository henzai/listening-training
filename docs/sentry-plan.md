# Sentry エラーレポート導入計画

## Context

本番環境でエラーが発生しても検知できない状態。個人開発で必要十分なエラーレポートとして Sentry (Free tier) を導入する。バックエンド (`@sentry/cloudflare`) とフロントエンド (`@sentry/react`) の両方に入れる。

## Steps

- [x] **Step 0: Sentry プロジェクト作成・DSN 取得**
  - Sentry Web UI (https://sentry.io) でアカウント作成（または既存アカウントでログイン）
  - Platform として "Cloudflare" を選択してプロジェクトを作成（Worker + Frontend で1プロジェクトで OK）
  - 表示される DSN (`https://xxx@xxx.ingest.sentry.io/xxx`) を控える
  - DSN は Step 10 で `.dev.vars` / `.env.local` / `wrangler secret` に設定する

- [x] **Step 1: パッケージインストール**
  - `npm install @sentry/cloudflare @sentry/react`
  - インストール後 `npm run build` で Worker バンドルサイズが Cloudflare 制限（Free: 1MB / Paid: 10MB）を超えないか確認
  - 超える場合はフロントエンドのみの導入に切り替える

- [x] **Step 2: wrangler.toml の変更**
  - `compatibility_flags = ["nodejs_compat"]` 追加 — `@sentry/cloudflare` が AsyncLocalStorage を使うため必須
  - `[version_metadata]` binding 追加 — デプロイバージョンを Sentry に紐付ける
  - `upload_source_maps = true` 追加 — Worker の sourcemap を自動アップロード

- [x] **Step 3: Worker Env 型を更新** (`worker/types.ts`)
  - `SENTRY_DSN: string` を追加
  - `CF_VERSION_METADATA: WorkerVersionMetadata` を追加（`@cloudflare/workers-types` に定義済み）

- [x] **Step 4: Worker エントリポイントに Sentry を統合** (`worker/index.ts`)
  - `app` を named export に変更（テスト用）
  - default export を `Sentry.withSentry()` でラップ
  - `tracesSampleRate: 0` — パフォーマンストレーシングは不要（後で有効化可能）
  - ルートファイルの変更は不要。未ハンドルのエラーは自動キャプチャされる

- [x] **Step 5: テストの import を修正**
  - `Sentry.withSentry()` は `ExportedHandler` を返し `.request()` メソッドがないため、テストは named export を使う
  - `worker/index.test.ts`: `import app from "./index"` → `import { app } from "./index"`
  - `worker/routes/audio.test.ts`: `import app from "../index"` → `import { app } from "../index"`
  - `worker/routes/scripts.test.ts`: `import app from "../index"` → `import { app } from "../index"`
  - `worker/routes/generate.test.ts`: `import app from "../index"` → `import { app } from "../index"`

- [x] **Step 6: フロントエンド instrument.ts を作成** (`src/instrument.ts` 新規)
  - `Sentry.init()` で DSN と `enabled: import.meta.env.PROD` を設定
  - `browserTracingIntegration` は入れない（tracesSampleRate: 0 でもオーバーヘッドが残るため省略）

- [x] **Step 7: main.tsx を更新** (`src/main.tsx`)
  - `import "./instrument"` を最初の import として追加
  - `createRoot()` に `onUncaughtError` / `onCaughtError` として `Sentry.reactErrorHandler()` を設定

- [x] **Step 8: App.tsx に ErrorBoundary を追加** (`src/App.tsx`)
  - `BrowserRouter` の外側を `Sentry.ErrorBoundary` でラップ
  - fallback: `<p>エラーが発生しました。ページを再読み込みしてください。</p>`
  - 個人利用なので Boundary は1つで十分

- [x] **Step 9: 型定義の更新** (`src/vite-env.d.ts`)
  - `ImportMetaEnv` に `VITE_SENTRY_DSN: string` を追加

- [x] **Step 10: 環境変数・gitignore の設定**
  - ローカル Worker: `.dev.vars` に `SENTRY_DSN=...` を追加
  - ローカル Frontend: `.env.local` に `VITE_SENTRY_DSN=...` を作成
  - 本番 Worker: `wrangler secret put SENTRY_DSN`
  - 本番 Frontend: デプロイ時に `VITE_SENTRY_DSN` を環境変数で渡す
  - `.sentryclirc` を `.gitignore` に追加

## 対象ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `package.json` | `@sentry/cloudflare`, `@sentry/react` 追加 |
| `wrangler.toml` | compatibility_flags, version_metadata, upload_source_maps |
| `worker/types.ts` | Env に SENTRY_DSN, CF_VERSION_METADATA 追加 |
| `worker/index.ts` | app を named export に変更、default を Sentry.withSentry() でラップ |
| `worker/index.test.ts` | import を named import に変更 |
| `worker/routes/audio.test.ts` | import を named import に変更 |
| `worker/routes/scripts.test.ts` | import を named import に変更 |
| `worker/routes/generate.test.ts` | import を named import に変更 |
| `src/instrument.ts` | **新規** — Sentry.init() |
| `src/main.tsx` | instrument import、Sentry エラーハンドラ追加 |
| `src/App.tsx` | Sentry.ErrorBoundary でラップ |
| `src/vite-env.d.ts` | VITE_SENTRY_DSN 型追加 |
| `.gitignore` | .sentryclirc 追加 |

- [ ] **Step 11: (optional) Sentry MCP サーバーの設定**
  - `.claude/mcp.json` に Sentry MCP を追加すると、Claude Code からエラーの検索・詳細確認が可能になる
  - Sentry API トークンが必要（Settings > Developer Settings > Internal Integrations で作成）
  - 必須ではないが、設定しておくとエラー対応時に便利

## 意図的に含めないもの

- Session Replay — 個人利用に不要
- `browserTracingIntegration` — tracesSampleRate: 0 でもオーバーヘッドが残るため省略
- パフォーマンストレーシング — 後から1行変えるだけで有効化可能
- `@sentry/vite-plugin` — フロントエンド sourcemap アップロードは後から追加可能
- 既存 catch ブロックへの `captureException()` — 未ハンドルエラーの自動キャプチャで十分

## 検証

- [x] `npm run typecheck` — 型チェック通過
- [x] `npm run lint` — Biome パス
- [x] `npm run build` — ビルド成功（Worker バンドルサイズ確認）
- [x] `npm run test` — 既存テスト通過（named import への変更が正しいこと）
- [ ] ローカルで `npm run dev` — Sentry 無効のまま正常動作
- [ ] 本番デプロイ後、テストエラーを発生させて Sentry ダッシュボードに表示されることを確認
