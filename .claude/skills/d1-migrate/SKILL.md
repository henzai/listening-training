---
name: d1-migrate
description: Cloudflare D1 データベースのマイグレーションを実行する。マイグレーション SQL の作成・適用時に使用。
user-invocable: true
allowed-tools: Read Glob Bash Write
argument-hint: "[local|remote|both] [migration-file]"
---

# D1 マイグレーション

Cloudflare D1 (SQLite) のマイグレーションを管理・実行するスキル。

## 重要な注意事項

- `wrangler d1 execute` は **フラグなしの場合ローカル DB に実行される**（`--local` と同じ）
- リモート（本番）DB に実行するには **`--remote` フラグが必須**
- したがって `--local` フラグは冗長であり、指定不要
- データベース名: `listening-training-db`

## マイグレーションファイルの規約

- 配置先: `worker/db/migrations/`
- 命名: `NNNN_<説明>.sql`（例: `0001_add_speaker.sql`）
- `worker/db/schema.sql` も同時に更新し、新規デプロイ時のスキーマと一致させること

## 実行手順

### 引数が `local` の場合（ローカルのみ）

```bash
npx wrangler d1 execute listening-training-db --file=<migration-file>
```

### 引数が `remote` の場合（本番のみ）

```bash
npx wrangler d1 execute listening-training-db --file=<migration-file> --remote
```

### 引数が `both` の場合（ローカル → 本番の順）

```bash
npx wrangler d1 execute listening-training-db --file=<migration-file>
npx wrangler d1 execute listening-training-db --file=<migration-file> --remote
```

### migration-file が省略された場合

`worker/db/migrations/` 内の最新ファイルを使用する。

## 新規マイグレーション作成時

1. `worker/db/migrations/` 内の既存ファイルを確認し、次の連番を決定
2. マイグレーション SQL を作成
3. `worker/db/schema.sql` を同内容で更新
4. ユーザーに実行対象（local / remote / both）を確認してから実行
