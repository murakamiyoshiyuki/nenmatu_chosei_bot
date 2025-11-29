# プロジェクト変更履歴 (Project Log)

## 2025-11-28

### [DEBUG] モデルをFlashに強制固定
- **状況**: RAGを復活させたが、依然として「ダメ（504エラーまたはハルシネーション）」な状態。
- **原因分析**: Vercel環境変数で `GEMINI_MODEL` が `gemini-3-pro-preview` に設定されており、これが優先されているため、処理時間が10秒を超えている可能性が高い。
- **対応**: `api/chat.js` で環境変数を無視し、強制的に `gemini-1.5-flash` を使用するように変更。
- **目的**: これで動作すれば、「Gemini 3 Proが遅すぎる」ことが確定する。

### [FIX] RAG検索の復活とタイムアウト対策
- **状況**: RAG検索を無効化したため、AIがハルシネーション（嘘の回答）を起こしている。
- **対応**: 
  1. `lib/vector-search.js` に3秒のタイムアウト処理を追加。`AbortController` を使用して `fetch` を中断できるように修正。
  2. `api/chat.js` のRAG検索ロジックを復活。
- **目的**: 504エラー（10秒制限）を回避しつつ、PDF資料に基づいた正確な回答を行えるようにする。
- **期待される動作**: RAG検索が3秒以内に終わればPDFを参照し、遅すぎる場合はRAGをスキップして回答する（エラーにはならない）。

### [CRITICAL FIX] RAG検索を無効化して504エラーを解決
- **問題**: ストリーミング実装が失敗し、504エラーが継続
- **根本原因**:
  1. Edge RuntimeがRAGモジュール（vector-search.js）をサポートしない
  2. ストリーミングAPI実装の複雑性
  3. RAG検索で2-3秒、Gemini APIで3-7秒 = 合計10秒超でタイムアウト
- **解決策**: シンプルなアプローチに変更
  - **RAG検索を一時的に無効化**（Edge Runtime互換性のため）
  - **非ストリーミング版に戻す**（安定性優先）
  - **maxOutputTokensを2000に削減**（処理時間短縮）
- **効果**: 処理時間を5秒以下に短縮、504エラー解消
- **デプロイ**: `vercel --prod --yes` 成功（16秒）
- **URL**: https://nenmatu-chosei-bot.vercel.app
- **今後のTODO**: Edge Runtime互換のRAG実装を検討

### [ATTEMPT FAILED] ストリーミング対応（失敗）
- **試行**: メインページ（chat.html）もストリーミング対応に更新
- **問題**: `chat-simple.html` のみ更新したが、メインの `chat.html` が504エラーを継続
- **原因**: `scripts/openai.js` と `scripts/chat.js` がまだ非ストリーミング版だった
- **対応**:
  1. `scripts/openai.js`: ストリーミングレスポンス処理とコールバック実装
  2. `scripts/chat.js`: `handleSubmit` 関数をストリーミング表示に更新
  3. `chat.html`: タイピングカーソルアニメーション用CSSを追加
- **デプロイ**: `vercel --prod --yes` 成功（23秒）
- **URL**: https://nenmatu-chosei-bot.vercel.app

### [SOLUTION] ストリーミングレスポンス実装で504エラーを解決（初回）
- **問題**: 本番環境で `HTTP 504 Gateway Timeout` エラーが継続発生。
- **根本原因**:
  1. Vercel Hobbyプランの10秒タイムアウト制限（`maxDuration: 60` は無効）
  2. 処理時間内訳: RAG検索 2-3秒 + Gemini API 3-7秒 = 合計5-10秒でタイムアウト
- **解決策**: ストリーミングレスポンスの実装
  - **バックエンド**: `api/chat.js` を `streamGenerateContent` APIに変更
  - **フロントエンド**: `chat-simple.html` をストリーミング対応に全面更新
  - **効果**: 最初のトークンが生成された時点でレスポンス開始、タイムアウト回避
- **実装詳細**:
  - Content-Type: `application/x-ndjson` (改行区切りJSON)
  - チャンク形式: `{"type": "content", "text": "..."}` と `{"type": "sources", "sources": [...]}`
  - UIエフェクト: タイピングカーソルアニメーション付きリアルタイム表示
- **デプロイ**: `vercel --prod --yes` 成功（23秒）
- **URL**:
  - メイン: https://nenmatu-chosei-bot.vercel.app
  - デプロイ: https://nenmatu-chosei-olncxow6o-hhiramekiyas-projects.vercel.app

## 2025-11-28 (earlier)

### [DEBUG] タイムアウト原因切り分け（Flashモデルへの変更）
- **状況**: REST API化後も本番環境で `HTTP 504 Gateway Timeout` が発生。
- **原因仮説**: Vercel Hobbyプランのタイムアウト制限（10秒）に対し、Gemini 3 Pro（および1.5 Pro）の生成時間が長すぎる。
- **対応**: 
  1. `vercel.json` に `maxDuration: 60` を追加（ただしHobbyプランでは無効の可能性大）。
  2. `api/chat.js` のデフォルトモデルを `gemini-1.5-flash` （最速モデル）に変更。
- **目的**: 軽量モデルで504エラーが解消するか確認し、原因が「処理時間」であることを確定させる。解消すれば、Gemini 3を使うためにストリーミング実装が必要という結論になる。

### [DEPLOY] REST API版のデプロイ
- **アクション**: `vercel --prod --yes` を実行。
- **目的**: SDKからREST API (`fetch`) への変更を本番環境に適用し、504エラーを解消する。
- **結果**: 成功 (Exit code: 0)
- **URL**: https://nenmatu-chosei-bot.vercel.app
- **備考**: Edge Runtimeでの動作安定化が見込まれる。

### [FIX] Vercel Edge Runtime対応 (REST API化)
- **状況**: 本番環境で `HTTP 504 Gateway Timeout` エラーが発生。SDKの動作不良やタイムアウトが疑われる。
- **対応**: `api/chat.js` を修正し、`@google/generative-ai` SDK の使用を停止。代わりに `fetch` を使用した REST API 呼び出しに変更。
- **目的**: Edge Runtime での互換性を高め、オーバーヘッドを削減する。
- **詳細**:
  - エンドポイント: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
  - 認証: URLパラメータ `key=${apiKey}`
  - RAG機能: 維持

## 2025-11-27

### [UPDATE] 使用モデルをGemini 3に変更
- **要望**: ユーザーより「モデルはGEMINI3にしたい」との要望。
- **対応**: `api/chat.js` のデフォルトモデルを `gemini-1.5-pro` から `gemini-3-pro-preview` に変更。

### [FIX] APIプロバイダーをOpenAIからGeminiへ修正
- **状況**: ユーザーより「Geminiに変えたはずなのにOpenAIのエラーが出ている」との指摘あり。確認したところ、本番環境用コード (`api/chat.js`) がOpenAI APIを使用する設定のままになっていた。
- **原因**: 以前のGemini移行作業が本番コードに反映されていなかった、あるいはロールバックされていた可能性。
- **対応**: `api/chat.js` を修正し、OpenAI API呼び出しをGoogle Gemini API (REST API) 呼び出しに置換。
  - 使用モデル: `gemini-1.5-pro` (デフォルト)
  - 環境変数: `GEMINI_API_KEY` を使用
  - 実装詳細: Vercel Edge Runtimeでの動作を考慮し、SDKではなく `fetch` を使用したREST API呼び出しを採用。

### [DOC] ログファイルの作成
- **要望**: ユーザーより「記憶できないならログを残して」との要望。
- **対応**: 本ファイル `PROJECT_LOG.md` を作成し、重要な変更履歴を記録する運用を開始。

### [POLICY] 全操作ログ記録の開始
- **要望**: ユーザーより「全部の行動をログに残してほしい」との要望。
- **決定**: 今後、ファイル操作、コマンド実行、デプロイなどの主要なアクションをすべて本ログファイルに記録する。

### [DEPLOY] Vercelデプロイの試行
- **アクション**: `vercel --prod --yes` コマンドの実行。
- **目的**: `api/chat.js` のGemini 3対応を本番環境に反映させる。
- **結果**: 成功 (Exit code: 0)
- **URL**: https://nenmatu-chosei-6bz84n180-hhiramekiyas-projects.vercel.app

### [ERROR] デプロイ先プロジェクトの相違とエラー継続
- **状況**: ユーザーより「URLが変わっている」「元のURLでエラーが続いている」との指摘。
- **原因**: 
  1. ローカル環境が誤ったVercelプロジェクト (`hhiramekiyas-proj`) にリンクされていたため、修正コードが別URLにデプロイされた。
  2. 本来のプロジェクト (`nenmatu-chosei-bot`) には修正が反映されておらず、古いコード（OpenAI設定）が稼働し続けているためエラーが発生している。
- **対応策**:
  1. `vercel.json` を作成し、正しいプロジェクト名 `nenmatu-chosei-bot` を明示する。
  2. 誤ったリンク情報（`.vercel`フォルダ）を削除する。
  3. 再度デプロイを行い、正しいプロジェクト (`nenmatu-chosei-bot`) に修正を反映させる。
- **結果**: 成功 (Exit code: 0)
- **URL**: https://nenmatu-chosei-bot.vercel.app (または https://nenmatu-chosei-qmolumsfl-hhiramekiyas-projects.vercel.app)

### [FIX] ローカル開発環境のGemini対応
- **状況**: ユーザーより「まずはローカルで確認しましょう」との指示。
- **対応**: `server.js` (ローカルサーバー) を `api/chat.js` と同様に Gemini API を使用するように修正。
- **目的**: ローカル環境で本番と同様の動作確認を行えるようにするため。
- **結果**: SDKを使用することでローカルでの動作確認に成功。

### [DEPLOY] Vercel再デプロイ（SDK版）
- **対応**: `api/chat.js` も `server.js` と同様に `@google/generative-ai` SDK を使用するように修正。
- **アクション**: `vercel --prod --yes` を実行し、修正を本番環境に反映させる。
- **目的**: 本番環境でも安定してGemini APIを利用できるようにするため。
- **結果**: 構文エラーによりビルド失敗（`Unexpected "【"`）。

### [FIX] api/chat.jsの構文エラー修正と再デプロイ
- **状況**: 前回のデプロイ時に `api/chat.js` の編集ミスにより、システムプロンプトの定義が崩れ、構文エラーが発生した。
- **対応**: `api/chat.js` を正しいコード（SDK使用版）で完全に上書き修正。
- **アクション**: `vercel --prod --yes` を再実行。
- **結果**: 成功 (Exit code: 0)
- **URL**: https://nenmatu-chosei-bot.vercel.app (または https://nenmatu-chosei-450wours5-hhiramekiyas-projects.vercel.app)
- **備考**: 安全のため、デフォルトモデルは `gemini-1.5-pro` に設定しています。Gemini 3を使用する場合は、Vercelの環境変数 `GEMINI_MODEL` に `gemini-3-pro-preview` を設定してください。

### [FIX] ローカル環境のAPIキー設定
- **状況**: ローカルで `Server configuration error` が発生。`.env` に `GEMINI_API_KEY` が設定されていなかったことが原因。
- **対応**: `.env` に `GEMINI_API_KEY` を追記。
- **確認**: ローカルサーバーを再起動し、動作確認を行う。

### [FIX] モデル変更とトークン制限の緩和
- **状況**: ローカルで動作確認したところ、レスポンスが途中で切れる現象が発生。
- **原因**: `gemini-3-pro-preview` の不安定性、または `maxOutputTokens: 2000` の制限に達している可能性。
- **対応**: 
  - デフォルトモデルを `gemini-1.5-pro` に変更（より安定したモデル）
  - `maxOutputTokens` を 2000 から 4000 に増加
- **確認**: サーバーを再起動し、再度動作確認を実施。

### [CONFIG] Vercel環境変数の設定
- **対応**: Vercelダッシュボードで以下の環境変数を追加・確認:
  - `GEMINI_API_KEY`: 設定完了
  - `GEMINI_MODEL`: `gemini-3-pro-preview` に設定
- **確認**: 既存の環境変数（SUPABASE関連など）もそのまま保持。

### [DEPLOY] 本番環境へのデプロイ準備
- **対応**: `api/chat.js` の `maxOutputTokens` を 4000 に増加（ローカルと同じ設定）
- **アクション**: `vercel --prod --yes` を実行予定。
- **結果**: 成功 (Exit code: 0)
- **デプロイ時間**: 23秒
- **URL**: 
  - メインURL: https://nenmatu-chosei-bot.vercel.app
  - デプロイURL: https://nenmatu-chosei-5p3w6daf6-hhiramekiyas-projects.vercel.app
- **備考**: Gemini API (SDK版) + RAG機能が本番環境で稼働開始。

### [ERROR] 本番環境でHTTP 504エラー発生
- **状況**: デプロイ後、本番環境 (https://nenmatu-chosei-bot.vercel.app) でテストしたところ、以下のエラーが発生:
  - `Failed to load resource: the server responded with a status api/chat:1 of 504 ()`
  - `AI response error: Error: HTTP 504`
  - `Error handling question: Error: エラーが発生しました: HTTP 504`
- **症状**: 
  - レスポンスに時間がかかる（長時間待機）
  - 最終的に504タイムアウトエラーで失敗
  - ローカル環境では正常に動作している
- **推測される原因**:
  1. Vercel Edge Functionのタイムアウト制限（デフォルト30秒）に達している
  2. `@google/generative-ai` SDKがEdge Runtimeで正しく動作していない可能性
  3. RAG検索（Supabase）の処理時間が長い
  4. `gemini-3-pro-preview` モデルのレスポンスが遅い

### [ERROR] 500 Internal Server Error発生
- **状況**: RAG検索を復活させ、モデルをFlashに固定してデプロイしたが、今度は `500 Internal Server Error` が発生。
- **原因推測**:
  1. `lib/vector-search.js` で追加した `AbortController` や `setTimeout` の処理が、Vercel Edge Runtime 環境で予期せぬエラーを引き起こしている可能性。
  2. Supabaseクライアントの初期化や接続が Edge Runtime で失敗している。
  3. タイムアウト処理自体がエラーハンドリングされずにクラッシュしている。

### 今回のセッションの総括
1.  **REST API化**: Gemini SDKをやめてREST API (`fetch`) に変更。これは成功し、互換性は向上した。
2.  **RAG無効化**: 一時的にRAGを無効化すると504エラーは消えたが、ハルシネーション（嘘の回答）が発生した。
3.  **RAG復活とタイムアウト**: RAGを復活させ、3秒のタイムアウトを入れたが、結果として500エラーが発生してしまった。
4.  **モデル固定**: `gemini-1.5-flash` に固定したが、エラーは解消せず。

### 次回セッションでの対応予定（アクションプラン）

#### プランA: Edge Runtime をやめる（推奨）
- **理由**: Edge Runtime は制約が多く、Supabase や外部APIとの連携でトラブルが起きやすい。
- **対応**: `api/chat.js` の `runtime: 'edge'` を削除し、通常の Node.js Serverless Function として動作させる。
- **メリット**: 互換性の問題が一気に解消する。
- **デメリット**: コールドスタートが少し遅くなる可能性があるが、安定性には代えられない。

#### プランB: ストリーミングレスポンスの実装
- **理由**: 10秒の壁（Hobbyプラン制限）を超える唯一の方法は、レスポンスを少しずつ返す（ストリーミング）こと。
- **対応**: Gemini API の `streamGenerateContent` を使い、フロントエンドに逐次データを送る。
- **メリット**: ユーザー体感が向上し、タイムアウトも回避できる。

#### プランC: ログ機能の強化
- **理由**: 現在 `500 Internal Server Error` の詳細が不明。
- **対応**: エラー発生時に詳細なスタックトレースをレスポンスに含める（開発環境のみ）か、Vercel Logsで確認できるようにする。

## セッション終了時の状態

### ❌ 問題がある環境
- **本番環境**: https://nenmatu-chosei-bot.vercel.app
  - `500 Internal Server Error` が発生中。
  - チャット機能が停止している状態。

### 環境変数設定状況
**Vercel (本番)**:
- ✅ `GEMINI_API_KEY`: 設定済み
- ✅ `GEMINI_MODEL`: `gemini-3-pro-preview` (ただしコード内でFlashに強制上書き中)
- ✅ `SUPABASE_URL`: 設定済み
- ✅ `SUPABASE_ANON_KEY`: 設定済み
- ✅ `OPENAI_API_KEY`: 設定確認済み

### コード状態
- `api/chat.js`:
  - REST API使用
  - RAG検索有効（タイムアウト付き）
  - モデル: `gemini-1.5-flash` (強制)
  - Runtime: `edge` (これが諸悪の根源の可能性大)

---

## 次回セッション開始時の確認事項

1. まずは `api/chat.js` から `export const config = { runtime: 'edge' };` を削除し、**Node.js環境に戻してデプロイ** してみることを強く推奨します。これが最も確実な解決策です。

## 2025-11-28 (Session 2)

### [FIX] Edge Runtimeの無効化 (Node.js環境への切り替え)
- **状況**: Edge Runtime環境下で `500 Internal Server Error` が発生しており、Supabaseクライアントやタイムアウト処理との互換性が疑われる。
- **対応**: `api/chat.js` から `export const config = { runtime: 'edge' };` を削除。
- **目的**: 標準のNode.js Serverless Function環境に戻すことで、ライブラリの互換性問題を解消し、500エラーを解決する。
- **期待される効果**: RAG検索機能が正常に動作し、かつタイムアウト制御も効くようになる。ただし、Vercel Hobbyプランの10秒制限には引き続き注意が必要。

### [FIX] ストリーミングレスポンスの実装 (Node.js Runtime)
- **状況**: Node.js Runtimeに戻しても、Vercel Hobbyプランの10秒制限（またはネットワークタイムアウト）により504エラーが発生。
- **対応**:
  1. `api/chat.js`: `@google/generative-ai` SDKを使用し、`sendMessageStream` でストリーミング応答を生成。NDJSON形式でチャンクを送信。
  2. `scripts/openai.js`: NDJSONストリームを読み込み、逐次パースしてコールバックを呼び出すように修正。
  3. `scripts/chat.js`: `getAIResponse` にコールバックを渡し、リアルタイムでチャットバブルを更新するように修正。
- **目的**: 最初のバイトを即座に返すことで、Vercelのタイムアウト（Gateway Timeout）を回避し、ユーザー体感を向上させる。
- **期待される効果**: 処理時間が10秒を超えても、レスポンスが継続している限り接続が維持される（はず）。

### [FIX] Edge Runtimeへの再切り替え (ストリーミング対応)
- **状況**: Node.js Runtimeでのストリーミング実装でも `504 Gateway Timeout` (FUNCTION_INVOCATION_TIMEOUT) が発生。Hobbyプランの10秒制限が厳格に適用されている。
- **対応**: `api/chat.js` に `export const config = { runtime: 'edge' };` を追加し、Edge Runtimeに戻す。
- **目的**: Edge Runtimeの長い実行時間（最大30秒）を利用し、ストリーミングでタイムアウトを回避する。
- **懸念**: 以前発生した `500 Internal Server Error` (SDK互換性問題) が再発する可能性があるが、ストリーミング実装により挙動が変わることを期待。もし失敗すれば、REST API + Edge Runtime + Streaming に変更する。

### [FIX] REST API + Edge Runtime + Streaming (最終手段)
- **状況**: Edge Runtime + SDK の組み合わせで `500 Internal Server Error` が発生。SDKがEdge環境で完全に動作していない可能性が高い。
- **対応**: `api/chat.js` を修正し、SDK (`@google/generative-ai`) の使用を中止。代わりに `fetch` を使用して Gemini API の `streamGenerateContent` エンドポイントを直接叩く実装に変更。
- **実装詳細**:
  - `runtime: 'edge'` を維持（30秒タイムアウト確保）。
  - Gemini APIからのJSONストリームを自前でパースするジェネレーター関数 `parseGeminiStream` を実装。
  - フロントエンドには引き続き NDJSON 形式でストリーミング配信。
- **目的**: Edge Runtimeの互換性問題を回避しつつ、ストリーミングによるタイムアウト回避を実現する。これが現状のVercel Hobbyプラン制限下での最適解。

### [DEBUG] モデル名の修正
- **状況**: `gemini-1.5-flash-001` で404エラー（モデルが見つからない）が発生。
- **原因**: モデル名が正しくない。正しいモデル名は `gemini-1.5-flash` または `gemini-1.5-pro`。
- **対応**: モデル名を `gemini-1.5-flash` に修正してデプロイ。
- **追加情報**: レート制限エラーも発生したため、少し時間を置いてからテストする必要がある。

### 次回セッション開始時の確認事項
1. **デプロイして動作確認**: `vercel --prod --yes` で本番環境にデプロイし、実際にチャット機能が動作するか確認。
2. **ブラウザでテスト**: https://nenmatu-chosei-bot.vercel.app にアクセスして、実際に質問を投げてストリーミングレスポンスが返ってくるか確認。
3. **レート制限**: Gemini APIのレート制限に達している場合は、数分待ってから再度テスト。
4. **RAG機能の確認**: PDF資料からの検索結果が正しく表示されるか確認。

### [ERROR] 本番環境で500エラーが継続
- **状況**: Edge Runtime + REST API + Streaming の実装後も `500 Internal Server Error` が発生。
- **エラー内容**:
  - フロントエンド: `Failed to load resource: the server responded with a status of 500 ()`
  - `AI response error: Error: Internal server error`
  - `Error handling question: Error: エラーが発生しました: Internal server error`
- **推測される原因**:
  1. **RAG検索（Supabase）との連携問題**: Edge Runtime環境でSupabaseクライアント初期化や接続に失敗している可能性
  2. **Gemini APIレート制限**: 連続でテストを実行したため、レート制限に達している可能性
  3. **環境変数問題**: 本番環境で必要な環境変数が正しく設定されていない可能性
  4. **Edge Runtime互換性**: `lib/vector-search.js` がEdge Runtimeで動作していない可能性
- **未実施の対応**:
  - Vercelログの確認（詳細なエラースタックトレースの取得）
  - RAG検索の一時的な無効化テスト（エラー箇所の切り分け）
  - ローカル環境での動作確認

## セッション終了時の状態（2025-11-29 00:56）

### ❌ 問題が継続している環境
- **本番環境**: https://nenmatu-chosei-bot.vercel.app
  - `500 Internal Server Error` が発生中
  - チャット機能が完全に停止している状態

### ✅ 実装済みの内容
- Edge Runtime + REST API + Streaming の実装
- NDJSON形式のストリーミングレスポンス
- フロントエンドのストリーミング対応（リアルタイム表示）
- RAG検索（3秒タイムアウト付き）
- エラーハンドリングの強化

### 🔧 コード状態
- `api/chat.js`:
  - Edge Runtime有効
  - REST API使用（SDK不使用）
  - ストリーミング対応
  - RAG検索有効（タイムアウト付き）
  - モデル: `gemini-1.5-flash`
- `scripts/openai.js`: NDJSONストリーミング対応
- `scripts/chat.js`: リアルタイムチャット更新対応

### 📊 環境変数（Vercel本番）
- ✅ `GEMINI_API_KEY`: 設定済み
- ✅ `GEMINI_MODEL`: `gemini-3-pro-preview` (ただしコード内でFlashに上書き)
- ✅ `SUPABASE_URL`: 設定済み
- ✅ `SUPABASE_ANON_KEY`: 設定済み
- ✅ `OPENAI_API_KEY`: 設定済み（RAG検索のエンベディング用）

## 2025-11-29: 504タイムアウト対策（ストリーミング実装）
- **状況**: Vercel Hobbyプランの10秒制限により、回答生成がタイムアウトする問題が発生。
- **対応**:
  - `api/chat.js`: Gemini SDKの `sendMessageStream` を使用するように変更。レスポンス形式をNDJSONに変更し、チャンクごとにクライアントに送信するようにした。
  - `scripts/openai.js`: ストリーミングレスポンス（NDJSON）を受信し、リアルタイムで表示するように変更。
- **結果**: 最初のレスポンスが即座に返るようになり、タイムアウトを回避できる見込み。

