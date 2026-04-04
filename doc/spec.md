# 英語シャドーイング練習アプリ 仕様書

## Context

英語リスニング力を強化するため、iPhoneでも利用可能なシャドーイング練習アプリを新規開発する。AIがスクリプトを自動生成し、TTSで音声化。文単位の区間リピート・速度調整でシャドーイング練習を支援する。ターゲットは中級〜上級（TOEIC 600-900）の学習者。**個人利用を前提**とし、Cloudflare Access で単一ユーザーのアクセスに限定する。

---

## 技術スタック

| 層 | 技術 |
|---|---|
| Frontend | Vite + React Router + PWA (vite-plugin-pwa) |
| Auth | Cloudflare Access |
| Hosting / API | Cloudflare Workers + Hono (Static Assets で Frontend も配信) |
| Database | Cloudflare D1 (SQLite) |
| Audio Storage | Cloudflare R2 |
| LLM | OpenAI gpt-4o-mini（スクリプト生成） |
| TTS | OpenAI gpt-4o-mini-tts（音声生成） |

---

## 核心設計判断: 文単位の音声生成

1つの音声ファイルを生成してから分割するのではなく、**文ごとに個別にTTSを呼ぶ**。

- 区間リピートが自明に実装可能（`<audio>`のsrcを切り替えるだけ）
- タイムスタンプ抽出・音声分割が不要
- 文ごとに独立キャッシュ・ロード可能
- OpenAI TTSは文字数課金なのでコスト同等
- 並列呼び出しでレイテンシも抑制

---

## 機能仕様

### 1. コンテンツ生成フロー

1. ユーザーが**トピック**（Business, Daily, News, Tech等）と**難易度**（Intermediate / Upper-Intermediate / Advanced）を選択
2. Worker → LLM で英文スクリプト生成（8-15文、JSON: `{text_en, text_ja}`の配列）
3. Worker → TTS で文ごとに音声生成（並列）→ R2にアップロード
4. メタデータをD1に保存（`scripts.status` で生成状況を管理）
5. クライアントはポーリングで生成状況を確認
6. **エラーハンドリング**: TTS失敗時は個別文を最大2回リトライ。リトライ後も失敗した場合、またはLLM失敗時は `scripts.status` を `error` に設定し、クライアントに再生成を促す

### 2. シャドーイング練習画面

**3つのモード**（段階的に進行）:

| モード | 英語テキスト | 日本語訳 | 用途 |
|---|---|---|---|
| Listen & Read | 表示 | 表示 | 内容理解 |
| Guided Shadow | 表示 | 非表示 | テキスト付きシャドーイング |
| Blind Shadow | 非表示 | 非表示 | テキストなしシャドーイング |

**区間リピート機能**:
- 現在の文をN回リピート（1x, 2x, 3x, 5x, ∞）
- 自動リピートモード（各文をN回再生してから次へ進む）
- リピート間のポーズ時間設定（0s / 1s / 2s / 3s）

**速度調整**:
- 0.5x〜1.5x（0.1刻み）
- `HTMLMediaElement.playbackRate` + `preservesPitch = true`
- クイックプリセット: 0.7x / 1.0x / 1.2x

**スクリプト表示切替**: いつでも英語/日本語の表示・非表示を個別にトグル可能

**音声プリロード**: 練習画面表示時に全文の音声を先読みする。最初の文がロード完了次第再生可能とし、残りはバックグラウンドで取得する。

### 3. スクリプトライブラリ

- 生成済みスクリプト一覧（トピック+難易度+作成日で表示、完了状態でフィルタ）
- スクリプト削除

### 4. 学習記録（MVP最小限）

- スクリプトごとに最終練習日時（`last_practiced_at`）を `scripts` テーブルで管理。練習済みかどうかは `last_practiced_at IS NOT NULL` で判別

---

## データモデル（D1）

ユーザー設定（再生速度・ポーズ時間・リピート回数）はクライアント側の **localStorage** で管理する。

> **注意**: D1（SQLite）ではデフォルトで外部キー制約が無効。Workerの初期化時に `PRAGMA foreign_keys = ON` を実行すること。

```sql
-- スクリプト
CREATE TABLE scripts (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  sentence_count INTEGER NOT NULL,
  total_duration_ms INTEGER,
  status TEXT DEFAULT 'generating',
  last_practiced_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 文（スクリプトの構成要素）
CREATE TABLE sentences (
  id TEXT PRIMARY KEY,
  script_id TEXT NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
  index_in_script INTEGER NOT NULL,
  text_en TEXT NOT NULL,
  text_ja TEXT,
  audio_r2_key TEXT,
  audio_duration_ms INTEGER,
  audio_format TEXT DEFAULT 'mp3',
  UNIQUE(script_id, index_in_script)
);

```

R2キー形式: `audio/{script_id}/{sentence_index}.mp3`

---

## API設計（Hono on Workers）

### 認証

Cloudflare Access でアプリ全体を保護する。Workers 側では `CF-Access-JWT-Assertion` ヘッダーの JWT を検証し、不正リクエストを拒否する。

### エンドポイント

| Method | Endpoint | 説明 |
|---|---|---|
| POST | `/api/v1/generate` | スクリプト生成開始 |
| GET | `/api/v1/generate/status/:scriptId` | 生成状況ポーリング |
| GET | `/api/v1/scripts` | スクリプト一覧 |
| GET | `/api/v1/scripts/:scriptId` | スクリプト詳細（文含む） |
| DELETE | `/api/v1/scripts/:scriptId` | スクリプト削除 |
| GET | `/api/v1/audio/:scriptId/:index` | 音声取得（R2から直接） |
| PATCH | `/api/v1/scripts/:scriptId/progress` | 進捗更新（last_practiced_at） |

---

## プロジェクト構成

```
listening-training/
├── src/                           # Vite + React
│   ├── main.tsx                   # エントリポイント
│   ├── router.tsx                 # React Router 設定
│   ├── pages/
│   │   ├── Home.tsx               # ホーム/ダッシュボード
│   │   ├── Generate.tsx           # コンテンツ生成
│   │   ├── Library.tsx            # スクリプト一覧
│   │   ├── Practice.tsx           # シャドーイング練習
│   │   └── Settings.tsx           # 設定
│   ├── components/
│   │   ├── audio-player/          # 再生コンポーネント群
│   │   ├── generate/              # 生成UI
│   │   └── library/               # ライブラリUI
│   ├── hooks/
│   │   ├── useAudioPlayer.ts      # 再生ステートマシン
│   │   ├── useIntervalRepeat.ts   # リピートロジック
│   │   └── usePracticeSession.ts  # セッション管理
│   └── lib/
│       ├── api.ts                 # APIクライアント
│       └── types.ts               # 型定義
├── public/
│   └── icons/                     # PWAアイコン
├── worker/
│   ├── index.ts                   # Honoエントリポイント
│   ├── routes/                    # APIルート
│   ├── services/                  # LLM/TTSサービス
│   └── db/schema.sql              # D1マイグレーション
├── vite.config.ts                 # Vite設定 + vite-plugin-pwa
├── wrangler.toml                  # Workers設定（Static Assets + API）
└── index.html                     # SPAエントリ
```

---

## PWA（iPhone対応）

- `vite-plugin-pwa`（Workbox ベース）で Service Worker を自動生成
- `display: "standalone"` + Apple meta tags
- Service Worker: アプリシェルの Cache-first + 音声ファイルの Cache-first（不変コンテンツ） + API応答の Network-first
- iOS音声制約: ユーザータップで再生開始（autoplay不可）
- `viewport-fit=cover` + CSS `env(safe-area-inset-*)` でノッチ対応
- デプロイ: Cloudflare Workers（Static Assets で `vite build` の出力を配信）

---

## MVPスコープ（Phase 1）

**含む**:
- プリセットトピックからのスクリプト生成（LLM + TTS）
- シャドーイング練習画面（3モード）
- 文単位リピート（回数指定）
- 速度調整（0.5x〜1.5x）
- スクリプト表示/非表示切替
- スクリプトライブラリ（一覧・削除）
- スクリプト単位の進捗記録（最終練習日時）
- PWA（ホーム画面追加）

**Phase 2以降に回す**:
- A-B区間ループ（複数文の範囲指定）
- 文ごとのブックマーク・難しい文レビュー画面
- 統計ダッシュボード（ストリーク、カレンダー等）
- オフライン音声キャッシュ（IndexedDB）
- ボイス選択

---

## コスト試算（1ユーザー・月間）

| リソース | 想定使用量 | 月額 |
|---|---|---|
| OpenAI TTS | ~90スクリプト × ~80,000文字 | ~$1.20 |
| OpenAI LLM | ~90呼び出し | ~$0.05 |
| Cloudflare R2 | ~27MB累積 | < $0.01 |
| D1 / Workers | 軽量 | 無料枠内 |

---

## 検証方法

1. `wrangler dev` でローカル起動（Static Assets + API 統合）、`/api/v1/generate` でスクリプト+音声が生成されR2/D1に保存されることを確認
2. 同一オリジンで Frontend が配信され、生成→ライブラリ→練習の一連フローを確認
3. 練習画面で速度変更・リピート・テキスト切替が正常に動作することを確認
4. iPhoneのSafariで「ホーム画面に追加」→ standalone モードで起動・操作できることを確認
5. `wrangler deploy` で本番デプロイ、Cloudflare Access の認証が機能することを確認
