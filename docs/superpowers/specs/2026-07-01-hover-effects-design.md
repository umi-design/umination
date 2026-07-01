# Hover Effects（umn-hover-*）設計

## 目的

`umination` v0.2 候補の一つ。ユーザーからの要望で、CSS `:hover` のみで完結するhover effectを追加する。既存の `umn-img-zoom`（`src/css/effects.css`）と同じ設計思想（JS不要、`prefers-reduced-motion` で無効化）を踏襲する。

## 前提・制約

CLAUDE.mdの既存の設計原則により、hover系は「`:hover` のみで完結するCSS only effect」に限り許可されている。IntersectionObserver・JS側の状態管理を伴うhover系は禁止のまま変更しない。今回追加する4つの効果はすべてこの制約内に収まる。

## 決定事項

- 命名規則は `umn-hover-*` に統一する（`umn-hover-lift` / `umn-hover-border` / `umn-hover-tilt` / `umn-hover-fade`）。既存の `umn-img-zoom` とは命名パターンが異なるが、今後hover系が増えても一目で分かるようにする
- 4種類の効果を追加する:
  - `umn-hover-lift`: hover時に `box-shadow` 拡大 + `translateY(-4px)` で浮き上がる
  - `umn-hover-border`: hover時に `border-color` が変化（デフォルト `currentColor`、要素の `style` 属性で `--umn-hover-border-color` を上書き可能）
  - `umn-hover-tilt`: hover時に `rotate(-2deg)` で軽く傾く
  - `umn-hover-fade`: hover時に `opacity` が変化（デフォルト `0.7`）。colorそのものは定義しない（color utilityにはしない、単一effectとしての opacity トグルに限定する）
- 新規CSS変数を追加する: `--umn-hover-shadow` / `--umn-hover-lift-distance` / `--umn-hover-border-color` / `--umn-hover-tilt-deg` / `--umn-hover-opacity`。transitionのduration/easingは新規変数を作らず既存の `--umn-duration`/`--umn-ease` を流用する
- 既存のスクロール系effect class（`umn-fade-in` 等）や `umn-img-zoom` と組み合わせて使える。複数のhover effectの同時使用（例: `umn-hover-lift umn-hover-border`）も制限しない
- `prefers-reduced-motion: reduce` では `umn-img-zoom` と同様にtransitionを無効化する（hover時の見た目の変化自体は残ってよいが、アニメーションなしの瞬時切り替えにする）
- JS側の変更は一切なし。`src/ts/constants.ts` の `UMINATION_EFFECT_CLASSES` には追加しない（IntersectionObserverの監視対象外という点で `umn-img-zoom` と同じ扱い）

## HTML例

```html
<div class="umn-hover-lift">
  hoverで浮き上がる
</div>

<button class="umn-hover-border">
  hoverで枠線が変化するボタン
</button>

<div class="umn-fade-in umn-hover-tilt">
  スクロールで表示 + hoverで傾く
</div>
```

## CSS変数（デフォルト値）

```css
:root {
  --umn-hover-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  --umn-hover-lift-distance: -4px;
  --umn-hover-border-color: currentColor;
  --umn-hover-tilt-deg: -2deg;
  --umn-hover-opacity: 0.7;
}
```

## 実装方針

- `src/css/variables.css` に上記5つのCSS変数を追加
- `src/css/effects.css` に4つの `umn-hover-*` ブロックを追加。各ブロックは `umn-img-zoom` の実装パターン（対象class自体に `transition` を持たせ、`:hover` 時にtransformやその他プロパティを変化させる。`@media (prefers-reduced-motion: reduce)` でtransitionを無効化）を踏襲する

## 変更ファイル一覧

- `src/css/variables.css` — 新規CSS変数5つ追加
- `src/css/effects.css` — `umn-hover-lift`/`umn-hover-border`/`umn-hover-tilt`/`umn-hover-fade` の4ブロック追加
- `README.md` — hover effectsの使い方セクション追加（既存の「hover 系（CSS only・JS不要）」セクションに追記する形）
- `CLAUDE.md` — 「追加してはいけないもの」の hover系例外の記述を `umn-img-zoom` のみから `umn-hover-*` も含む形に更新

## スコープ外

- JS側の状態管理を伴うhover系は導入しない（既存のCLAUDE.md禁止事項を維持）
- `umn-hover-fade` のopacity先の色そのもの（背景色パレット等）は定義しない。color utilityは導入しない
- hover effectのdelay/duration個別utility（`umn-hover-duration-*` 等）は導入しない。既存の `--umn-duration`/`--umn-ease` をそのまま使う
