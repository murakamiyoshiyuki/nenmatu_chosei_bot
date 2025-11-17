# サイトマップ & セクション設計

**プロジェクト**：年末調整bot会員サイト
**制作環境**：Webflow + Memberstack（招待制）+ Typebot
**確証レベル**：【一般論】

---

## サイト全体構成

```
/                       → ランディングページ（公開）
/how-to-enter           → 入場方法（公開）
/login                  → ログイン（Memberstack UI）
/portal                 → 会員専用・年末調整bot（要認証）
/terms                  → 利用規約（公開・推奨）
/privacy                → プライバシーポリシー（公開・推奨）
/legal                  → 特商法表記（公開・推奨）
```

---

## 共通要素

### ナビゲーションバー（全ページ共通）

**クラス名**: `nf-navbar`

**構造**:
```
<nav class="nf-navbar">
  <div class="nf-navbar-container">
    <div class="nf-navbar-logo">
      年末調整bot
    </div>
    <div class="nf-navbar-menu">
      <a href="/how-to-enter">入場方法</a>
      <a href="/login" class="nf-btn-login">ログイン</a>
      <!-- ログイン後は下記に切り替わる（Memberstack制御） -->
      <!-- <a href="/portal" class="nf-btn-portal">マイページ</a> -->
    </div>
  </div>
</nav>
```

**Webflow配置**: 各ページのNavbar Symbolとして作成

---

### フッター（全ページ共通）

**クラス名**: `nf-footer`

**構造**:
```
<footer class="nf-footer">
  <div class="nf-footer-links">
    <a href="/terms">利用規約</a>
    <a href="/privacy">プライバシーポリシー</a>
    <a href="/legal">特商法表記</a>
  </div>
  <div class="nf-footer-copyright">
    © 2025 年末調整bot. All rights reserved.
  </div>
</footer>
```

**Webflow配置**: Footer Symbolとして作成

---

## 各ページ詳細

### 1. `/`（ランディングページ）

#### セクション構成

1. **Hero**（`nf-hero`）
   - 見出し（H1）
   - サブコピー（P）
   - CTA①：入場方法ボタン
   - CTA②：ログインボタン

2. **Features**（`nf-features`）
   - 3カラム構成
   - 各カラム：アイコン（任意）、見出し、説明文

3. **Notice**（`nf-notice`）
   - 重要注意事項
   - 免責文言

4. **Footer**

#### 要素階層

```
<div class="nf-page-container">
  <!-- Hero Section -->
  <section class="nf-hero">
    <div class="nf-hero-content">
      <h1 class="nf-hero-title">年末調整の疑問に、一次資料で即答。</h1>
      <p class="nf-hero-subtitle">
        国税庁の最新PDFを優先参照し、根拠リンク付きで回答します。
      </p>
      <div class="nf-hero-cta">
        <a href="/how-to-enter" class="nf-btn-primary">入場方法を見る</a>
        <a href="/login" class="nf-btn-secondary">ログイン</a>
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section class="nf-features">
    <div class="nf-features-container">
      <div class="nf-feature-item">
        <h3>根拠を提示</h3>
        <p>回答末尾に国税庁の参考リンクを記載します。</p>
      </div>
      <div class="nf-feature-item">
        <h3>社内で共有しやすい</h3>
        <p>手順と分岐を見出し付きで出力します。</p>
      </div>
      <div class="nf-feature-item">
        <h3>誤回答ガード</h3>
        <p>不明な内容は「不明」と明示します。</p>
      </div>
    </div>
  </section>

  <!-- Notice Section -->
  <section class="nf-notice">
    <div class="nf-notice-content">
      <h3>⚠️ 重要なお知らせ</h3>
      <p>
        本サービスは、年末調整に関する一般的な取扱いに基づく情報提供を目的としています。
        個別の納税額の確定、税務代理、税務申告書の作成は行いません。
        最終的な判断は所轄税務署または顧問税理士にご確認ください。
      </p>
    </div>
  </section>
</div>
```

**Webflow配置**: ホームページとして設定、各セクションをSectionブロックで構成

---

### 2. `/how-to-enter`（入場方法）

#### セクション構成

1. **Page Header**（`nf-page-header`）
   - ページタイトル（H1）

2. **Content**（`nf-content`）
   - ご利用の流れ（番号リスト）
   - 注意事項（箇条書き）
   - 免責文言

3. **Footer**

#### 要素階層

```
<div class="nf-page-container">
  <!-- Page Header -->
  <section class="nf-page-header">
    <h1>ご利用の流れ（銀行振込＋招待制）</h1>
  </section>

  <!-- Content Section -->
  <section class="nf-content">
    <div class="nf-content-wrapper">
      <h2>お申し込みから利用開始まで</h2>
      <ol class="nf-steps">
        <li>申込フォームまたは事務局担当へご連絡ください。</li>
        <li>振込情報をメールでお受け取りください。</li>
        <li>指定口座へ銀行振込をお願いします。</li>
        <li>入金確認後、登録メールアドレス宛に招待リンクをお送りします。</li>
        <li>招待メール内のリンクから初回ログインし、年末調整botをご利用ください。</li>
      </ol>

      <h2>⚠️ ご注意事項</h2>
      <ul class="nf-warnings">
        <li>マイナンバーなど機微情報の入力は禁止されています。</li>
        <li>Googleドライブ等の外部リンクを貼らないでください。</li>
        <li>個人情報の送信は最小限にとどめてください。</li>
        <li>招待メールが届かない場合は、迷惑メールフォルダをご確認のうえ、事務局までご連絡ください。</li>
      </ul>

      <div class="nf-disclaimer">
        <h3>免責事項</h3>
        <p>
          本サービスは、年末調整に関する一般的な取扱いに基づく情報提供を目的としています。
          個別の納税額の確定、税務代理、税務申告書の作成は行いません。
          最終的な判断は所轄税務署または顧問税理士にご確認ください。
        </p>
      </div>
    </div>
  </section>
</div>
```

**Webflow配置**: 新規ページとして作成、URLスラッグを `/how-to-enter` に設定

---

### 3. `/login`（ログイン）

#### セクション構成

1. **Page Header**（`nf-page-header`）
   - ページタイトル（H1）

2. **Login Content**（`nf-login-content`）
   - Memberstack UI埋め込み
   - 説明テキスト

3. **Footer**

#### 要素階層

```
<div class="nf-page-container">
  <!-- Page Header -->
  <section class="nf-page-header">
    <h1>ログイン</h1>
  </section>

  <!-- Login Section -->
  <section class="nf-login-content">
    <div class="nf-login-wrapper">
      <p class="nf-login-note">
        入金確認後にお送りする「招待メール」からアカウント作成をお願いします。
        <br>
        既にアカウントをお持ちの方は、下記よりログインしてください。
      </p>

      <!-- Memberstackのログインフォームをここに埋め込み -->
      <div data-ms-login-form></div>
    </div>
  </section>
</div>
```

**Webflow配置**: 新規ページとして作成、URLスラッグを `/login` に設定
**Memberstack設定**: Memberstackのログインフォームを `data-ms-login-form` 属性で自動表示

---

### 4. `/portal`（会員専用・年末調整bot）

#### セクション構成

1. **Page Header**（`nf-page-header`）
   - ページタイトル（H1）
   - リード文

2. **Bot Embed**（`nf-bot-embed`）
   - Typebot iframe埋め込み

3. **Reference Links**（`nf-references`）
   - 国税庁PDFへのリンク

4. **Footer**

#### 要素階層

```
<div class="nf-page-container">
  <!-- Page Header -->
  <section class="nf-page-header">
    <h1>年末調整bot（2025年版）</h1>
    <div class="nf-page-lead">
      <p>
        国税庁PDFを最優先参照し、根拠リンクを付して回答します。
      </p>
      <ul class="nf-important-notes">
        <li>個人の納税額の確定は行いません。</li>
        <li>マイナンバーを含む機微情報は入力しないでください。</li>
      </ul>
    </div>
  </section>

  <!-- Bot Embed Section -->
  <section class="nf-bot-embed">
    <div class="nf-bot-container">
      <!-- Typebotのiframe埋め込み（別ファイルで提供） -->
    </div>
  </section>

  <!-- Reference Links -->
  <section class="nf-references">
    <h3>参考リンク</h3>
    <ul>
      <li>
        <a href="https://www.nta.go.jp/..." target="_blank" rel="noopener">
          令和7年分 年末調整のしかた（国税庁PDF）
        </a>
      </li>
      <li>
        <a href="https://www.nta.go.jp/..." target="_blank" rel="noopener">
          令和7年分 年末調整Q&A（国税庁PDF）
        </a>
      </li>
    </ul>
  </section>
</div>
```

**Webflow配置**: 新規ページとして作成、URLスラッグを `/portal` に設定
**Memberstack設定**: Page Settings > Access で **Members only** に設定

---

## クラス命名規則

すべてのカスタムクラスは `nf-` プレフィックスを付け、Webflowデフォルトとの衝突を回避します。

### 主要クラス一覧

| クラス名 | 用途 |
|---------|------|
| `nf-navbar` | ナビゲーションバー |
| `nf-hero` | ヒーローセクション |
| `nf-features` | 機能紹介セクション |
| `nf-notice` | 注意事項セクション |
| `nf-page-header` | ページヘッダー |
| `nf-content` | コンテンツエリア |
| `nf-login-content` | ログインエリア |
| `nf-bot-embed` | Bot埋め込みエリア |
| `nf-references` | 参考リンクエリア |
| `nf-footer` | フッター |
| `nf-btn-primary` | プライマリボタン |
| `nf-btn-secondary` | セカンダリボタン |

---

## Webflowでの配置フロー

1. **新規プロジェクト作成** → プロジェクト名「年末調整bot会員サイト」
2. **ページ作成**
   - Home（/）
   - How to Enter（/how-to-enter）
   - Login（/login）
   - Portal（/portal）
   - Terms（/terms）
   - Privacy（/privacy）
   - Legal（/legal）
3. **Navbar/Footer Symbol作成** → 全ページに適用
4. **各ページにセクション追加** → 上記構造に従って配置
5. **Embed Codeブロック追加** → HTML/CSS埋め込み用（次のファイルで提供）
6. **Memberstack Script追加** → Project Settings > Custom Code > Head
7. **Protected Page設定** → /portal を Members only に設定

---

**次のファイル**: `02_copy-text.txt` でコピーライティング全文を提供します。
