# umn-repeat（once: false相当）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 要素に `umn-repeat` class を付けると、スクロールで画面内に入るたびに `is-visible` が付与され、画面外に出ると除去される（デフォルトの「一度表示したら戻らない」挙動の例外）。

**Architecture:** `src/ts/observer.ts` の `onIntersect()` に分岐を追加する。同一の `IntersectionObserver` インスタンスを使い回し、`entry.target` が `umn-repeat` を持つかどうかで「unobserveして終了」か「監視継続でトグル」かを切り替える。observerインスタンスは増やさない。

**Tech Stack:** Vite + TypeScript（ビルド）、plain CSS。テストフレームワークは存在しないプロジェクトのため、各タスクの検証は `npm run typecheck` / `npm run build` とコードトレースによる目視確認で行う。

## Global Constraints

- class prefix は `umn-` 固定（spec: 2026-07-01-repeat-option-design.md）
- data 属性は使わない
- base class は作らない
- `window.Umination.init/refresh/destroy` のシグネチャは変更しない
- `umn-repeat` を持たない要素の挙動は変更しない（交差時に `is-visible` 付与 → 即 `unobserve`）
- `umn-repeat` を持つ要素は `unobserve` せず監視を継続し、`isIntersecting` に応じて `is-visible` をトグルする
- 同一の `IntersectionObserver` インスタンスを使い回す（observerを2つに増やさない）
- CSSの追加変更は不要（`umn-repeat` はJS側の分岐フラグとしてのみ使う）
- stagger（`applyStagger()`）・MutationObserver（`mutation-watcher.ts`）は無変更で共存する

---

### Task 1: `UMINATION_REPEAT_CLASS` 定数追加と `onIntersect()` の分岐実装

**Files:**
- Modify: `src/ts/constants.ts`
- Modify: `src/ts/observer.ts`

**Interfaces:**
- Consumes: なし
- Produces: `UMINATION_REPEAT_CLASS: string`（`observer.ts` 内でのみ使用。他タスクからの追加消費なし）。`onIntersect()` の内部分岐ロジック変更（`initObserver()`/`refreshObserver()`/`destroyObserver()` の外部シグネチャは無変更）

- [ ] **Step 1: `src/ts/constants.ts` に `UMINATION_REPEAT_CLASS` を追加**

現在のファイル全体（`src/ts/constants.ts`）:

```ts
export const UMINATION_READY_CLASS = 'umn-ready'
export const UMINATION_VISIBLE_CLASS = 'is-visible'
export const UMINATION_STAGGER_CLASS = 'umn-stagger'

export const UMINATION_EFFECT_CLASSES = [
  'umn-fade-in',
  'umn-slide-up',
  'umn-slide-down',
  'umn-slide-left',
  'umn-slide-right',
  'umn-blur-in',
  'umn-scale-in',
] as const

export type UminationEffectClass = typeof UMINATION_EFFECT_CLASSES[number]

export const OBSERVER_OPTIONS: IntersectionObserverInit = {
  root: null,
  rootMargin: '0px 0px -10% 0px',
  threshold: 0.1,
}
```

`UMINATION_STAGGER_CLASS` の直後に1行追加する:

```ts
export const UMINATION_READY_CLASS = 'umn-ready'
export const UMINATION_VISIBLE_CLASS = 'is-visible'
export const UMINATION_STAGGER_CLASS = 'umn-stagger'
export const UMINATION_REPEAT_CLASS = 'umn-repeat'
```

- [ ] **Step 2: 現状の `src/ts/observer.ts` 全体を確認**

```ts
import {
  UMINATION_EFFECT_CLASSES,
  UMINATION_READY_CLASS,
  UMINATION_VISIBLE_CLASS,
  OBSERVER_OPTIONS,
} from './constants.js'
import { applyStagger } from './stagger.js'
import { initMutationWatcher, destroyMutationWatcher } from './mutation-watcher.js'

let observer: IntersectionObserver | null = null
let initialized = false
const observedElements = new WeakSet<Element>()

function getSelector(): string {
  return UMINATION_EFFECT_CLASSES.map((c) => `.${c}`).join(', ')
}

function onIntersect(entries: IntersectionObserverEntry[]): void {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add(UMINATION_VISIBLE_CLASS)
      observer?.unobserve(entry.target)
    }
  }
}

function createObserver(): IntersectionObserver {
  return new IntersectionObserver(onIntersect, OBSERVER_OPTIONS)
}

export function initObserver(): void {
  if (initialized) return
  initialized = true

  document.documentElement.classList.add(UMINATION_READY_CLASS)
  applyStagger()
  observer = createObserver()

  const elements = document.querySelectorAll(getSelector())
  elements.forEach((el) => {
    observedElements.add(el)
    observer!.observe(el)
  })

  initMutationWatcher(refreshObserver)
}

export function refreshObserver(): void {
  if (!observer) return

  applyStagger()
  const elements = document.querySelectorAll(getSelector())
  elements.forEach((el) => {
    if (!observedElements.has(el)) {
      observedElements.add(el)
      observer!.observe(el)
    }
  })
}

export function destroyObserver(): void {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  initialized = false
  destroyMutationWatcher()
  // is-visible が付いた要素は残す（WeakSet はリセットのみ）
}
```

- [ ] **Step 3: import に `UMINATION_REPEAT_CLASS` を追加し、`onIntersect()` を分岐実装に変更する**

```ts
import {
  UMINATION_EFFECT_CLASSES,
  UMINATION_READY_CLASS,
  UMINATION_VISIBLE_CLASS,
  UMINATION_REPEAT_CLASS,
  OBSERVER_OPTIONS,
} from './constants.js'
import { applyStagger } from './stagger.js'
import { initMutationWatcher, destroyMutationWatcher } from './mutation-watcher.js'

let observer: IntersectionObserver | null = null
let initialized = false
const observedElements = new WeakSet<Element>()

function getSelector(): string {
  return UMINATION_EFFECT_CLASSES.map((c) => `.${c}`).join(', ')
}

function onIntersect(entries: IntersectionObserverEntry[]): void {
  for (const entry of entries) {
    const isRepeat = entry.target.classList.contains(UMINATION_REPEAT_CLASS)

    if (isRepeat) {
      entry.target.classList.toggle(UMINATION_VISIBLE_CLASS, entry.isIntersecting)
      continue
    }

    if (entry.isIntersecting) {
      entry.target.classList.add(UMINATION_VISIBLE_CLASS)
      observer?.unobserve(entry.target)
    }
  }
}

function createObserver(): IntersectionObserver {
  return new IntersectionObserver(onIntersect, OBSERVER_OPTIONS)
}

export function initObserver(): void {
  if (initialized) return
  initialized = true

  document.documentElement.classList.add(UMINATION_READY_CLASS)
  applyStagger()
  observer = createObserver()

  const elements = document.querySelectorAll(getSelector())
  elements.forEach((el) => {
    observedElements.add(el)
    observer!.observe(el)
  })

  initMutationWatcher(refreshObserver)
}

export function refreshObserver(): void {
  if (!observer) return

  applyStagger()
  const elements = document.querySelectorAll(getSelector())
  elements.forEach((el) => {
    if (!observedElements.has(el)) {
      observedElements.add(el)
      observer!.observe(el)
    }
  })
}

export function destroyObserver(): void {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  initialized = false
  destroyMutationWatcher()
  // is-visible が付いた要素は残す（WeakSet はリセットのみ）
}
```

設計メモ（このタスクの実装者向け）:
- `classList.toggle(class, force)` の第2引数に `entry.isIntersecting`（boolean）をそのまま渡すことで、「交差時は付与・非交差時は除去」を1行で表現できる
- `isRepeat` 分岐では `observer?.unobserve()` を呼ばない。これにより監視が継続され、次に画面外へ出た時・再度画面内に入った時にも `onIntersect()` が呼ばれ続ける
- `initObserver()`/`refreshObserver()`/`destroyObserver()` は無変更。`observedElements`（WeakSet）は「一度でも `observe()` した要素」を記録する既存の目的のまま使われ続ける。`umn-repeat` 要素も最初の `observe()` 時にこのSetへ追加されるため、`refreshObserver()` が同じ要素を重複observeすることはない

- [ ] **Step 4: 型チェックとビルドで確認**

Run: `npm run typecheck && npm run build`
Expected: 両方エラー 0。`dist/umination.js` に `umn-repeat` 文字列が同梱されていることを確認する場合は `grep -o "umn-repeat" dist/umination.js` で1件以上ヒットすることを確認する

- [ ] **Step 5: コードトレースによる動作確認**

以下の2つのシナリオを `onIntersect()` の実装を読みながらトレースし、意図通りの分岐になっていることを確認する:

1. `<div class="umn-fade-in">`（`umn-repeat` なし）が画面内に入る → `isRepeat` は `false` → `entry.isIntersecting` が `true` の分岐に入り `is-visible` 付与 + `unobserve()`。その後画面外に出ても `onIntersect()` は呼ばれない（既存動作の維持を確認）
2. `<div class="umn-fade-in umn-repeat">` が画面内に入る → `isRepeat` は `true` → `classList.toggle(UMINATION_VISIBLE_CLASS, true)` で `is-visible` 付与、`unobserve` されない → 画面外に出ると `onIntersect()` が再度呼ばれ `classList.toggle(UMINATION_VISIBLE_CLASS, false)` で `is-visible` 除去 → 再度画面内に入ると付与、を繰り返す

- [ ] **Step 6: Commit**

```bash
git add src/ts/constants.ts src/ts/observer.ts
git commit -m "feat: umn-repeat（スクロールアウトで再非表示）を実装"
```

---

### Task 2: ドキュメント更新（README.md / CLAUDE.md）

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: なし（ドキュメントのみ）
- Produces: なし

- [ ] **Step 1: `README.md` に `## Repeat` セクションを追加**

現状、`README.md` の該当箇所（`## Stagger` セクションの末尾、`## Utility class` の直前）は次のようになっている:

```markdown
対象になるのは直下の子要素のみ。孫要素以下は対象外。

## Utility class
```

`## Stagger` セクションと `## Utility class` の間に、次のセクションを追加する:

```markdown
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
```

- [ ] **Step 2: `README.md` の JS API セクションの `refresh()` 説明の直後に `umn-repeat` との関係を補足**

現状:

```markdown
```js
window.Umination.init()     // 初期化（html に umn-ready を付与、対象要素を監視開始）
window.Umination.refresh()  // 後から追加された要素を再スキャン
window.Umination.destroy()  // observer を解除・内部状態リセット
```

`init()` 実行時、MutationObserver による動的要素の自動検知もデフォルトで有効になる。`document.body` 配下に effect class を持つ要素が追加されると、`refresh()` を手動で呼ばなくても自動でアニメーション対象に加わる。`refresh()` は後方互換として引き続き利用できる（MutationObserverの検知を待たず即時に再スキャンしたい場合に使う）。

ES Module として import することもできる。
```

このコードブロックの後の説明文の直後（`ES Module として import することもできる。` の前）に、次の1文を追加する:

```markdown
```js
window.Umination.init()     // 初期化（html に umn-ready を付与、対象要素を監視開始）
window.Umination.refresh()  // 後から追加された要素を再スキャン
window.Umination.destroy()  // observer を解除・内部状態リセット
```

`init()` 実行時、MutationObserver による動的要素の自動検知もデフォルトで有効になる。`document.body` 配下に effect class を持つ要素が追加されると、`refresh()` を手動で呼ばなくても自動でアニメーション対象に加わる。`refresh()` は後方互換として引き続き利用できる（MutationObserverの検知を待たず即時に再スキャンしたい場合に使う）。

`umn-repeat` を付けた要素は `destroy()` するまで監視され続ける（他の要素のように一度表示されたら `unobserve` されることはない）。

ES Module として import することもできる。
```

- [ ] **Step 3: `CLAUDE.md` の「実行時の流れ」セクションを更新**

現状:

```markdown
### 実行時の流れ（src/index.ts）

1. `index.css` を `?inline` で文字列 import（JSバンドルに同梱するため）と副作用 import（Vite が `dist/umination.css` を別途出力するため）の二重 import をしている
2. `DOMContentLoaded`（または既に読み込み済みなら即時）で `initUmination()` を自動実行
3. `initUmination()` → `injectStyle()` で CSS を head に注入 → `initObserver()` で `html` に `umn-ready` を付与し、`UMINATION_EFFECT_CLASSES` に該当する要素を `IntersectionObserver` で監視開始
4. 交差したら `is-visible` を付与して即 `unobserve`（一度表示したら監視終了、`once` 相当の動作固定）
5. `window.Umination.refresh()` は動的に追加された要素を再スキャンして未観測分のみ observe に追加（`WeakSet` で観測済みを管理）
6. `window.Umination.destroy()` は observer を disconnect するのみ。`is-visible` が付いた要素のクラスは剥がさない
```

4行目を次の内容に置き換える（`umn-repeat` の例外を明記する）:

```markdown
### 実行時の流れ（src/index.ts）

1. `index.css` を `?inline` で文字列 import（JSバンドルに同梱するため）と副作用 import（Vite が `dist/umination.css` を別途出力するため）の二重 import をしている
2. `DOMContentLoaded`（または既に読み込み済みなら即時）で `initUmination()` を自動実行
3. `initUmination()` → `injectStyle()` で CSS を head に注入 → `initObserver()` で `html` に `umn-ready` を付与し、`UMINATION_EFFECT_CLASSES` に該当する要素を `IntersectionObserver` で監視開始
4. 交差したら `is-visible` を付与して即 `unobserve`（一度表示したら監視終了、`once` 相当の動作がデフォルト）。ただし `umn-repeat` class を持つ要素は `unobserve` せず監視を継続し、`isIntersecting` に応じて `is-visible` をトグルする（`src/ts/observer.ts` の `onIntersect()` 内で分岐）
5. `window.Umination.refresh()` は動的に追加された要素を再スキャンして未観測分のみ observe に追加（`WeakSet` で観測済みを管理）
6. `window.Umination.destroy()` は observer を disconnect するのみ。`is-visible` が付いた要素のクラスは剥がさない
```

- [ ] **Step 4: `CLAUDE.md` の「ファイル構成」ツリーを更新**

現状、`src/ts/` のツリーには `stagger.ts`・`mutation-watcher.ts` が未掲載のまま残っている（既存の既知ギャップ）。このタスクのついでに解消する:

```markdown
├─ ts/
│  ├─ constants.ts    定数（UMINATION_EFFECT_CLASSES / UMINATION_READY_CLASS / UMINATION_VISIBLE_CLASS / OBSERVER_OPTIONS）
│  ├─ inject-style.ts CSS 文字列を <style data-umination> として head に注入（重複注入防止）
│  └─ observer.ts     IntersectionObserver 管理（init/refresh/destroy）
```

を次の内容に置き換える:

```markdown
├─ ts/
│  ├─ constants.ts       定数（UMINATION_EFFECT_CLASSES / UMINATION_READY_CLASS / UMINATION_VISIBLE_CLASS / UMINATION_STAGGER_CLASS / UMINATION_REPEAT_CLASS / OBSERVER_OPTIONS）
│  ├─ inject-style.ts    CSS 文字列を <style data-umination> として head に注入（重複注入防止）
│  ├─ stagger.ts         applyStagger() — umn-stagger 配下の直下子要素に自動delay付番
│  ├─ mutation-watcher.ts MutationObserverのdebounceラッパー（initMutationWatcher/destroyMutationWatcher）
│  └─ observer.ts        IntersectionObserver 管理（init/refresh/destroy、umn-repeatの分岐を含む）
```

- [ ] **Step 5: 目視確認**

`README.md` と `CLAUDE.md` をエディタで開き、Markdown のコードフェンスが正しく閉じているか、セクション見出しの階層が壊れていないか、ツリー図のインデントが揃っているかを確認する。

- [ ] **Step 6: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: umn-repeat対応のドキュメントを更新"
```

---

## Self-Review Notes

- **spec カバレッジ:** spec の「決定事項」「実装方針」「変更ファイル一覧」は Task 1〜2 でそれぞれ対応済み。「スコープ外」に明記されたグローバルオプション・reverse専用effectは本計画でも扱わない
- **命名の一貫性:** `UMINATION_REPEAT_CLASS`（Task 1）→ `onIntersect()` 内の `isRepeat` 変数（Task 1）→ ドキュメント上の `umn-repeat` 表記（Task 2）まで表記ゆれなし
- **既存挙動の非破壊確認:** `umn-repeat` を持たない要素の分岐は元のコードと完全に同一のロジック（`if (entry.isIntersecting) { add + unobserve }`）を維持しており、デフォルト挙動への影響はない
- **CLAUDE.md ファイル構成ツリーの既知ギャップ解消:** stagger・MutationObserver実装時のレビューでMinor指摘として残っていた「ツリーに stagger.ts/mutation-watcher.ts が未掲載」の問題を Task 2 でついでに解消する
