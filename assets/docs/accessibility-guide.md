# アクセシビリティガイド

**年末調整bot会員サイト**
**確証レベル**: 【一般論】

---

## 目的

すべてのユーザーが年末調整botを快適に利用できるよう、アクセシビリティに配慮したサイト設計を行います。

このガイドは、**WCAG 2.1（Web Content Accessibility Guidelines 2.1）レベルAA**を目標基準としています。

---

## 1. 基本原則（POUR原則）

### 1.1 Perceivable（知覚可能）

情報とユーザーインターフェースは、ユーザーが知覚できる方法で提示される必要があります。

### 1.2 Operable（操作可能）

ユーザーインターフェースは、ユーザーが操作できる必要があります。

### 1.3 Understandable（理解可能）

情報とユーザーインターフェースは、ユーザーが理解できる必要があります。

### 1.4 Robust（堅牢）

コンテンツは、支援技術を含む様々なユーザーエージェントで解釈できる必要があります。

---

## 2. 画像とメディア

### 2.1 代替テキスト（alt属性）

すべての画像に適切な代替テキストを設定してください。

**良い例**:
```html
<img src="logo.png" alt="年末調整bot ロゴ">
<img src="feature-icon.png" alt="根拠を提示するアイコン">
```

**悪い例**:
```html
<img src="logo.png" alt="画像">
<img src="feature-icon.png" alt="">
```

### 2.2 装飾画像

装飾目的の画像は、alt属性を空にします。

```html
<img src="decorative-pattern.png" alt="">
```

### 2.3 推奨される代替テキスト

| 画像の種類 | 代替テキスト例 |
|-----------|---------------|
| ロゴ | 「年末調整bot ロゴ」 |
| 機能アイコン（根拠提示） | 「国税庁の参考リンクを表示するアイコン」 |
| 機能アイコン（共有） | 「社内で共有しやすい形式で出力するアイコン」 |
| 機能アイコン（誤回答ガード） | 「不明な内容を明示するアイコン」 |

---

## 3. テキストとフォント

### 3.1 フォントサイズ

- **最小フォントサイズ**: 16px（1rem）
- **見出し（H1）**: 2.5rem（モバイルは1.875rem）
- **見出し（H2）**: 1.5rem
- **本文**: 1rem

### 3.2 行間（line-height）

- **本文**: 1.6〜1.8
- **見出し**: 1.2〜1.4

### 3.3 文字間隔（letter-spacing）

- 通常: 0（デフォルト）
- 強調する場合: 0.05em〜0.1em

### 3.4 読みやすさ

- **1行の文字数**: 50〜75文字（日本語は25〜35文字程度）
- **段落の間隔**: 1.5em以上
- **左揃え推奨**: 日本語は左揃えが読みやすい

---

## 4. 色とコントラスト

### 4.1 コントラスト比（WCAG 2.1 AA基準）

- **通常テキスト**: 4.5:1以上
- **大きなテキスト**（18pt以上または14pt太字以上）: 3:1以上

### 4.2 推奨カラーパレット

| 用途 | 色 | 背景色 | コントラスト比 |
|------|-----|--------|---------------|
| 本文テキスト | `#2d3748` | `#ffffff` | 12.6:1 ✓ |
| リンクテキスト | `#3182ce` | `#ffffff` | 4.5:1 ✓ |
| ボタン（プライマリ） | `#ffffff` | `#667eea` | 4.8:1 ✓ |
| 注意事項テキスト | `#742a2a` | `#fff5f5` | 8.2:1 ✓ |

### 4.3 色だけに依存しない

情報を色だけで伝えないでください。アイコンやテキストも併用します。

**良い例**:
```html
<p>⚠️ 重要: マイナンバーの入力は禁止されています</p>
```

**悪い例**:
```html
<p style="color: red;">マイナンバーの入力は禁止されています</p>
```

### 4.4 コントラストチェックツール

- **WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **Colour Contrast Analyser**: https://www.tpgi.com/color-contrast-checker/

---

## 5. 見出しと構造

### 5.1 見出しタグの階層

見出しタグ（H1〜H6）は、論理的な階層で使用してください。

**良い例**:
```html
<h1>年末調整bot</h1>
  <h2>ご利用の流れ</h2>
    <h3>お申し込み</h3>
    <h3>銀行振込</h3>
  <h2>注意事項</h2>
```

**悪い例**:
```html
<h1>年末調整bot</h1>
  <h3>ご利用の流れ</h3>  <!-- H2を飛ばしている -->
    <h2>お申し込み</h2>  <!-- 階層が逆 -->
```

### 5.2 見出しの使い方

- **H1**: ページに1つのみ（ページタイトル）
- **H2**: 主要セクションの見出し
- **H3**: サブセクションの見出し

---

## 6. リンクとボタン

### 6.1 リンクテキスト

リンクテキストは、リンク先が明確にわかる文言にしてください。

**良い例**:
```html
<a href="/how-to-enter">入場方法を見る</a>
<a href="https://www.nta.go.jp/..." target="_blank" rel="noopener">
  令和7年分 年末調整のしかた（国税庁PDF）
</a>
```

**悪い例**:
```html
<a href="/how-to-enter">こちら</a>
<a href="https://www.nta.go.jp/...">クリック</a>
```

### 6.2 外部リンク

外部リンクは、新しいタブで開くことを明示してください。

```html
<a href="https://www.nta.go.jp/..." target="_blank" rel="noopener">
  令和7年分 年末調整のしかた（国税庁PDF）<span class="sr-only">（新しいタブで開きます）</span>
</a>
```

**スクリーンリーダー専用テキスト**:
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### 6.3 ボタンのサイズ

タップターゲットのサイズは、最小44×44px（モバイル）にしてください。

```css
.nf-btn-primary {
  padding: 0.875rem 2rem; /* 約44px以上の高さ */
  min-height: 44px;
}
```

---

## 7. キーボード操作

### 7.1 Tab順序

すべてのインタラクティブ要素（リンク、ボタン、フォーム）は、Tabキーで移動できる必要があります。

### 7.2 フォーカス表示

フォーカス状態を視覚的に明確にしてください。

```css
a:focus,
button:focus {
  outline: 2px solid #3182ce;
  outline-offset: 2px;
}
```

**注意**: `outline: none` を使用する場合は、代替のフォーカス表示を必ず設定してください。

### 7.3 スキップリンク

長いナビゲーションをスキップできるリンクを提供してください。

```html
<a href="#main-content" class="skip-link">メインコンテンツへスキップ</a>

<nav><!-- ナビゲーション --></nav>

<main id="main-content">
  <!-- メインコンテンツ -->
</main>
```

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

---

## 8. フォームとエラーメッセージ

### 8.1 ラベル

すべてのフォーム要素に明確なラベルを設定してください。

```html
<label for="email">メールアドレス</label>
<input type="email" id="email" name="email" required>
```

### 8.2 エラーメッセージ

エラーメッセージは、具体的で分かりやすく表示してください。

**良い例**:
```html
<div role="alert" class="error">
  ⚠️ メールアドレスの形式が正しくありません。例: example@example.com
</div>
```

**悪い例**:
```html
<div class="error">エラー</div>
```

### 8.3 必須項目

必須項目は、視覚的とテキストの両方で明示してください。

```html
<label for="email">
  メールアドレス <span class="required" aria-label="必須">*</span>
</label>
<input type="email" id="email" name="email" required aria-required="true">
```

---

## 9. スクリーンリーダー対応

### 9.1 ARIAラベル

意味が不明確な要素には、ARIAラベルを使用してください。

```html
<button aria-label="メニューを開く">
  ☰
</button>

<nav aria-label="メインナビゲーション">
  <!-- ナビゲーション項目 -->
</nav>
```

### 9.2 ライブリージョン

動的に更新されるコンテンツには、`aria-live` を使用してください。

```html
<div aria-live="polite" aria-atomic="true">
  招待メールを送信しました。
</div>
```

### 9.3 ランドマーク

ページ構造を明確にするため、ランドマークを使用してください。

```html
<header><!-- ヘッダー --></header>
<nav><!-- ナビゲーション --></nav>
<main><!-- メインコンテンツ --></main>
<aside><!-- サイドバー --></aside>
<footer><!-- フッター --></footer>
```

---

## 10. レスポンシブデザイン

### 10.1 モバイル対応

- **タップターゲット**: 最小44×44px
- **フォントサイズ**: 最小16px
- **ズーム**: 無効化しない（`user-scalable=no` を使用しない）

```html
<!-- 良い例 -->
<meta name="viewport" content="width=device-width, initial-scale=1">

<!-- 悪い例 -->
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
```

### 10.2 メディアクエリ

```css
/* モバイル優先 */
body {
  font-size: 16px;
}

/* タブレット */
@media (min-width: 768px) {
  body {
    font-size: 18px;
  }
}

/* デスクトップ */
@media (min-width: 1024px) {
  body {
    font-size: 18px;
  }
}
```

---

## 11. テストとチェックリスト

### 11.1 手動テスト

- [ ] キーボードのみで全ページを操作できる（Tabキー、Enterキー）
- [ ] スクリーンリーダーで読み上げて確認（NVDA、JAWSなど）
- [ ] ブラウザのズーム機能で200%に拡大しても読める
- [ ] 色覚シミュレーターで確認（色覚異常のユーザーでも識別可能か）

### 11.2 自動テストツール

- **axe DevTools**: https://www.deque.com/axe/devtools/
- **WAVE**: https://wave.webaim.org/
- **Lighthouse（Chrome DevTools）**: Accessibility スコアを確認

### 11.3 チェックリスト

- [ ] すべての画像に代替テキストがある
- [ ] 見出しタグが論理的な階層で使用されている
- [ ] リンクテキストが明確
- [ ] コントラスト比が基準を満たしている
- [ ] フォーカス表示が明確
- [ ] キーボードで操作可能
- [ ] エラーメッセージが具体的
- [ ] ズーム機能が有効

---

## 12. アクセシビリティステートメント

サイトに以下のステートメントを掲載することを推奨します。

---

### アクセシビリティへの取り組み

年末調整botは、すべてのユーザーが快適にご利用いただけるよう、アクセシビリティに配慮したサイト設計を行っています。

**目標基準**: WCAG 2.1 レベルAA

**対応内容**:
- キーボードのみでの操作に対応
- スクリーンリーダーに対応
- 適切なコントラスト比の確保
- 明確なフォーカス表示

**お困りの点がございましたら**、以下までご連絡ください。

メールアドレス: accessibility@yourdomain.com

---

## 13. 参考リンク

- **WCAG 2.1（日本語）**: https://waic.jp/docs/WCAG21/
- **WebAIM**: https://webaim.org/
- **a11y Project**: https://www.a11yproject.com/
- **MDN アクセシビリティ**: https://developer.mozilla.org/ja/docs/Web/Accessibility

---

**次のステップ**: Typebot用プロンプトファイルの作成
