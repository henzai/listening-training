---
name: d1-query
description: Cloudflare D1 データベースにクエリを実行する。wrangler d1 execute でデータの確認・更新を行う際に使用。
user-invocable: false
allowed-tools: Bash
---

# D1 クエリ実行

`wrangler d1 execute` で D1 (SQLite) にクエリを実行する際のルール。

## 基本コマンド

```bash
# ローカル（フラグなし = ローカル）
npx wrangler d1 execute listening-training-db --command "SQL文"

# リモート（本番）
npx wrangler d1 execute listening-training-db --remote --command "SQL文"
```

## SQL の注意事項

- **テーブルエイリアスを使う場合は必ず FROM で宣言すること**
  - NG: `SELECT s.id FROM scripts WHERE s.topic = 'tech'`
  - OK: `SELECT s.id FROM scripts s WHERE s.topic = 'tech'`
  - OK: `SELECT id FROM scripts WHERE topic = 'tech'`（エイリアスなし）
- D1 は SQLite ベースなので、MySQL / PostgreSQL 固有の構文は使えない
- `--command` に渡す SQL はシングルクォートで囲むため、SQL 内のシングルクォートは `''` でエスケープする
