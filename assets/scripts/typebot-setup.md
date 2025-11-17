# Typebot セットアップガイド

**確証レベル**: 【一般論】

---

## 1. Typebotアカウント作成

1. Typebot公式サイトにアクセス: https://typebot.io/
2. 「Sign Up」または「Get Started」をクリック
3. メールアドレスまたはGoogleアカウントで登録
4. アカウント認証を完了

---

## 2. 年末調整bot の作成

### 2.1 新規Bot作成

1. Typebotダッシュボードで「+ Create a typebot」をクリック
2. Bot名を入力: `年末調整bot（2025年版）`
3. テンプレート: 「Start from scratch」を選択

### 2.2 Bot設定

**Settings > General**

- Bot Name: `年末調整bot（2025年版）`
- Description: `国税庁PDFを優先参照し、根拠リンク付きで回答する年末調整支援bot`

**Settings > Appearance**

- Theme: Professional または Minimal
- Font: Noto Sans JP（日本語対応）
- Primary Color: `#667eea`（ランディングページと統一）
- Background Color: `#ffffff`
- Text Color: `#2d3748`

---

## 3. System Instructions（プロンプト）設定

**Settings > Instructions** または **AI Block > System Prompt** に以下を設定します。

### 3.1 基本指示

```
あなたは年末調整の専門知識を持つアシスタントです。
以下のルールに従って回答してください。

【参照優先順位】
1. 国税庁の公式PDF（令和7年分 年末調整のしかた、年末調整Q&A）
2. 国税庁の公式Webサイト
3. 一般的な税務知識

【回答ルール】
- 回答の確実性を明示してください：【確証あり】【一般論】【仮説】
- 不明な内容は「不明」と明確に回答してください
- 個別の納税額の確定、税務代理、税務申告書の作成は行いません
- 回答の末尾に国税庁の参考リンクを1〜2件記載してください

【回答フォーマット】
1. 見出し（質問の要旨）
2. ステップ（箇条書き）
3. 分岐条件（該当する場合）
4. 例示（必要に応じて）
5. 確証レベルの明示
6. 参考リンク（国税庁）

【禁止事項】
- 個人の税額確定
- 曖昧な推測による回答
- マイナンバー等の機微情報の要求
```

### 3.2 税理士事務所提供のプロンプト（詳細版）

ユーザーから提供された詳細なプロンプトがある場合、それを **System Instructions** に貼り付けてください。

**貼り付け位置**: Settings > Instructions または AI Block

---

## 4. 知識ベース（Knowledge Base）設定

### 4.1 国税庁PDFのアップロード

1. **Knowledge** タブを開く
2. 「+ Add Knowledge」をクリック
3. 以下のPDFをアップロード（または公式URLを設定）:
   - 令和7年分 年末調整のしかた（国税庁）
   - 令和7年分 年末調整Q&A（国税庁）
   - その他、事務所が指定する参考資料

### 4.2 参照設定

- **Priority**: High（最優先で参照）
- **Auto-reference**: ON（自動参照を有効化）

---

## 5. ガードレール設定（誤回答防止）

### 5.1 入力検証

**Input Validation** ブロックを追加し、以下をチェック:

```javascript
// マイナンバーっぽい文字列を検出（正規表現）
if (/\d{12}/.test(userInput)) {
  return "⚠️ マイナンバー等の機微情報は入力しないでください。";
}

// Googleドライブリンクを検出
if (userInput.includes("drive.google.com")) {
  return "⚠️ 外部リンクの貼り付けはご遠慮ください。";
}
```

### 5.2 回答後チェック

AI回答の後に **Condition** ブロックを追加し、不明な場合の明示を促します。

---

## 6. 埋め込みコード取得

### 6.1 Shareページでコード取得

1. Typebotエディタで「Share」タブを開く
2. 「Embed」を選択
3. 埋め込みタイプ: **iframe**
4. 表示されたコードをコピー

### 6.2 Webflowへの貼り付け

**コード例**:

```html
<iframe
  src="https://typebot.co/your-bot-id"
  width="100%"
  height="700"
  style="border: none; min-height: 70vh;"
  allow="clipboard-write; microphone"
  title="年末調整bot"
></iframe>
```

**Webflow配置位置**:

- `/portal` ページのメインコンテンツエリア
- Embed要素として貼り付け
- または、`portal-typebot.html` の `YOUR_TYPEBOT_URL` を置き換え

---

## 7. テスト実施

### 7.1 基本テストケース

以下の質問でbotをテストしてください:

1. **控除証明書を紛失した場合の対応**
   - 期待: 再発行手続きの案内 + 国税庁リンク

2. **住宅ローン控除の初年度と2年目以降の違い**
   - 期待: 分岐条件を明示した回答 + 参考リンク

3. **扶養控除の所得制限**
   - 期待: 金額の明示 + 確証レベル【確証あり】

4. **不明確な質問（例: "税金安くなる？"）**
   - 期待: 質問の明確化を促す + 具体的な質問例の提示

5. **マイナンバーを含む入力（テスト用）**
   - 期待: 入力禁止の警告表示

### 7.2 回答品質チェック

以下の項目を確認:

- [ ] 回答末尾に国税庁の参考リンクが付いている
- [ ] 確証レベル（【確証あり】【一般論】【仮説】）が明示されている
- [ ] 不明な内容は「不明」と明記されている
- [ ] 見出し・箇条書きで読みやすく整形されている
- [ ] 個別の税額確定は行っていない

---

## 8. 公開設定

### 8.1 公開URL設定

1. **Share** タブで公開設定を確認
2. Public URLを有効化
3. URLをコピー → Webflowの `/portal` ページに埋め込み

### 8.2 アクセス制限

- Typebot側でのアクセス制限は不要（Memberstackで制御）
- 公開URLは会員専用ページ（/portal）にのみ埋め込む

---

## 9. 年度更新（毎年実施）

### 9.1 国税庁PDFの差し替え

1. 新年度の国税庁PDFをダウンロード
2. Knowledge > Upload で新しいPDFに差し替え
3. 古いPDFを削除またはアーカイブ

### 9.2 System Instructionsの更新

- 年度表記を更新（例: 令和7年 → 令和8年）
- 法改正がある場合は指示を追記

### 9.3 テスト実施

- 上記「7.1 基本テストケース」を再実施
- 新しい法改正に関する質問を追加テスト

---

## 10. トラブルシューティング

### 問題: Botが国税庁PDFを参照していない

**原因**: Knowledge Baseの設定が不正確
**解決策**:
- Knowledge > Priority を「High」に設定
- Auto-reference を ON に設定
- PDFのアップロードを確認

### 問題: 回答に参考リンクが付かない

**原因**: System Instructionsに指示が不足
**解決策**:
- System Instructionsに「回答の末尾に参考リンクを記載」を明記
- テンプレート回答例を追加

### 問題: マイナンバー等の入力を防げない

**原因**: Input Validationが未設定
**解決策**:
- Input Validation ブロックを追加
- 正規表現で機微情報をチェック

---

## 11. 参考リンク

- Typebot公式ドキュメント: https://docs.typebot.io/
- AI設定ガイド: https://docs.typebot.io/editor/blocks/integrations/openai
- 埋め込みガイド: https://docs.typebot.io/embed/overview

---

**次のステップ**: SEO/メタ情報の設定（`03_seo-meta.txt`）
