# CLAUDE.md — umination

## このリポジトリの目的

汎用スクロールアニメーション CSS/JS ライブラリ。effect class 1つ + script 1ファイルで動作する。

- package: `@umi-design/umination`
- build: Vite + TypeScript
- CSS: plain CSS（SCSS・PostCSS 等は使わない）

## 設計原則（変更禁止）

- class prefix は `umn-` 固定
- data 属性は使わない
- base class（`.umn-reveal` 等）は作らない
- effect class 1つで動く設計を維持する
- HTML に書く class は基本 1つ（utility との組み合わせは可）

## JS 無効時の安全設計

初期非表示ルール（`opacity: 0` 等）は `html.umn-ready` 配下のみ適用。JS が無効なら `umn-ready` が付かないため、コンテンツは常に表示される。この原則を崩さないこと。

```css
/* 正しい書き方 */
html.umn-ready .umn-slide-up { opacity: 0; }

/* NG — html.umn-ready なしで初期非表示にすると JS 無効時にコンテンツが消える */
.umn-slide-up { opacity: 0; }
```

## 追加してはいけないもの

- layout utility（`.umn-flex`, `.umn-grid` 等）
- reset CSS
- color utility
- typography utility
- hover 系アニメーション
- text reveal
- clip-path 系（v0.1 範囲外）
- MutationObserver による動的検出（v0.1 範囲外）
- GSAP 依存

## 変更時の注意

- 既存 class 名を不用意に変更しない（破壊的変更になる）
- effect class を追加・削除した場合は `src/ts/constants.ts` の `UMINATION_EFFECT_CLASSES` を更新する
- README.md の class 一覧も必ず更新する

## ファイル構成

```
src/
├─ css/
│  ├─ variables.css   CSS variables 定義
│  ├─ base.css        共通 transition + prefers-reduced-motion
│  ├─ effects.css     各 effect class の初期状態 / 表示状態
│  ├─ utilities.css   delay / duration / ease utilities
│  └─ index.css       @import まとめ
├─ ts/
│  ├─ constants.ts    定数（effect class 一覧・observer 設定）
│  ├─ inject-style.ts CSS を head に注入
│  ├─ observer.ts     IntersectionObserver 管理
│  └─ index.ts        （未使用。src/index.ts が entry）
└─ index.ts           エントリ（CSS注入 + 自動init + window.Umination）
```

## ビルド

```bash
npm run dev       # 開発サーバー（examples/index.html を確認）
npm run build     # dist/ に js/min.js/css/min.css を出力
npm run typecheck # 型チェック
npm run preview   # ビルド結果をプレビュー
```
