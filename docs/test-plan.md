# テスト導入計画

## Context

CI/CD 導入の前提として、プロジェクトにテスト基盤を構築する。現状はテストファイル・テストフレームワーク・CI ワークフローが一切存在しない。フロントエンド (Vite + React 19) とバックエンド (Hono on Cloudflare Workers) の両方をカバーする。

## フレームワーク選定

**Vitest** を採用する。理由:
- Vite ネイティブで設定共有・変換パイプラインが一致
- `@cloudflare/vitest-pool-workers` で miniflare 統合 (D1/R2 の実環境テスト) が可能
- TypeScript・JSX・CSS Modules のゼロコンフィグ対応

## Phase 1: 基盤構築 + 純粋関数テスト + CI

- [x] **1-1. 依存パッケ���ジのインストール**
  ```bash
  npm install -D vitest @cloudflare/vitest-pool-workers jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
  ```

- [x] **1-2. 設定ファイルの��成**
  - `vitest.workspace.ts` — 2 プロジェクト (worker / app) を定義
  - `vitest.config.worker.ts` — miniflare プール使用
  - `vitest.config.app.ts` — jsdom 環境
  - `src/test-setup.ts` — jest-dom マッチャー登録

- [x] **1-3. npm scripts 追加** (`package.json`)
  - `test`: `vitest run`
  - `test:watch`: `vitest`
  - `test:worker`: `vitest run --project worker`
  - `test:app`: `vitest run --project app`

- [x] **1-4. テスト対象のリファクタリング (最小限)**
  - `worker/services/tts.ts`: `buildVoiceMap` を `export` に変更
  - `worker/services/llm.ts`: speaker prefix 除去ロジックを `export function stripSpeakerPrefixes()` として抽出

- [ ] **1-5. 最初のテストファイル**
  - `worker/services/tts.test.ts` — `buildVoiceMap` の単体テスト
    - dialogue (2 speakers, male+female) で正しい voice が割り当てられる
    - monologue (speaker なし) で空 Map を返す
    - 未知 topic で DEFAULT_VOICE_CONFIG にフォールバック
    - 同一 speaker 重複は 1 回だけ登録
  - `worker/services/llm.test.ts` — `stripSpeakerPrefixes` の単体テスト
    - `"Emma: Thanks"` → `"Thanks"` に正しく除去
    - speaker なしの文は変更なし
    - text_en が speaker 名で始まらない場合は変更なし
  - `src/lib/settings.test.ts` — localStorage ユーティリティ
    - localStorage 空 → デフォルト値を返す
    - 既存値とデフォルトのマージ
    - 不正 JSON → デフォルトにフォールバック
    - `saveSettings` が部分更新を永続化

- [ ] **1-6. GitHub Actions CI ワークフロー** (`.github/workflows/ci.yml`)
  ```yaml
  name: CI
  on:
    push:
      branches: [main]
    pull_request:
      branches: [main]
  jobs:
    ci:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: 22
            cache: npm
        - run: npm ci
        - run: npm run lint
        - run: npm run build
        - run: npm test
  ```

- [ ] **1-7. その他**
  - `.gitignore` に `coverage/` 追加
  - `CLAUDE.md` の Commands セクションに test スクリプトを追記

---

## Phase 2: Worker ルート統合テスト (D1/R2)

miniflare 経由の D1/R2 バインディングを使い、ルートハンドラを E2E に近い形でテスト。

- [ ] **2-1. テストヘルパー作成**
  - `worker/test-helpers.ts` — `cloudflare:test` の `env` から D1 にスキーマを適用するヘルパー

- [ ] **2-2. ルートテスト**
  - `worker/routes/scripts.test.ts`
    - GET /scripts: 空配列 → データ挿入後に取得
    - GET /scripts/:id: 存在する/しない script
    - DELETE /scripts/:id: cascade 削除の検証
    - PATCH /scripts/:id/progress: last_practiced_at 更新
  - `worker/routes/audio.test.ts`
    - R2 にオブジェクトなし → 404
    - R2 にオブジェクト配置後 → 正しい Content-Type/Cache-Control
  - `worker/routes/generate.test.ts`
    - POST /generate: `generateScript` をモジュールレベルでモック → D1 挿入の検証
    - GET /generate/status/:scriptId: ステータス応答の検証
  - `worker/index.test.ts`
    - GET /api/v1/health → `{ ok: true }`

### モック戦略

| 対象 | 方針 |
|------|------|
| D1 (SQLite) | モック不要 — miniflare が実 D1 を提供 |
| R2 | モック不要 — miniflare がインメモリ R2 を提供 |
| OpenAI API | `vi.mock("../services/llm")` でモジュールレベルモック |

---

## Phase 3: フロントエンドテスト

Phase 1 完了後、Phase 2 と並行して実施可能。

- [ ] `src/lib/api.test.ts` — `globalThis.fetch` をモックし、リクエスト/レスポンスの検証
- [ ] `src/hooks/useImmersiveControls.test.ts` — `renderHook` + `vi.useFakeTimers()` で表示/非表示タイマーのテスト
- [ ] `src/pages/Settings.test.tsx` — スモークテスト (レンダリング、プリセット表示)

---

## Phase 4: カバレッジ + CI 強化

- [ ] `@vitest/coverage-v8` 導入
- [ ] カバレッジ閾値の設定 (低めからスタート、段階的に引き上げ)
- [ ] CI で concurrency group 設定 (古い PR ワークフローのキャンセル)

---

## 変更対象ファイル一覧

| ファイル | 操作 |
|---------|------|
| `package.json` | devDependencies 追加、scripts 追加 |
| `vitest.workspace.ts` | 新規作成 |
| `vitest.config.worker.ts` | 新規作成 |
| `vitest.config.app.ts` | 新規作成 |
| `src/test-setup.ts` | 新規作成 |
| `worker/services/tts.ts` | `buildVoiceMap` を export |
| `worker/services/llm.ts` | `stripSpeakerPrefixes` を抽出・export |
| `worker/services/tts.test.ts` | 新規作成 |
| `worker/services/llm.test.ts` | 新規作成 |
| `src/lib/settings.test.ts` | 新規作成 |
| `.github/workflows/ci.yml` | 新規作成 |
| `.gitignore` | `coverage/` 追加 |
| `CLAUDE.md` | test コマンド追記 |

Phase 2 以降で追加:

| ファイル | 操作 |
|---------|------|
| `worker/test-helpers.ts` | 新規作成 |
| `worker/routes/scripts.test.ts` | 新規作成 |
| `worker/routes/audio.test.ts` | 新規作成 |
| `worker/routes/generate.test.ts` | 新規作成 |
| `worker/index.test.ts` | 新規作成 |
| `src/lib/api.test.ts` | 新規作成 |

## 検証方法

1. `npm test` — 全テストが通ること
2. `npm run test:worker` / `npm run test:app` — 個別プロジェクトが動作すること
3. `npm run lint` — テストファイルも Biome lint を通ること
4. GitHub Actions で push 時に CI が green になること
