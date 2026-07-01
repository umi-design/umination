# MutationObserver 対応 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `init()` 実行時に MutationObserver をデフォルトで有効化し、動的に追加された要素を `refresh()` の手動呼び出しなしで自動検知してアニメーション対象に加える。

**Architecture:** 新規 `src/ts/mutation-watcher.ts` に汎用的な「debounce付きMutationObserverラッパー」を実装し、`observer.ts` から `initMutationWatcher(refreshObserver)` として呼び出す。`mutation-watcher.ts` はeffect classやstaggerを一切知らずコールバックを受け取るだけなので、`observer.ts → mutation-watcher.ts` の一方向依存になり循環importが起きない。

**Tech Stack:** Vite + TypeScript（ビルド）、plain CSS。テストフレームワークは存在しないプロジェクトのため、各タスクの検証は `npm run typecheck` / `npm run build` と目視確認で行う。

## Global Constraints

- class prefix は `umn-` 固定（spec: 2026-07-01-mutation-observer-design.md）
- data 属性は使わない
- base class は作らない
- `window.Umination.init/refresh/destroy` のシグネチャは変更しない
- MutationObserver はデフォルトで有効化する（opt-inオプションは設けない）
- 監視範囲は `document.body` 全体、`{ childList: true, subtree: true }` 固定（利用者が指定するopt-inセレクタ方式は導入しない）
- DOM変更検知は `queueMicrotask()` で同一tickの複数mutationを1回の再スキャンに集約する（固定時間debounceは導入しない）
- `window.Umination.refresh()` は後方互換として引き続き公開する
- `destroyUmination()` 実行時は IntersectionObserver と同時に MutationObserver も disconnect する
- `attributes`（class変更）の監視は行わない。`childList`（要素の追加）のみを対象とする

---

### Task 1: `mutation-watcher.ts` の実装

**Files:**
- Create: `src/ts/mutation-watcher.ts`

**Interfaces:**
- Consumes: なし（DOM標準APIのみ）
- Produces: `initMutationWatcher(onMutate: () => void): void`, `destroyMutationWatcher(): void`（Task 2 の `observer.ts` が import して使用）

- [ ] **Step 1: `src/ts/mutation-watcher.ts` を新規作成**

```ts
let observer: MutationObserver | null = null
let scheduled = false

export function initMutationWatcher(onMutate: () => void): void {
  if (observer) return

  observer = new MutationObserver(() => {
    if (scheduled) return
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      onMutate()
    })
  })

  observer.observe(document.body, { childList: true, subtree: true })
}

export function destroyMutationWatcher(): void {
  observer?.disconnect()
  observer = null
  scheduled = false
}
```

設計メモ（このタスクの実装者向け）:
- `initMutationWatcher()` は `observer` が既に存在する場合は何もしない（`observer.ts` の `initObserver()` が二重呼び出しされてもMutationObserverが二重生成されないようにするガード）
- `onMutate` はコールバック引数として受け取るだけで、このファイルは effect class・stagger・observer.ts の内部実装を一切知らない。汎用的な「debounce付き変更検知」モジュールとして独立させる
- `scheduled` フラグにより、同一マイクロタスクtick内に複数回mutationイベントが発火しても `onMutate()` は1回しか呼ばれない

- [ ] **Step 2: 型チェックで確認**

Run: `npm run typecheck`
Expected: エラー 0（`mutation-watcher.ts` は他ファイルから未参照のためこの時点ではただの新規ファイル追加。型エラーは発生しない）

- [ ] **Step 3: Commit**

```bash
git add src/ts/mutation-watcher.ts
git commit -m "feat: MutationObserverのdebounceラッパーを実装"
```

---

### Task 2: `observer.ts` への配線

**Files:**
- Modify: `src/ts/observer.ts`

**Interfaces:**
- Consumes: `initMutationWatcher(onMutate: () => void): void`, `destroyMutationWatcher(): void`（Task 1 の `./mutation-watcher.js` から import）
- Produces: `initObserver()`/`destroyObserver()` の内部動作変更のみ。外部シグネチャ（`initObserver(): void` / `refreshObserver(): void` / `destroyObserver(): void`）は変更なし

- [ ] **Step 1: 現状の `src/ts/observer.ts` 全体を確認**

```ts
import {
  UMINATION_EFFECT_CLASSES,
  UMINATION_READY_CLASS,
  UMINATION_VISIBLE_CLASS,
  OBSERVER_OPTIONS,
} from './constants.js'
import { applyStagger } from './stagger.js'

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
  // is-visible が付いた要素は残す（WeakSet はリセットのみ）
}
```

- [ ] **Step 2: import に `initMutationWatcher`/`destroyMutationWatcher` を追加し、`initObserver()` 末尾と `destroyObserver()` 末尾で呼び出す**

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

設計メモ（このタスクの実装者向け）:
- `initMutationWatcher(refreshObserver)` は `initObserver()` の最後、`elements.forEach` の後に置く。初回スキャンが終わった後にMutationObserverを起動する順序を守ることで、初期表示要素の二重処理を避ける
- `refreshObserver` は同ファイル内で後から宣言されているが、TypeScript/JavaScriptの関数宣言（`export function refreshObserver() {...}`）はホイスティングされるため、`initObserver()` 内で参照しても問題ない
- `destroyMutationWatcher()` は `destroyObserver()` 内のコメント行（`// is-visible が付いた要素は残す...`）の直前に置く

- [ ] **Step 3: 型チェックとビルドで確認**

Run: `npm run typecheck && npm run build`
Expected: 両方エラー 0。`dist/umination.js` に `mutation-watcher` 由来のコードが同梱されていることを確認する場合は `grep -o "MutationObserver" dist/umination.js` で1件以上ヒットすることを確認する

- [ ] **Step 4: 動的追加要素の検知を目視確認**

Run: `npm run build && npm run preview` でプレビューサーバーを起動し、ブラウザの開発者ツールコンソールで以下を実行する:

```js
const el = document.createElement('div')
el.className = 'umn-fade-in'
el.textContent = 'dynamic'
el.style.cssText = 'height:100px;background:#eee;margin-top:20px;'
document.body.appendChild(el)
```

Expected: `refresh()` を手動で呼ばなくても、追加した要素の親（`html`）に既に `umn-ready` が付いているため、要素はスクロールで画面内に入ると `is-visible` が自動で付与される（devtoolsのElementsパネルで確認）。`umn-stagger` 配下に子要素を追加した場合も、追加した要素に `--umn-delay` が自動で設定されることを合わせて確認する。

- [ ] **Step 5: Commit**

```bash
git add src/ts/observer.ts
git commit -m "feat: initObserver/destroyObserver から MutationObserver を配線"
```

---

### Task 3: ドキュメント更新（README.md / CLAUDE.md）

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: なし（ドキュメントのみ）
- Produces: なし

- [ ] **Step 1: `README.md` の JS API セクションに MutationObserver の説明を追加**

現状、`README.md` の該当箇所は次のようになっている:

```markdown
```js
window.Umination.init()     // 初期化（html に umn-ready を付与、対象要素を監視開始）
window.Umination.refresh()  // 後から追加された要素を再スキャン
window.Umination.destroy()  // observer を解除・内部状態リセット
```
```

このコードブロックの直後（`ES Module として import することもできる。` の前）に、次の説明を追加する:

```markdown
```js
window.Umination.init()     // 初期化（html に umn-ready を付与、対象要素を監視開始）
window.Umination.refresh()  // 後から追加された要素を再スキャン
window.Umination.destroy()  // observer を解除・内部状態リセット
```

`init()` 実行時、MutationObserver による動的要素の自動検知もデフォルトで有効になる。`document.body` 配下に effect class を持つ要素が追加されると、`refresh()` を手動で呼ばなくても自動でアニメーション対象に加わる。`refresh()` は後方互換として引き続き利用できる（MutationObserverの検知を待たず即時に再スキャンしたい場合に使う）。

ES Module として import することもできる。
```

- [ ] **Step 2: `README.md` の「v0.1 の範囲」セクションから MutationObserver の除外記述を削除**

現状:

```markdown
## v0.1 の範囲

- GSAP 非依存
- reset / layout / color / typography は含まない
- アニメーション・transition・motion 関連のみ
- hover 系・text reveal・clip-path 系は含まない
- MutationObserver（動的要素の自動追跡）は含まない
```

次の内容に置き換える（MutationObserverの行を削除。既にサポート済みの機能をv0.1の除外リストに残すと矛盾するため）:

```markdown
## v0.1 の範囲

- GSAP 非依存
- reset / layout / color / typography は含まない
- アニメーション・transition・motion 関連のみ
- hover 系・text reveal・clip-path 系は含まない
```

- [ ] **Step 3: `CLAUDE.md` の「追加してはいけないもの」から MutationObserver の行を削除**

現状:

```markdown
## 追加してはいけないもの

- layout utility（`.umn-flex`, `.umn-grid` 等）
- reset CSS
- color utility
- typography utility
- text reveal
- clip-path 系（v0.1 範囲外）
- MutationObserver による動的検出（v0.1 範囲外）
- GSAP 依存

hover 系は `umn-img-zoom`（`:hover` のみで完結する CSS only effect）に限り例外として許可。IntersectionObserver・JS 側の状態管理を伴う hover 系は追加しない。
```

次の内容に置き換える（`MutationObserver による動的検出（v0.1 範囲外）` の行を削除）:

```markdown
## 追加してはいけないもの

- layout utility（`.umn-flex`, `.umn-grid` 等）
- reset CSS
- color utility
- typography utility
- text reveal
- clip-path 系（v0.1 範囲外）
- GSAP 依存

hover 系は `umn-img-zoom`（`:hover` のみで完結する CSS only effect）に限り例外として許可。IntersectionObserver・JS 側の状態管理を伴う hover 系は追加しない。MutationObserver による動的要素検知は `init()` 時にデフォルトで有効（`src/ts/mutation-watcher.ts`）。監視範囲は `document.body` 全体固定で、opt-inセレクタ方式は追加しない。
```

- [ ] **Step 4: 目視確認**

`README.md` と `CLAUDE.md` をエディタで開き、Markdown のコードフェンスが正しく閉じているか、セクション見出しの階層が壊れていないかを確認する。

- [ ] **Step 5: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: MutationObserver対応のドキュメントを更新"
```

---

## Self-Review Notes

- **spec カバレッジ:** spec の「実装方針」「変更ファイル一覧」は Task 1〜3 でそれぞれ対応済み。「スコープ外」に明記されたopt-inセレクタ方式・固定時間debounce・attributes監視は本計画でも扱わない
- **命名の一貫性:** `initMutationWatcher`/`destroyMutationWatcher`（Task 1）→ `observer.ts` からの呼び出し（Task 2）まで、関数名の表記ゆれなし。`refreshObserver` は既存の Task 2以前から存在する名称をそのまま使用
- **CLAUDE.md との整合性:** Task 3 で「追加してはいけないもの」からMutationObserverの除外を外し、代わりにMutationObserverの仕様（`document.body`全体固定、opt-inなし）を明記することで、既存の「変更禁止の設計原則」との矛盾を防ぐ
- **循環import の回避:** `mutation-watcher.ts` は `observer.ts` を一切importしない。依存方向は `observer.ts → mutation-watcher.ts` の一方向のみ（Task 1のメモに明記）
