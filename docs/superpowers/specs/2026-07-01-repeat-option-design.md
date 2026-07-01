# once: false（umn-repeat）対応 設計

## 目的

`umination` v0.2 候補の一つ。デフォルトでは一度表示された要素は二度と非表示に戻らないが、要素単位で「スクロールアウトで再度非表示に戻す」挙動をオプトインできるようにする。

## 決定事項

- 指定方法は要素単位の新規class `umn-repeat`。`init()` のオプション引数などグローバル設定は追加しない（`window.Umination.init/refresh/destroy` のシグネチャ変更なし）
- 使い方は既存の delay/duration/ease utility と同じ「effect classと組み合わせて使う」パターン: `class="umn-fade-in umn-repeat"`
- `umn-repeat` を持つ要素は `IntersectionObserver` の `unobserve` を行わず監視を継続する。`isIntersecting === true` で `is-visible` を付与、`isIntersecting === false` で `is-visible` を除去する
- `umn-repeat` を持たない要素（デフォルト）は既存通り、交差時に `is-visible` 付与 → 即 `unobserve`。この挙動は変更しない
- 同一の `IntersectionObserver` インスタンスを使い回す。`onIntersect()` 内で `umn-repeat` の有無により分岐する（observerインスタンスを2つに増やさない）
- `observedElements`（WeakSet）は「一度でも `observe()` した要素」を記録する既存の目的のまま使う。`umn-repeat` 要素も一度observeされたら記録され、`refreshObserver()` からの重複observe対象にはならない（監視自体は継続しているため問題ない）
- CSSの追加変更は不要。`umn-repeat` はJS側の分岐フラグとしてのみ使う。`is-visible` の付外に対する見た目の変化は既存の `effects.css`/`base.css` のtransitionがそのまま効く
- `prefers-reduced-motion: reduce` 環境では `base.css` が `opacity: 1 !important` 等で強制表示するため、`umn-repeat` によるトグルも自動的に見た目に影響しなくなる（追加対応不要）
- stagger（`applyStagger()`）・MutationObserver（`mutation-watcher.ts`）との相互作用はなし。両者ともobserver挙動そのものには関与しないため無変更で共存する

## HTML例

```html
<div class="umn-fade-in umn-repeat">
  スクロールで出入りするたびに表示・非表示が切り替わる
</div>
```

## 実装方針

- `src/ts/constants.ts` に `UMINATION_REPEAT_CLASS = 'umn-repeat'` を追加
- `src/ts/observer.ts` の `onIntersect()` を変更し、`entry.target` が `umn-repeat` を持つかどうかで分岐する:
  - 持たない場合: 既存通り `isIntersecting` の時のみ `is-visible` 付与 + `unobserve`
  - 持つ場合: `unobserve` せず、`isIntersecting` に応じて `is-visible` の付与/除去をトグルする

## 変更ファイル一覧

- `src/ts/constants.ts` — `UMINATION_REPEAT_CLASS` 追加
- `src/ts/observer.ts` — `onIntersect()` に分岐追加
- `README.md` — `umn-repeat` の使い方セクション追加
- `CLAUDE.md` — 「IntersectionObserverでis-visible付与、一度でunobserve」という既存の設計原則の記述を、`umn-repeat` の例外があることが分かるように更新

## スコープ外

- グローバルなonce/repeat切り替えオプション（`init()` の引数等）は導入しない
- スクロールアウト時のアニメーション方向をenter時と変える機能（reverse専用の別effect）は導入しない。既存のtransitionをそのまま逆再生する挙動のみ
