# 年末調整BOT - Vercelデプロイ作業ログ

**作成日**: 2025-11-17
**ステータス**: Vercelダッシュボード設定中（再起動前の中断ポイント）

---

## 📋 作業の背景

### 状況
- Memberstackは課金なしでは本番環境APIが使えない
- クライアントの会計事務所用に新規Memberstackアカウント（テストモード）を作成
- テストモードのAPIキーを使って本番環境とする
- Vercelにデプロイしたが404エラー（`DEPLOYMENT_NOT_FOUND`）が発生

### 問題の原因
- VercelでFramework PresetをNext.jsに設定してしまった
- このプロジェクトは「静的HTML + Serverless Functions」の構成
- Next.jsのビルドプロセスは不要

---

## ✅ 完了した作業

### 1. Memberstack APIキーの設定
**取得したAPIキー（クライアントアカウント）:**
```
Public Key: pk_sb_83529e9106c38e214b4b
Secret Key: sk_sb_5c434410c9707a55320d
```

### 2. ローカルファイルの更新

#### `config.js` の更新
```javascript
MEMBERSTACK_PUBLIC_KEY: 'pk_sb_83529e9106c38e214b4b',
```

#### `.env` の更新
```
MEMBERSTACK_PUBLIC_KEY=pk_sb_83529e9106c38e214b4b
```

### 3. vercel.json の最適化
不要な`buildCommand`と`rewrites`を削除し、シンプルな構成に変更

**変更前:**
```json
{
  "version": 2,
  "buildCommand": "echo 'No build required'",
  "devCommand": "node server.js",
  "framework": null,
  "rewrites": [...],
  "headers": [...]
}
```

**変更後:**
```json
{
  "version": 2,
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type"
        }
      ]
    }
  ]
}
```

### 4. GitHubへのプッシュ
```bash
git add vercel.json
git commit -m "Fix Vercel configuration for static site + serverless functions"
git push
```
✅ コミット完了: `131603d`

---

## 🔄 次にやるべきこと（PC再起動後）

### ステップ1: Vercelダッシュボードでプロジェクト設定を修正

1. **Vercelダッシュボード**にアクセス: https://vercel.com/dashboard
2. **`nenmatu-chosei-bot`** プロジェクトを選択
3. **Settings** → **General** で以下を変更：
   - **Framework Preset**: `Other` に変更（現在はNext.js）
   - **Build Command**: 空欄または override off
   - **Output Directory**: 空欄または default
   - **Install Command**: `npm install`（デフォルトのまま）
   - **Root Directory**: `./`（デフォルトのまま）
   - 変更後 **Save** をクリック

### ステップ2: 環境変数の設定

**Settings** → **Environment Variables** で以下を追加：

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `OPENAI_API_KEY` | `.envファイルから取得` | Production, Preview, Development |
| `OPENAI_MODEL` | `gpt-4o-mini` | Production, Preview, Development |
| `SUPABASE_URL` | `https://wnmysqgroteyvjigebwg.supabase.co` | Production, Preview, Development |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndubXlzcWdyb3RleXZqaWdlYndnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODY5NDgsImV4cCI6MjA3ODM2Mjk0OH0.HmGJBLFSNQUX6WHATnJZLuBrAQA7hD-m7ICk5TejCFA` | Production, Preview, Development |
| `MEMBERSTACK_PUBLIC_KEY` | `pk_e15c36b2351879cf0875` | Production, Preview, Development |
| `MAX_QUERIES_PER_MONTH` | `100` | Production, Preview, Development |

各変数を追加後、**Add** をクリック

### ステップ3: 再デプロイ

1. **Deployments** タブに移動
2. 最新のデプロイメントの **︙** (3点メニュー) → **Redeploy**
3. **Use existing Build Cache** のチェックを**外す**
4. **Redeploy** をクリック

### ステップ4: 動作確認

デプロイ完了後（1-2分）：
1. **Visit** ボタンでサイトにアクセス
2. `index.html` が表示されることを確認
3. チャット機能が動作するか確認

---

## 📂 プロジェクト構造

```
nenmatu_chosei_bot/
├── index.html          # トップページ（静的ファイル）
├── chat.html           # チャットページ（静的ファイル）
├── admin.html          # 管理ページ（静的ファイル）
├── config.js           # フロントエンド設定（Memberstack設定済み）
├── .env                # サーバー環境変数（Git管理外）
├── vercel.json         # Vercel設定（修正済み）
├── api/
│   └── chat.js         # Serverless Function（OpenAI API）
├── assets/             # 静的リソース
├── styles/             # CSS
└── lib/                # ライブラリ
```

---

## 🔑 重要な情報まとめ

### Memberstack（テストモード）
- App ID: `app_cmi2mk2e600230st1fly1z13ko`
- Public Key: `pk_e15c36b2351879cf0875`
- モード: **Test Mode**

### Supabase
- URL: `https://wnmysqgroteyvjigebwg.supabase.co`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### OpenAI
- Model: `gpt-4o-mini`
- API Key: `.env`に保存済み

### GitHub
- リポジトリ: `murakamiyoshiyuki/nenmatu_chosei_bot`
- 最新コミット: `131603d`

### Vercel
- プロジェクト名: `nenmatu-chosei-bot`
- 現在のステータス: 404エラー（設定修正待ち）

---

## 🚨 トラブルシューティング

### 404エラーが続く場合
1. Vercelダッシュボードの **Deployments** で Build Logs を確認
2. Framework Preset が **Other** になっているか確認
3. 環境変数が全て設定されているか確認

### APIエラーが出る場合
1. ブラウザのデベロッパーツール（Console）でエラーメッセージを確認
2. `/api/chat` エンドポイントが正しく動作しているか確認
3. 環境変数（特に`OPENAI_API_KEY`）が正しく設定されているか確認

### Memberstackログインができない場合
1. `config.js` の `MEMBERSTACK_PUBLIC_KEY` が正しいか確認
2. Memberstack側でテストモードが有効か確認

---

## 📞 再開時のアクション

PC再起動後、以下のコマンドで作業を再開：

```bash
# プロジェクトディレクトリに移動
cd "C:\Users\info\Desktop\yoshiyuki\古事記project\VIBE CODING\nenmatu_chosei_bot"

# このログを確認
cat DEPLOYMENT_LOG.md

# 次のステップ: Vercelダッシュボードで設定作業を実施
# https://vercel.com/dashboard
```

---

## ✅ チェックリスト

- [x] Memberstack APIキー取得
- [x] `config.js` 更新
- [x] `.env` 更新
- [x] `vercel.json` 最適化
- [x] GitHubにプッシュ
- [ ] Vercel Framework Preset を Other に変更
- [ ] Vercel 環境変数を設定
- [ ] 再デプロイ
- [ ] 動作確認

---

**次回作業開始時は、上記の「次にやるべきこと」から続けてください。**
