# umn-typing / umn-parallax 設計

- 日付: 2026-07-04
- 対象: `@umi-design/umination` v0.2 候補
- 追加 effect: `umn-typing`（JS 駆動 typewriter）、`umn-parallax`（CSS scroll-driven 視差）

## 目的

- スクロールで画面に入ったら文字が1文字ずつ現れる **タイプライター** を提供する（複数行対応・タイプ中カーソル付き）。
- スクロール連動の **視差（parallax）** を、方向・速度をオプション指定できる形で提供する。

いずれも既存の設計思想（`umn-` prefix / data 属性不使用 / HTML の class は基本1つ / JS 無効時安全）を守る。ただし typing のみ、後述の text reveal 例外を認める。

---

## 機能1: umn-typing（JS 駆動 typewriter）

### 見た目・挙動の要件

- タイプライター（左から1文字ずつ出現）+ カーソル。
- カーソルは **タイプ中のみ点滅**、完了後は消す。
- **複数行対応**（折り返し可）。
- スクロールで画面に入ったら開始。

### なぜ JS 駆動か

CSS の width `steps()` 単一要素方式は 1行 nowrap 専用で、複数行にできない。かつ「タイプ位置に追従するカーソル」は「今表示中の文字」を CSS セレクタで選べないため CSS animation だけでは表現不可。よって複数行 + 動くカーソルは JS 駆動が現実解。

### 実装方式

- JS が要素の `textContent` を1文字ずつ `<span class="umn-char">` に分割する。改行（`\n`）・空白は保持する。
- 全 char を最初に DOM 配置し領域を先に確保する（初期 `opacity: 0`）。これによりタイプ進行中のレイアウトのガタつき・折り返し変化を防ぐ。
- カーソル span を1つ生成する（`umn-typing-cursor`）。
- **typing 専用 IntersectionObserver**（`typing.ts` 内で管理。既存の is-visible 用 observer とは分離）で交差検知 → `typeElement()` 起動 → 当該要素を `unobserve`（once 相当）。
- `typeElement()`: `requestAnimationFrame` ベースで経過時間を見ながら1文字ずつ `umn-char` に `is-typed` を付与。付与のたびにカーソルを直後の char へ DOM 移動する（`char.after(cursor)`）。これで複数行の折り返し位置にカーソルが自然追従する。最終文字到達後にカーソルを fade-out する。
- 速度: CSS variable `--umn-typing-speed`（ms/char、デフォルト 45ms）。utility `umn-typing-fast` / `umn-typing-slow` でプリセット上書き。JS は `getComputedStyle` で解決値を読む。

### CSS（effects.css へ追記）

```css
html.umn-ready .umn-typing .umn-char { opacity: 0; }
html.umn-ready .umn-typing .umn-char.is-typed { opacity: 1; }
.umn-typing-cursor { /* 点滅 animation、幅 1〜2px 相当の縦バー */ }
@media (prefers-reduced-motion: reduce) {
  html.umn-ready .umn-typing .umn-char { opacity: 1; }
  .umn-typing-cursor { display: none; }
}
```

### 安全設計（原則維持）

- 初期非表示は `html.umn-ready .umn-char` 配下のみ → JS 無効時は `umn-ready` が付かず全文表示。
- `prefers-reduced-motion: reduce` → 全 char 即表示・カーソル非表示（JS 側でも分割せず即終了 or CSS で全表示）。

### ファイル

- 新規: `src/ts/typing.ts` — `initTyping()` / `refreshTyping()` / `destroyTyping()`。
- `src/index.ts`: `initUmination` / `refresh` / `destroy` にそれぞれ typing の init/refresh/destroy を統合。
- `src/css/effects.css`: 上記 typing CSS 追記。
- `src/ts/constants.ts`: typing 用セレクタ定数（`UMINATION_TYPING_CLASS = 'umn-typing'` 等）を追加。`UMINATION_EFFECT_CLASSES` には**入れない**（is-visible トグル系と混ざるのを避けるため専用 observer 管理）。

### refresh / destroy

- `refreshTyping()`: 未処理（未分割）の `umn-typing` を検出して分割 + observe 追加。`WeakSet` で処理済み管理。
- `destroyTyping()`: 専用 observer を disconnect。分割済み DOM・is-typed は剥がさない（既存 destroy と同じ思想）。

---

## 機能2: umn-parallax（CSS scroll-driven 視差）

### 要件

- スクロール連動の視差。**方向・速度をオプション指定**できる。
- JS 非依存（CSS-first / GSAP 非依存の思想に合致）。

### 実装方式

- `animation-timeline: view()` + `@keyframes` で scroll 進行に連動して transform を動かす。
- 方向 utility: `umn-parallax-up`（デフォルト） / `-down` / `-left` / `-right`。translateY/X の軸と符号を切替。
- 速度: プリセット utility `umn-parallax-slow` / `-fast` + 任意値 `--umn-parallax-speed`（デフォルト値は `variables.css` に定義）。
- `@supports (animation-timeline: view())` でラップ → 未対応ブラウザ（Firefox 等）は視差なしの通常表示に degrade。
- `@media (prefers-reduced-motion: reduce)` で無効化。

### CSS（effects.css / utilities.css / variables.css）

```css
/* variables.css */
:root { --umn-parallax-speed: 0.15; }

/* effects.css */
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .umn-parallax {
      animation: umn-parallax-up linear both;
      animation-timeline: view();
      animation-range: cover 0% cover 100%;
    }
    @keyframes umn-parallax-up { /* translateY(+) -> translateY(-) を speed でスケール */ }
    /* down/left/right 用 keyframes を用意し、方向 utility で animation-name を差し替え */
  }
}

/* utilities.css */
.umn-parallax-down  { animation-name: umn-parallax-down; }
.umn-parallax-left  { animation-name: umn-parallax-left; }
.umn-parallax-right { animation-name: umn-parallax-right; }
.umn-parallax-slow  { --umn-parallax-speed: 0.08; }
.umn-parallax-fast  { --umn-parallax-speed: 0.3; }
```

（keyframes の translate 量は `calc(var(--umn-parallax-speed) * <base>)` でスケールする。utility は @supports 内でも有効になるよう配置を調整する。）

### ファイル

- `src/css/variables.css`: `--umn-parallax-speed` デフォルト追加。
- `src/css/effects.css`: parallax 本体 + 方向別 keyframes。
- `src/css/utilities.css`: 方向・速度 utility。
- JS 変更なし。

---

## 設計原則の変更（CLAUDE.md）

- 「追加してはいけないもの」の **text reveal** を書き換える:
  > text reveal は原則追加しない。ただし typing effect（`umn-typing`）に限り、JS による char 分割・カーソル駆動を例外として許可する。行分割・単語分割による text reveal は引き続き追加しない。
- 「clip-path 系は v0.1 範囲外」は据え置き（parallax は transform のみで clip-path 不使用）。
- 「JS 無効時の安全設計」節は変更なし（typing も `html.umn-ready` 配下のみ初期非表示で原則を守る）。

---

## 更新が必要な箇所（まとめ）

- `src/ts/typing.ts`（新規）
- `src/ts/constants.ts`（typing 用セレクタ定数追加）
- `src/index.ts`（typing の init/refresh/destroy 統合）
- `src/css/effects.css`（typing / parallax CSS）
- `src/css/utilities.css`（parallax 方向・速度 utility、typing 速度 utility）
- `src/css/variables.css`（`--umn-parallax-speed` / `--umn-typing-speed` デフォルト）
- `CLAUDE.md`（text reveal 例外の明記）
- `README.md`（class 一覧に typing / parallax 追加）
- `examples/index.html`（デモ追加）

## 非対象（YAGNI）

- 行分割・単語分割の text reveal。
- parallax の JS fallback（scroll-driven 未対応時は degrade のみ）。
- typing のループ再生・逆再生・削除アニメ。
- clip-path 系 reveal。
