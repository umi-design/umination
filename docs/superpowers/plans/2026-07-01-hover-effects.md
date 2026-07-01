# umn-hover-* Hover Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `umn-hover-lift` / `umn-hover-border` / `umn-hover-tilt` / `umn-hover-fade` の4つのCSS onlyのhover effect classを追加する。

**Architecture:** 既存の `umn-img-zoom`（`src/css/effects.css`）と同じ設計思想で、`src/css/effects.css` に4ブロック追加するのみ。JS側の変更は一切ない。`src/css/variables.css` に新規CSS変数5つを追加する。

**Tech Stack:** plain CSS。テストフレームワークは存在しないプロジェクトのため、各タスクの検証は `npm run typecheck` / `npm run build` とコードトレース・CSSセレクタの目視確認で行う。

## Global Constraints

- class prefix は `umn-` 固定（spec: 2026-07-01-hover-effects-design.md）
- 命名規則は `umn-hover-*` に統一する
- JS側の変更は一切ない。`src/ts/constants.ts` の `UMINATION_EFFECT_CLASSES` には追加しない（IntersectionObserverの監視対象外）
- 複数のhover effectの同時使用を制限しない（例: `umn-hover-lift umn-hover-border`）
- 既存のスクロール系effect class・`umn-img-zoom` と組み合わせて使える
- `prefers-reduced-motion: reduce` ではtransitionを無効化する
- `umn-hover-fade` は opacity のトグルのみに限定する（背景色パレット等のcolor utilityは導入しない）
- transitionのduration/easingは新規変数を作らず既存の `--umn-duration`/`--umn-ease` を流用する
- `window.Umination.init/refresh/destroy` のシグネチャは変更しない（このタスクではJS変更自体がないため無関係）

---

### Task 1: CSS変数追加と4つのhover effectの実装

**Files:**
- Modify: `src/css/variables.css`
- Modify: `src/css/effects.css`

**Interfaces:**
- Consumes: なし
- Produces: 4つの新規CSS class（`.umn-hover-lift` / `.umn-hover-border` / `.umn-hover-tilt` / `.umn-hover-fade`）と5つのCSS変数（`--umn-hover-shadow` / `--umn-hover-lift-distance` / `--umn-hover-border-color` / `--umn-hover-tilt-deg` / `--umn-hover-opacity`）。Task 2（ドキュメント）がこれらのclass名・変数名を参照する

- [ ] **Step 1: 現状の `src/css/variables.css` 全体を確認**

```css
:root {
  --umn-duration: 0.8s;
  --umn-delay: 0s;
  --umn-stagger-step: 0.1s;
  --umn-distance: 24px;
  --umn-blur: 12px;
  --umn-scale: 0.88;
  --umn-ease: cubic-bezier(0.22, 1, 0.36, 1);
}
```

- [ ] **Step 2: `src/css/variables.css` に5つのhover用CSS変数を追加**

`--umn-ease` の直前に追加する（既存の変数群の末尾）:

```css
:root {
  --umn-duration: 0.8s;
  --umn-delay: 0s;
  --umn-stagger-step: 0.1s;
  --umn-distance: 24px;
  --umn-blur: 12px;
  --umn-scale: 0.88;
  --umn-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --umn-hover-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  --umn-hover-lift-distance: -4px;
  --umn-hover-border-color: currentColor;
  --umn-hover-tilt-deg: -2deg;
  --umn-hover-opacity: 0.7;
}
```

- [ ] **Step 3: 現状の `src/css/effects.css` の `umn-img-zoom` 実装（末尾）を確認**

```css
/* umn-img-zoom — コンテナ hover で内側の img をズーム（CSS only・JS不要） */
.umn-img-zoom {
  overflow: hidden;
  display: block;
}
.umn-img-zoom img,
.umn-img-zoom picture > img {
  display: block;
  width: 100%;
  transition: transform var(--umn-duration) var(--umn-ease);
}
.umn-img-zoom:hover {
  cursor: zoom-in;
}
.umn-img-zoom:hover img,
.umn-img-zoom:hover picture > img {
  transform: scale(1.05);
}
@media (prefers-reduced-motion: reduce) {
  .umn-img-zoom img,
  .umn-img-zoom picture > img { transition: none; }
}
```

`umn-img-zoom` は「コンテナに `transition` を持たせず、内側の `img` にtransitionを持たせる」構造だが、今回追加する4つの `umn-hover-*` はコンテナ自身（class を付けた要素そのもの）にtransitionとhover変化を適用する、より単純な構造にする。

- [ ] **Step 4: `src/css/effects.css` の末尾に4つの `umn-hover-*` ブロックを追加**

`umn-img-zoom` ブロックの直後に追加する:

```css
/* umn-hover-lift — hoverで浮き上がる（box-shadow拡大 + translateY） */
.umn-hover-lift {
  transition: transform var(--umn-duration) var(--umn-ease), box-shadow var(--umn-duration) var(--umn-ease);
}
.umn-hover-lift:hover {
  transform: translateY(var(--umn-hover-lift-distance));
  box-shadow: var(--umn-hover-shadow);
}
@media (prefers-reduced-motion: reduce) {
  .umn-hover-lift { transition: none; }
}

/* umn-hover-border — hoverでborder-colorが変化 */
.umn-hover-border {
  transition: border-color var(--umn-duration) var(--umn-ease);
}
.umn-hover-border:hover {
  border-color: var(--umn-hover-border-color);
}
@media (prefers-reduced-motion: reduce) {
  .umn-hover-border { transition: none; }
}

/* umn-hover-tilt — hoverで軽く傾く */
.umn-hover-tilt {
  transition: transform var(--umn-duration) var(--umn-ease);
}
.umn-hover-tilt:hover {
  transform: rotate(var(--umn-hover-tilt-deg));
}
@media (prefers-reduced-motion: reduce) {
  .umn-hover-tilt { transition: none; }
}

/* umn-hover-fade — hoverでopacityが変化 */
.umn-hover-fade {
  transition: opacity var(--umn-duration) var(--umn-ease);
}
.umn-hover-fade:hover {
  opacity: var(--umn-hover-opacity);
}
@media (prefers-reduced-motion: reduce) {
  .umn-hover-fade { transition: none; }
}
```

設計メモ（このタスクの実装者向け）:
- `umn-hover-border` を使う要素には `border` プロパティ（`border: 1px solid transparent;` 等）が別途必要になる。ブラウザのデフォルトでは多くの要素に `border` が無いため、`border-color` を変化させても見た目に変化が出ない場合がある。これは利用者側でCSSを用意する前提とする（uminationは `border-width`/`border-style` を強制しない）。この点はTask 2でREADMEに補足する
- `umn-hover-lift`/`umn-hover-tilt` の `transform` は同時に他のtransform系effect（`umn-scale-in`等）と組み合わせるとtransformの上書き競合が起きうる（CSSの `transform` は複数箇所で指定すると後勝ちになる）。ただしこれは既存の `umn-img-zoom`（img要素へのtransform適用）と違い、コンテナ自身への適用なので、スクロール系のtransform系effect（`umn-slide-*`/`umn-scale-in`）と直接組み合わせるとhover時のtransformがスクロール表示時のtransformを上書きしうる。これは既知のCSS制約であり、このタスクでは対応しない（spec/planのスコープ外。README側で軽く触れる程度に留める）

- [ ] **Step 5: 型チェックとビルドで確認**

Run: `npm run typecheck && npm run build`
Expected: 両方エラー 0（CSSのみの変更のためtypecheckは無関係、buildが正常に完了することを確認する）。`dist/umination.css` に `umn-hover-lift` 文字列が同梱されていることを確認する場合は `grep -o "umn-hover-lift" dist/umination.css` で1件以上ヒットすることを確認する

- [ ] **Step 6: CSSセレクタの目視確認**

`src/css/effects.css` を開き、以下を確認する:
- 4つのブロックがそれぞれ `.umn-hover-*`、`.umn-hover-*:hover`、`@media (prefers-reduced-motion: reduce) { .umn-hover-* { transition: none; } }` の3セットで構成されていること
- 中括弧の対応が崩れていないこと（ファイル全体が正しくパースされることは `npm run build` のCSS処理でも間接的に確認できる）

- [ ] **Step 7: Commit**

```bash
git add src/css/variables.css src/css/effects.css
git commit -m "feat: umn-hover-* の4つのhover effectを追加"
```

---

### Task 2: ドキュメント更新（README.md / CLAUDE.md）

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: なし（ドキュメントのみ）
- Produces: なし

- [ ] **Step 1: `README.md` の「hover 系（CSS only・JS不要）」セクションを更新**

現状:

```markdown
### hover 系（CSS only・JS不要）

| class | 動作 |
|---|---|
| `umn-img-zoom` | コンテナに付けると、hover 時に内側の `img` / `picture > img` が `scale(1.05)` にズーム |

`umn-img-zoom` は scroll 表示 effect（`umn-fade-in` 等）と組み合わせて使える。

```html
<div class="umn-scale-in umn-img-zoom">
  <img src="/image.jpg" alt="">
</div>
```

## Stagger
```

次の内容に置き換える（表に4行追加し、使い方の説明とコード例を追加する）:

```markdown
### hover 系（CSS only・JS不要）

| class | 動作 |
|---|---|
| `umn-img-zoom` | コンテナに付けると、hover 時に内側の `img` / `picture > img` が `scale(1.05)` にズーム |
| `umn-hover-lift` | hover 時に box-shadow が拡大し、わずかに浮き上がる |
| `umn-hover-border` | hover 時に `border-color` が変化（デフォルト `currentColor`） |
| `umn-hover-tilt` | hover 時に軽く傾く（デフォルト `-2deg`） |
| `umn-hover-fade` | hover 時に `opacity` が変化（デフォルト `0.7`） |

`umn-img-zoom` は scroll 表示 effect（`umn-fade-in` 等）と組み合わせて使える。

```html
<div class="umn-scale-in umn-img-zoom">
  <img src="/image.jpg" alt="">
</div>
```

`umn-hover-*` も同様に組み合わせ可能。複数の `umn-hover-*` を同時に付けることもできる。

```html
<button class="umn-hover-lift umn-hover-border">
  hoverで浮き上がりつつ枠線が変化するボタン
</button>
```

`umn-hover-border` を使う場合、要素に `border`（`border-width`/`border-style`）を別途指定する必要がある（uminationは border の太さ・スタイルを強制しない、色の変化のみを提供する）。

`umn-hover-lift`/`umn-hover-tilt` はコンテナ自身に `transform` を適用するため、`umn-slide-*`/`umn-scale-in` のようなtransform系のスクロール表示effectと同じ要素に組み合わせると、hover時のtransformがスクロール表示時のtransformを上書きする場合がある。

## Stagger
```

- [ ] **Step 2: `README.md` の「CSS variables」セクションに5つの新規変数を追加**

現状:

```css
:root {
  --umn-duration: 0.8s;
  --umn-delay: 0s;
  --umn-stagger-step: 0.1s;
  --umn-distance: 24px;
  --umn-blur: 12px;
  --umn-scale: 0.88;
  --umn-ease: cubic-bezier(0.22, 1, 0.36, 1);
}
```

（`## CSS variables` セクション内のこのコードブロックを探すこと。README.md内で `--umn-duration` を検索すると見つかる）このコードブロックを次の内容に置き換える:

```css
:root {
  --umn-duration: 0.8s;
  --umn-delay: 0s;
  --umn-stagger-step: 0.1s;
  --umn-distance: 24px;
  --umn-blur: 12px;
  --umn-scale: 0.88;
  --umn-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --umn-hover-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  --umn-hover-lift-distance: -4px;
  --umn-hover-border-color: currentColor;
  --umn-hover-tilt-deg: -2deg;
  --umn-hover-opacity: 0.7;
}
```

- [ ] **Step 3: `CLAUDE.md` の「追加してはいけないもの」の hover系例外の記述を更新**

現状:

```markdown
hover 系は `umn-img-zoom`（`:hover` のみで完結する CSS only effect）に限り例外として許可。IntersectionObserver・JS 側の状態管理を伴う hover 系は追加しない。MutationObserver による動的要素検知は `init()` 時にデフォルトで有効（`src/ts/mutation-watcher.ts`）。監視範囲は `document.body` 全体固定で、opt-inセレクタ方式は追加しない。
```

次の内容に置き換える（`umn-img-zoom` のみから `umn-hover-*` 系も含む形にする）:

```markdown
hover 系は `:hover` のみで完結する CSS only effect（`umn-img-zoom` / `umn-hover-lift` / `umn-hover-border` / `umn-hover-tilt` / `umn-hover-fade`）に限り例外として許可。IntersectionObserver・JS 側の状態管理を伴う hover 系は追加しない。MutationObserver による動的要素検知は `init()` 時にデフォルトで有効（`src/ts/mutation-watcher.ts`）。監視範囲は `document.body` 全体固定で、opt-inセレクタ方式は追加しない。
```

- [ ] **Step 4: 目視確認**

`README.md` と `CLAUDE.md` をエディタで開き、Markdown のコードフェンスが正しく閉じているか、見出し階層が壊れていないか、表の列数が揃っているかを確認する。

- [ ] **Step 5: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: umn-hover-*対応のドキュメントを更新"
```

---

## Self-Review Notes

- **spec カバレッジ:** spec の「決定事項」「HTML例」「CSS変数」「実装方針」「変更ファイル一覧」は Task 1〜2 でそれぞれ対応済み。「スコープ外」に明記されたJS状態管理を伴うhover系・color utility・duration個別utilityは本計画でも扱わない
- **命名の一貫性:** `--umn-hover-shadow`/`--umn-hover-lift-distance`/`--umn-hover-border-color`/`--umn-hover-tilt-deg`/`--umn-hover-opacity`（Task 1）→ README記述（Task 2）まで表記ゆれなし。class名 `umn-hover-lift`/`umn-hover-border`/`umn-hover-tilt`/`umn-hover-fade` も一貫
- **既存挙動の非破壊確認:** `src/css/effects.css` の既存ブロック（`umn-fade-in`〜`umn-scale-in`、`umn-img-zoom`）には一切変更を加えない。追記のみ
- **JS非変更の確認:** Task 1・2ともCSS/Markdownの変更のみ。`src/ts/` 配下のファイルは一切触らない
