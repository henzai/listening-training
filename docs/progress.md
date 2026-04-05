# 実装進捗

## 完了した実装（MVP Phase 1 コード実装）

### 1. プロジェクト基盤
- Vite + React 19 + TypeScript 6 + React Router 7
- Hono (Cloudflare Workers) によるAPI基盤
- vite-plugin-pwa による PWA 設定（Service Worker 自動生成、manifest、アイコン）
- iOS 対応メタタグ（`viewport-fit=cover`、`safe-area-inset`、Apple meta tags）

### 2. バックエンド（`worker/`）
| ファイル | 内容 |
|---|---|
| `db/schema.sql` | D1スキーマ（scripts + sentences テーブル、外部キー制約） |
| `index.ts` | Hono エントリポイント、PRAGMA foreign_keys、ルートマウント |
| `routes/generate.ts` | `POST /generate`（LLM呼び出し→DB保存→音声生成をwaitUntilでバックグラウンド実行）、`GET /generate/status/:scriptId`（ポーリング） |
| `routes/scripts.ts` | `GET /scripts`、`GET /scripts/:scriptId`、`DELETE /scripts/:scriptId`（R2音声も削除）、`PATCH /scripts/:scriptId/progress` |
| `routes/audio.ts` | `GET /audio/:scriptId/:index`（R2から直接配信、immutable Cache-Control） |
| `services/llm.ts` | OpenAI gpt-4o-mini でスクリプト生成（トピック・難易度別プロンプト、JSON出力） |
| `services/tts.ts` | OpenAI gpt-4o-mini-tts で文単位音声生成（5並列バッチ、最大2回リトライ） |
| `types.ts` | バックエンド共有型定義 |

### 3. フロントエンド（`src/`）
| ファイル | 内容 |
|---|---|
| `lib/types.ts` | 型定義、トピック・難易度・モード等の定数 |
| `lib/api.ts` | 全APIエンドポイントのクライアント関数 |
| `lib/settings.ts` | localStorage による設定永続化（速度、リピート回数、ポーズ時間） |
| `pages/Home.tsx` | ホーム画面（生成・ライブラリへのナビゲーション） |
| `pages/Generate.tsx` | トピック・難易度選択 → 生成開始 → ポーリングで進捗表示 → 完了時に練習画面へ遷移 |
| `pages/Library.tsx` | スクリプト一覧（all/new/practiced フィルタ、削除） |
| `pages/Practice.tsx` | シャドーイング練習画面（後述） |
| `hooks/useAudioPlayer.ts` | Audio要素管理、プリロード、再生/一時停止、速度変更 |
| `hooks/useIntervalRepeat.ts` | 自動リピート（回数指定、ポーズ時間、次文への自動進行） |
| `hooks/usePracticeSession.ts` | スクリプトデータ取得、モード・テキスト表示状態管理 |
| `components/Layout.tsx` | 共通レイアウト（ボトムナビゲーション） |

### 4. Practice 画面の機能
- **3モード**: Listen & Read / Guided Shadow / Blind Shadow
- **テキスト表示**: EN/JA 個別トグル（モード切替時に自動設定、手動上書き可）
- **再生制御**: 再生/一時停止、前/次の文、ドットナビゲーション
- **速度調整**: 0.5x〜1.5x スライダー + クイックプリセット（0.7x / 1.0x / 1.2x）
- **自動リピート**: ON/OFF トグル、回数（1x/2x/3x/5x/∞）、ポーズ時間（0s/1s/2s/3s）
- **音声プリロード**: 全文を先読み

---

## 完了したインフラセットアップ

### 1. Cloudflare リソース（2026-04-05 完了）
- D1 データベース `listening-training-db` 作成済み（APAC リージョン）
- D1 スキーマ適用済み（ローカル + リモート両方）
- R2 バケット `listening-training-audio` 作成済み
- `wrangler.toml` の `database_id` を実際の値に更新済み

### 2. シークレット設定（2026-04-05 完了）
- `.dev.vars` にローカル開発用 `OPENAI_API_KEY` 設定済み
- `wrangler secret put` で本番用 `OPENAI_API_KEY` 設定済み
- `wrangler.toml` の `[vars]` から平文 API キーを削除済み

### 3. ローカル動作確認（2026-04-05 完了）
- `npm run dev`（Vite）+ `npm run preview`（wrangler dev）で起動確認済み
- D1, R2, OPENAI_API_KEY すべてバインド確認済み

---

## 完了したデプロイ・セキュリティ設定

### 1. 本番デプロイ（2026-04-05 完了）
- `listening.ranwei.dev` にデプロイ済み
- `workers_dev = false` で workers.dev URL を無効化
- DNS: `listening` AAAA レコード（`100::`、Proxied）設定済み

### 2. Cloudflare Access（2026-04-05 完了）
- Zero Trust → Access で `listening.ranwei.dev` にアクセス制限設定済み
- 許可ユーザーのメールアドレスのみアクセス可

---

## スペックとの差分・注意点

| 項目 | ステータス | 備考 |
|---|---|---|
| Settings 画面 | 実装済み | ba9e619 で追加済み |
| Cloudflare Access JWT 検証 | 対応不要 | 個人利用のため不要。`workers_dev = false` で workers.dev 経由のバイパスを防止済み |
| audio-player コンポーネント分割 | 未実施 | スペックでは `components/audio-player/` を想定。現在は Practice.tsx に統合。必要に応じて分離 |
| generate / library コンポーネント分割 | 未実施 | 同上。ページ単位に収まっているため現時点では分割不要 |
