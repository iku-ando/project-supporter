# Project Supporter — CLAUDE.md

## プロジェクト概要

**ProjectFlow — AI Project Planner**  
単一HTMLファイル（`project-dashboard.html`）として実装されたプロジェクト管理ツール。外部フレームワーク不使用、純粋なHTML/CSS/JavaScriptで構成。

### ファイル構成
- **CSS**: 行1〜約1350（デザインシステム・コンポーネントスタイル）
- **HTML**: 行1350〜約1626（2パネル構成）
- **JavaScript**: 行1627〜6726（全機能ロジック）

### 主要機能
- **Step 1**: プロジェクト情報入力（名前・期間・カテゴリ・メンバー）
- **Step 2 タブ**:
  - カンバン — メンバー別タスクカード、ドラッグ&ドロップ
  - ガントチャート — フェーズ別バー、定例ライン、タスク追加
  - MTGメモ — アジェンダ・決定事項・タスク記録
  - 管理シート — 別ビュー
- **AIタスク生成** — Claude API呼び出し＋フォールバック
- **Supabase連携** — クラウド保存・同期（REST API直接呼び出し）
- **スナップショット** — localStorage保存・バージョン復元
- **Excel出力** — SheetJS動的ロード

### 技術スタック
- 純粋な HTML / CSS / JavaScript（フレームワークなし）
- Google Fonts: DM Sans, DM Mono, Syne, Noto Sans JP
- Supabase REST API（クラウド同期）
- SheetJS（Excel出力時のみ動的ロード）

### デザインシステム
```
--bg:      #faf3e6  （ウォームベージュ）
--accent:  #5b4ef5  （メインパープル）
--accent2: #7c6bff
--green:   #10b981
--text:    #1f1a14
--r:       10px     （カードの角丸）
--r2:      6px      （小要素の角丸）
```

---

## 開発ルール

- **単一ファイルの制約を守る** — 新しいファイルを作らず、`project-dashboard.html` を直接編集する
- **外部依存は最小限に** — 既存の外部リソース（Google Fonts・Supabase・SheetJS）以外は追加しない
- **CSSはファイル先頭の `<style>` タグ内に記述する**（インラインスタイルも許容するが、再利用するスタイルはクラス化）
- **JavaScriptはファイル末尾の `<script>` タグ内に記述する**
- **日本語UIを維持する** — ラベル・メッセージ・コメントはすべて日本語

---

## /frontend-design スキル

UI改善・デザイン変更を行うときのガイドライン。

### 目的
`project-dashboard.html` のビジュアルデザイン・UXを改善する。既存のデザインシステム（CSS変数）を活かしながら、一貫性と美しさを高める。

### 作業手順

1. **対象箇所を Read ツールで確認する** — 変更前に必ず既存のHTML/CSSを読む
2. **CSS変数を優先的に使う** — ハードコードした色・サイズより `var(--accent)` などの変数を使う
3. **既存クラスを再利用する** — 新クラスを作る前に既存クラスで対応できないか確認する
4. **レスポンシブを考慮する** — 幅・高さは固定値より `flex` / `%` / `min-width` を優先
5. **アニメーションは控えめに** — `transition: all 0.2s` 程度に留め、派手な動きは避ける
6. **Edit ツールで最小差分の変更を行う** — 広い範囲を一括置換せず、対象部分だけを編集する

### デザインパターン

#### カード
```css
background: var(--bg2);
border: 1px solid var(--border);
border-radius: var(--r);
padding: 28px 32px;
```

#### ボタン（プライマリ）
```css
background: var(--accent);
color: #fff;
border-radius: var(--r2);
padding: 12px 28px;
font-family: 'Syne', sans-serif;
font-weight: 600;
```

#### ラベル・見出し
```css
font-family: 'DM Mono', monospace;
font-size: 10-11px;
letter-spacing: 1-2px;
text-transform: uppercase;
color: var(--text3);
```

#### セクションタイトル
```css
font-family: 'Syne', sans-serif;
font-weight: 600;
font-size: 13px;
```

### フォント使い分け

| フォント | 用途 |
|----------|------|
| `'Syne'` | 見出し・ボタン・強調テキスト |
| `'DM Mono'` | ラベル・メタ情報・数値・コード |
| `'DM Sans'` | 本文・入力フィールド・説明文 |
| `'Noto Sans JP'` | 日本語の見出し・プロジェクト名 |

### やってはいけないこと
- 既存のCSS変数を直接書き換えない（他の箇所に影響が出る）
- `!important` を使わない
- インラインスタイルでフォントサイズを多用しない（クラス化する）
- Google Fonts 以外のフォントを追加しない
