# umination

スクロール表示アニメーションライブラリ。effect class 1つ + script 1ファイルで動作する。GSAP 非依存・data属性なし・base class なし。

## script 1ファイルで使える

```html
<script type="module" src="/dist/umination.js"></script>

<h2 class="umn-slide-up">Heading</h2>
<p class="umn-fade-in">Text</p>
<img class="umn-blur-in" src="/image.jpg" alt="">
```

CSS も自動注入される。別途 `<link>` は不要。

## CSS のみで使う場合

```html
<link rel="stylesheet" href="/dist/umination.css">
```

この場合、JS による `html.umn-ready` 付与がないため初期非表示ルールは適用されない（= 要素は常に表示状態）。

## 対応 effect class

| class | 動作 |
|---|---|
| `umn-fade-in` | フェードイン |
| `umn-slide-up` | 下から上へスライド |
| `umn-slide-down` | 上から下へスライド |
| `umn-slide-left` | 右から左へスライド |
| `umn-slide-right` | 左から右へスライド |
| `umn-blur-in` | ブラーを解除しながら表示 |
| `umn-scale-in` | スケールアップしながら表示 |

### hover 系（CSS only・JS不要）

| class | 動作 |
|---|---|
| `umn-img-zoom` | コンテナに付けると、hover 時に内側の `img` / `picture > img` が `scale(1.05)` にズーム |
| `umn-hover-lift` | hover 時に box-shadow が拡大し、わずかに浮き上がる |
| `umn-hover-border` | hover 時に `border-color` が変化（デフォルト `currentColor`） |
| `umn-hover-tilt` | hover 時に軽く傾く（デフォルト `-2deg`） |
| `umn-hover-fade` | hover 時に `opacity` が変化（デフォルト `0.7`） |

#### text / line 系

| class | 動作 |
|---|---|
| `umn-hover-underline` | hover 時に下線が左から右へ描画される |
| `umn-hover-underline-center` | hover 時に下線が中央から左右に広がる |
| `umn-hover-underline-thick` | hover 時に下線の太さ・余白（`text-decoration-thickness` / `text-underline-offset`）が変化 |
| `umn-hover-underline-sweep` | hover 時に下線がグラデーションで色替えしながら現れる |
| `umn-hover-text-color` | hover 時に文字色のみ変化（背景・枠線は不変。`umn-hover-fade` は要素全体、こちらは文字色限定） |
| `umn-hover-tracking` | hover 時に字間（`letter-spacing`）が開く |
| `umn-hover-strike` | hover 時に打ち消し線が左から右へ描画される |

#### ボタン / 汎用コンテナ系

| class | 動作 |
|---|---|
| `umn-hover-fill` | hover 時に背景が左から塗りつぶされる（デフォルト `CanvasText`。hover 時に `color` を変更しても塗りつぶし色が引きずられない） |
| `umn-hover-invert` | hover 時に `filter: invert(1)` で色が反転する |
| `umn-hover-frame` | hover 時に内枠（inset box-shadow）が `currentColor` で太くなる |
| `umn-hover-outline` | hover 時に `outline` が `outline-offset` 分浮き上がるように広がる |
| `umn-hover-press` | hover で拡大、`:active`（押下）で縮小する |
| `umn-hover-ring` | hover 時に focus-ring 風の柔らかい輪郭（box-shadow）が広がる |
| `umn-hover-scale` | hover 時にコンテナ全体がわずかに拡大する |

#### 矢印・アイコン付与系（リンク / ボタン共通）

| class | 動作 |
|---|---|
| `umn-hover-arrow` | 末尾に矢印（`→`）を自動付与し、hover で右へ動かす |
| `umn-hover-arrow-in` | 矢印が隠れた状態から hover で出現する |
| `umn-hover-arrow-rotate` | 末尾のアイコン（`↗`）が hover で45度回転する（外部リンク等） |

#### リンク / ナビ系

| class | 動作 |
|---|---|
| `umn-hover-bracket` | テキスト前後に括弧 `[ ]` が hover で出現する |
| `umn-hover-nav-highlight` | hover で背景ハイライトが左から広がる（ナビ項目向け） |
| `umn-hover-bounce` | hover で一度だけ弾む |
| `umn-hover-push` | hover でわずかに押し出されつつ薄くなる |

#### カード / コンテナ系

| class | 動作 |
|---|---|
| `umn-hover-overlay` | hover で暗い overlay が現れる（`umn-img-zoom` と異なり画像以外のコンテナにも使用可） |
| `umn-hover-corner` | hover で左上に L字コーナーアクセントが現れる |
| `umn-hover-saturate` | hover で彩度・明度がわずかに上がる |
| `umn-hover-content-lift` | コンテナ直下の**最後の子要素のみ**が hover で浮く |
| `umn-hover-reveal` | コンテナ直下の**最後の子要素**が hover でスライドインしながら現れる |

### スクロール誘導系（CSS only・JS不要）

常時ループするスクロール誘導インジケーター。IntersectionObserver を使わず `:hover` も使わない、純粋な `animation` ループ。配置（`position: fixed` など）は利用側の責務で、ライブラリは形状と動きのみ提供する。

| class | 動作 |
|---|---|
| `umn-scroll-mouse` | マウス型の枠内でドットが上下にループ |
| `umn-scroll-chevron` | V字の矢印が下方向へ流れる |
| `umn-scroll-line` | 縦ラインの中を短いセグメントが流れる |
| `umn-scroll-text` | テキスト＋下の縦ラインが流れる（テキストは要素の中身として記述する） |

```html
<div class="umn-scroll-mouse" style="position: fixed; bottom: 32px; left: 50%;"></div>

<div class="umn-scroll-text" style="position: fixed; bottom: 32px; left: 50%;">
  Scroll
</div>
```

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

```html
<a href="#" class="umn-hover-underline umn-hover-arrow">
  Read more
</a>
```

`umn-hover-border` を使う場合、要素に `border`（`border-width`/`border-style`）を別途指定する必要がある（uminationは border の太さ・スタイルを強制しない、色の変化のみを提供する）。

`umn-hover-lift`/`umn-hover-tilt`/`umn-hover-scale`/`umn-hover-press` はコンテナ自身に `transform` を適用するため、`umn-slide-*`/`umn-scale-in` のようなtransform系のスクロール表示effectと同じ要素に組み合わせると、hover時のtransformがスクロール表示時のtransformを上書きする場合がある。

`umn-hover-underline` 系（`umn-hover-underline` / `umn-hover-underline-center` / `umn-hover-underline-sweep` / `umn-hover-strike`）と `umn-hover-bracket` / `umn-hover-nav-highlight` は `::before` を使用するため、これらを同じ要素に複数組み合わせることはできない（後に定義された規則が上書きする）。`umn-hover-arrow` 系は `::after` を使用するため、`umn-hover-underline` 系とは組み合わせ可能。

`umn-hover-content-lift` / `umn-hover-reveal` は、対象要素直下の**最後の子要素**（`:last-child`）にのみ効果を適用する。`umn-hover-reveal` は子要素があらかじめ `position: absolute` 等で表示位置を用意しておく前提（本クラスは opacity / transform の切り替えのみを担う）。

`umn-hover-fill` の塗りつぶし色（デフォルト `CanvasText`）は `--umn-hover-fill-color` で上書きできる。hover 時のテキストの可読性（コントラスト）は利用側で調整する必要がある（例: `:hover` で `color` を明示的に指定する）。

## Stagger

親要素に `umn-stagger` class を付けると、直下の子要素（effect class を持つもの）に自動で連番の delay が付与される。

```html
<div class="umn-stagger">
  <div class="umn-fade-in">1</div>
  <div class="umn-fade-in">2</div>
  <div class="umn-fade-in">3</div>
</div>
```

刻み幅は `--umn-stagger-step`（デフォルト `0.1s`）で調整できる。

```html
<div class="umn-stagger" style="--umn-stagger-step: 0.2s;">
  ...
</div>
```

子要素に `umn-delay-*` utility class が明示的に付いている場合は、そちらが自動付番より優先される。

```html
<div class="umn-stagger">
  <div class="umn-fade-in">1</div>
  <div class="umn-fade-in umn-delay-1000">2（手動delayが優先される）</div>
  <div class="umn-fade-in">3</div>
</div>
```

対象になるのは直下の子要素のみ。孫要素以下は対象外。

## Repeat

デフォルトでは、一度表示された要素は画面外に出ても再度非表示に戻らない。要素に `umn-repeat` class を追加すると、スクロールで画面内に入るたびに表示され、画面外に出ると再度非表示に戻る。

```html
<div class="umn-fade-in umn-repeat">
  スクロールで出入りするたびに表示・非表示が切り替わる
</div>
```

`umn-repeat` は他の effect class と組み合わせて使う utility。単体では効果を持たない。

## Utility class

### delay

| class | 値 |
|---|---|
| `umn-delay-100` | 0.1s |
| `umn-delay-200` | 0.2s |
| `umn-delay-300` | 0.3s |
| `umn-delay-400` | 0.4s |
| `umn-delay-500` | 0.5s |
| `umn-delay-700` | 0.7s |
| `umn-delay-1000` | 1s |

### duration

| class | 値 |
|---|---|
| `umn-duration-fast` | 0.4s |
| `umn-duration-normal` | 0.8s（デフォルト相当） |
| `umn-duration-slow` | 1.4s |

### ease

| class | 値 |
|---|---|
| `umn-ease-soft` | cubic-bezier(0.25, 0.46, 0.45, 0.94) |
| `umn-ease-out` | cubic-bezier(0, 0, 0.2, 1) |
| `umn-ease-snappy` | cubic-bezier(0.4, 0, 0.2, 1) |

## CSS variables

各要素の `style` 属性で上書き可能。

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
  --umn-hover-underline-color: currentColor;
  --umn-hover-underline-sweep-color: currentColor;
  --umn-hover-fill-color: CanvasText;
  --umn-hover-text-color: color-mix(in srgb, currentColor 55%, transparent);
  --umn-hover-tracking: 0.08em;
  --umn-hover-scale: 1.03;
  --umn-hover-press-scale: 1.04;
  --umn-hover-press-scale-active: 0.96;
  --umn-hover-outline-offset: 4px;
  --umn-hover-ring-width: 4px;
  --umn-hover-frame-width: 2px;
  --umn-hover-overlay-color: rgba(0, 0, 0, 0.35);
  --umn-hover-corner-size: 16px;
  --umn-hover-content-lift-distance: -4px;
  --umn-hover-reveal-distance: 12px;
  --umn-hover-push-distance: 4px;
  --umn-hover-bounce-distance: -6px;
  --umn-hover-arrow-distance: 4px;
  --umn-scroll-color: currentColor;
  --umn-scroll-duration: 1.6s;
  --umn-scroll-size: 26px;
}
```

```html
<div
  class="umn-slide-up"
  style="--umn-distance: 40px; --umn-duration: 1.2s;"
>
  Content
</div>
```

## JS API

```html
<script type="module" src="/dist/umination.js"></script>
```

読み込み後 `window.Umination` でアクセスできる。

```js
window.Umination.init()     // 初期化（html に umn-ready を付与、対象要素を監視開始）
window.Umination.refresh()  // 後から追加された要素を再スキャン
window.Umination.destroy()  // observer を解除・内部状態リセット
```

`init()` 実行時、MutationObserver による動的要素の自動検知もデフォルトで有効になる。`document.body` 配下に effect class を持つ要素が追加されると、`refresh()` を手動で呼ばなくても自動でアニメーション対象に加わる。`refresh()` は後方互換として引き続き利用できる（MutationObserverの検知を待たず即時に再スキャンしたい場合に使う）。

`umn-repeat` を付けた要素は `destroy()` するまで監視され続ける（他の要素のように一度表示されたら `unobserve` されることはない）。

ES Module として import することもできる。

```js
import { initUmination, refreshUmination, destroyUmination, UMINATION_EFFECT_CLASSES } from '@umi-design/umination'
```

## JS 無効時の考え方

初期非表示ルールは `html.umn-ready` が付いている場合のみ有効。JS が無効なら `umn-ready` が付かないので、要素は通常通り表示される。コンテンツが見えなくなる心配はない。

## prefers-reduced-motion 対応

`prefers-reduced-motion: reduce` が設定されている環境では、transition を無効化し全要素を即時表示する。

## npm package

```
@umi-design/umination
```

## v0.1 の範囲

- GSAP 非依存
- reset / layout / color / typography は含まない
- アニメーション・transition・motion 関連のみ
- text reveal・clip-path 系は含まない（hover 系は `:hover` のみで完結する CSS only effect、スクロール誘導系は常時ループする CSS only effect に限り対応済み。上記「hover 系」「スクロール誘導系」参照）
