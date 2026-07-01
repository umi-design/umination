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

`umn-img-zoom` は scroll 表示 effect（`umn-fade-in` 等）と組み合わせて使える。

```html
<div class="umn-scale-in umn-img-zoom">
  <img src="/image.jpg" alt="">
</div>
```

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
- hover 系・text reveal・clip-path 系は含まない
