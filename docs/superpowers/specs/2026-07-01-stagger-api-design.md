# stagger API 設計

## 目的

`umination` v0.2 候補の一つ。複数の子要素を順番にずらして表示するstagger演出を、既存の「effect class 1つで動く」設計原則を崩さずに実現する。

## 決定事項

- 親要素に `umn-stagger` class を付けると、直下の子要素（`UMINATION_EFFECT_CLASSES` を持つもの）に対して JS が自動で連番の delay を付与する
- 刻み幅は CSS 変数 `--umn-stagger-step`（デフォルト `0.1s`）で調整可能。要素の `style` 属性で上書きできる（既存の `--umn-duration` 等と同じ運用）
- 子要素に `umn-delay-*` utility class が明示的に付いている場合はそちらを優先し、stagger の自動付番はスキップする
- 対象子要素の判定範囲は `:scope > *` 相当（直下の子要素のみ）。孫要素以下は対象外
- `refresh()` 実行時は `umn-stagger` 親ごとに対象子要素を毎回数え直し、全件を振り直す（冪等処理）
- `destroy()` では stagger による inline style は剥がさない（既存の `is-visible` 保持方針と一致）
- `window.Umination.init/refresh/destroy` のシグネチャ変更なし。`umn-stagger` class を付けるだけで動く

## HTML例

```html
<div class="umn-stagger">
  <div class="umn-fade-in">1</div>
  <div class="umn-fade-in">2</div>
  <div class="umn-fade-in umn-delay-500">3</div> <!-- 手動delayが優先される -->
</div>
```

## CSS変数（`variables.css` に追加）

```css
:root {
  --umn-stagger-step: 0.1s;
}
```

## JS実装方針

- `src/ts/constants.ts` に `UMINATION_STAGGER_CLASS = 'umn-stagger'` を追加
- 新規 `src/ts/stagger.ts` を作成（`observer.ts` とは責務分離）
  - `document.querySelectorAll('.' + UMINATION_STAGGER_CLASS)` で親要素を列挙
  - 各親について `:scope > *` から `UMINATION_EFFECT_CLASSES` のいずれかを持つ直下の子要素のみ抽出
  - 上から順にインデックス `i` を振り、`umn-delay-*` クラスを持たない子要素にのみ
    `el.style.setProperty('--umn-delay', `calc(var(--umn-stagger-step) * ${i})`)` を設定
  - `umn-delay-*` を持つ子要素は skip（inline style を書き込まない）
- `initObserver()` の直前に stagger 付番関数を呼び出す（付番 → observer 監視の順序を保証）
- `refreshObserver()` からも同じ関数を呼び出し、都度全件再計算する

## 変更ファイル一覧

- `src/ts/constants.ts` — `UMINATION_STAGGER_CLASS` 追加
- `src/ts/stagger.ts` — 新規。付番ロジック
- `src/ts/observer.ts` — `initObserver`/`refreshObserver` から stagger 付番を呼び出す
- `src/css/variables.css` — `--umn-stagger-step` 追加
- `README.md` — stagger API の使い方セクション追加
- `CLAUDE.md` — 変更禁止の設計原則には抵触しないため追記不要（`UMINATION_EFFECT_CLASSES` とは別軸の対象クラスのため、既存の「effect class 追加時は constants.ts と README を更新する」ルールの対象外）
- `examples/index.html` — stagger のサンプル追加

## スコープ外

- ネストした `umn-stagger`（親子関係を跨ぐ場合）の挙動保証は行わない（直下の子要素のみ対象という判定ルールにより、ネストしても各階層で独立して動作する想定だが、明示的なテストケースは今回のスコープに含めない）
- stagger 対象要素数の上限・パフォーマンス最適化は行わない（v0.1同様、YAGNI）
