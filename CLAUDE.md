# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- text reveal
- clip-path 系（v0.1 範囲外）
- GSAP 依存

hover 系は `umn-img-zoom`（`:hover` のみで完結する CSS only effect）に限り例外として許可。IntersectionObserver・JS 側の状態管理を伴う hover 系は追加しない。MutationObserver による動的要素検知は `init()` 時にデフォルトで有効（`src/ts/mutation-watcher.ts`）。監視範囲は `document.body` 全体固定で、opt-inセレクタ方式は追加しない。

## 変更時の注意

- 既存 class 名を不用意に変更しない（破壊的変更になる）
- effect class を追加・削除した場合は `src/ts/constants.ts` の `UMINATION_EFFECT_CLASSES` を更新する
- README.md の class 一覧も必ず更新する

## ファイル構成

```
src/
├─ css/
│  ├─ variables.css   CSS variables 定義（--umn-duration / --umn-delay / --umn-distance / --umn-blur / --umn-scale / --umn-ease）
│  ├─ base.css        共通 transition + prefers-reduced-motion
│  ├─ effects.css     各 effect class の初期状態（html.umn-ready 配下）/ .is-visible 時の表示状態
│  ├─ utilities.css   delay / duration / ease utilities
│  └─ index.css       @import まとめ
├─ ts/
│  ├─ constants.ts    定数（UMINATION_EFFECT_CLASSES / UMINATION_READY_CLASS / UMINATION_VISIBLE_CLASS / OBSERVER_OPTIONS）
│  ├─ inject-style.ts CSS 文字列を <style data-umination> として head に注入（重複注入防止）
│  └─ observer.ts     IntersectionObserver 管理（init/refresh/destroy）
└─ index.ts           エントリ（CSS注入 + 自動init + window.Umination 公開）
```

`src/ts/index.ts` は存在しない。entry は `src/index.ts` のみ。

### 実行時の流れ（src/index.ts）

1. `index.css` を `?inline` で文字列 import（JSバンドルに同梱するため）と副作用 import（Vite が `dist/umination.css` を別途出力するため）の二重 import をしている
2. `DOMContentLoaded`（または既に読み込み済みなら即時）で `initUmination()` を自動実行
3. `initUmination()` → `injectStyle()` で CSS を head に注入 → `initObserver()` で `html` に `umn-ready` を付与し、`UMINATION_EFFECT_CLASSES` に該当する要素を `IntersectionObserver` で監視開始
4. 交差したら `is-visible` を付与して即 `unobserve`（一度表示したら監視終了、`once` 相当の動作固定）
5. `window.Umination.refresh()` は動的に追加された要素を再スキャンして未観測分のみ observe に追加（`WeakSet` で観測済みを管理）
6. `window.Umination.destroy()` は observer を disconnect するのみ。`is-visible` が付いた要素のクラスは剥がさない

### ビルド構成（vite.config.ts）

`vite build --mode dev` と `--mode min` の2回ビルドを1つの `npm run build` で連続実行し、`dist/umination.{js,css}` と `dist/umination.min.{js,css}` を出力する（`cssCodeSplit: false` で CSS を単一ファイルにまとめている）。

## ビルド・開発コマンド

```bash
npm run dev       # 開発サーバー起動（examples/index.html で動作確認）
npm run build     # dev + min の2ビルドを実行し dist/ に4ファイル出力
npm run typecheck # tsc --noEmit
npm run preview   # ビルド結果をプレビュー
```

テストコマンドは未整備（テストコードなし）。lint コマンドも package.json に未定義。
