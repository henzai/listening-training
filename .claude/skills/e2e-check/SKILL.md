---
name: e2e-check
description: ローカル開発環境を Playwright MCP で対話的に検証する。dev サーバーの起動確認・主要ページの表示チェックを実行。「動作確認」「ローカル確認」「ページチェック」「e2e チェック」などのリクエストでも使うこと。
user-invocable: true
allowed-tools: Bash mcp__playwright__browser_navigate mcp__playwright__browser_snapshot mcp__playwright__browser_click mcp__playwright__browser_close
---

# ローカル環境検証 (Playwright MCP)

Playwright MCP を使い、ローカル dev 環境の主要ページを対話的に検証するスキル。

## 実行手順

### Step 1: dev サーバー確認・起動

dev サーバー (localhost:5173) が起動しているか確認する。

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/ 2>/dev/null
```

- 200 が返れば起動済み。Step 2 へ進む。
- それ以外の場合は、バックグラウンドで起動する：

```bash
cd /Users/henzai/ghq/github.com/henzai/listening-training && npm run dev &
```

起動後、localhost:5173 が応答するまで最大 15 秒待つ。

### Step 2: 主要ページの検証

以下の 4 ページを順に `browser_navigate` → `browser_snapshot` で検証する。
snapshot のアクセシビリティツリーを読み、期待する要素が存在するか確認する。

#### 2-1. Home (`http://localhost:5173/`)

確認項目：
- "Shadowing Training" 見出しが存在する
- 「新しいスクリプトを生成」リンクが存在する
- 「ライブラリを見る」リンクが存在する
- ボトムナビゲーション (nav) が存在する

#### 2-2. Generate (`http://localhost:5173/generate`)

確認項目：
- "スクリプト生成" 見出しが存在する
- "Business" ボタンが存在する（トピック選択）
- "Intermediate" ボタンが存在する（難易度選択）
- "生成する" ボタンが存在する

#### 2-3. Library (`http://localhost:5173/library`)

確認項目：
- "ライブラリ" 見出しが存在する
- フィルタタブ「すべて」「未練習」「練習済み」が存在する

#### 2-4. Settings (`http://localhost:5173/settings`)

確認項目：
- "Settings" 見出しが存在する
- 速度プリセットボタン "0.7x", "1x", "1.2x" が存在する
- range スライダーが存在する

### Step 3: ブラウザ終了

検証完了後、`browser_close` でブラウザを閉じる。

### Step 4: 結果レポート

全ページの検証結果を以下の形式で報告する：

```
## ローカル環境検証結果

| ページ | URL | ステータス | 備考 |
|--------|-----|-----------|------|
| Home | / | OK / NG | ... |
| Generate | /generate | OK / NG | ... |
| Library | /library | OK / NG | ... |
| Settings | /settings | OK / NG | ... |

総合: OK (4/4) or NG (n/4)
```

NG がある場合は snapshot から得た情報を元に原因を説明する。

## スコープ外

- `/practice/:scriptId` — DB にスクリプトが必要なためスキップ
- 生成フロー（API + LLM 依存で時間がかかる）
- ナビゲーションクリックテスト（直接 URL アクセスで十分）
