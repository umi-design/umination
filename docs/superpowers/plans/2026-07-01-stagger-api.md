# stagger API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 親要素に `umn-stagger` class を付けるだけで、直下の対象子要素に自動で連番の delay が付与される stagger API を umination に追加する。

**Architecture:** JS 側に新規 `applyStagger()` 関数を追加し、`initObserver()`/`refreshObserver()` の対象要素監視前に呼び出す。CSS 側は新しい変数 `--umn-stagger-step` を1つ追加するのみで、既存の `--umn-delay` の cascade 機構をそのまま利用する（stagger は inline style で `--umn-delay` を書き込むだけ）。

**Tech Stack:** Vite + TypeScript（ビルド）、plain CSS。テストフレームワークは存在しないプロジェクトのため、各タスクの検証は `npm run typecheck` / `npm run build` と `examples/index.html` の目視確認で行う。

## Global Constraints

- class prefix は `umn-` 固定（spec: 2026-07-01-stagger-api-design.md）
- data 属性は使わない
- base class は作らない
- `window.Umination.init/refresh/destroy` のシグネチャは変更しない
- stagger の対象子要素判定は「直下の子要素のみ」（孫要素以下は対象外）
- 子要素に `umn-delay-*` class が付いている場合はそちらを優先し、stagger の自動付番はスキップする（ただしインデックスの消費順は維持する。詳細は Task 2 参照）
- `destroy()` は stagger による inline style を剥がさない（既存の `is-visible` 保持方針と同じ）
- 既存 effect class・delay class の命名・挙動は変更しない

---

### Task 1: 定数追加と CSS 変数追加

**Files:**
- Modify: `src/ts/constants.ts`
- Modify: `src/css/variables.css`

**Interfaces:**
- Consumes: なし
- Produces: `UMINATION_STAGGER_CLASS: string`（Task 2, Task 3 が使用）。CSS 変数 `--umn-stagger-step`（デフォルト `0.1s`、Task 2 の生成する inline style から参照される）

- [ ] **Step 1: `src/ts/constants.ts` に `UMINATION_STAGGER_CLASS` を追加**

現在のファイル全体（`src/ts/constants.ts`）:

```ts
export const UMINATION_READY_CLASS = 'umn-ready'
export const UMINATION_VISIBLE_CLASS = 'is-visible'

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

`UMINATION_READY_CLASS` の直後に1行追加する:

```ts
export const UMINATION_READY_CLASS = 'umn-ready'
export const UMINATION_VISIBLE_CLASS = 'is-visible'
export const UMINATION_STAGGER_CLASS = 'umn-stagger'
```

- [ ] **Step 2: `src/css/variables.css` に `--umn-stagger-step` を追加**

現在のファイル全体:

```css
:root {
  --umn-duration: 0.8s;
  --umn-delay: 0s;
  --umn-distance: 24px;
  --umn-blur: 12px;
  --umn-scale: 0.88;
  --umn-ease: cubic-bezier(0.22, 1, 0.36, 1);
}
```

`--umn-delay` の直後に1行追加する:

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

- [ ] **Step 3: 型チェックで確認**

Run: `npm run typecheck`
Expected: エラー 0（`UMINATION_STAGGER_CLASS` は他ファイルから未参照のためこの時点ではただの定数追加。型エラーは発生しない）

- [ ] **Step 4: Commit**

```bash
git add src/ts/constants.ts src/css/variables.css
git commit -m "feat: stagger API 用の定数とCSS変数を追加"
```

---

### Task 2: `applyStagger()` の実装

**Files:**
- Create: `src/ts/stagger.ts`

**Interfaces:**
- Consumes: `UMINATION_EFFECT_CLASSES: readonly string[]`, `UMINATION_STAGGER_CLASS: string`（`./constants.js` から。Task 1 で定義済み）
- Produces: `applyStagger(): void`（Task 3 の `observer.ts` が import して使用）

- [ ] **Step 1: `src/ts/stagger.ts` を新規作成**

```ts
import { UMINATION_EFFECT_CLASSES, UMINATION_STAGGER_CLASS } from './constants.js'

const DELAY_CLASS_PATTERN = /^umn-delay-\d+$/

function getEffectSelector(): string {
  return UMINATION_EFFECT_CLASSES.map((c) => `.${c}`).join(', ')
}

function hasManualDelay(el: Element): boolean {
  return Array.from(el.classList).some((c) => DELAY_CLASS_PATTERN.test(c))
}

export function applyStagger(): void {
  const parents = document.querySelectorAll<HTMLElement>(`.${UMINATION_STAGGER_CLASS}`)
  const effectSelector = getEffectSelector()

  parents.forEach((parent) => {
    let index = 0
    Array.from(parent.children).forEach((child) => {
      if (!(child instanceof HTMLElement)) return
      if (!child.matches(effectSelector)) return

      if (!hasManualDelay(child)) {
        child.style.setProperty('--umn-delay', `calc(var(--umn-stagger-step) * ${index})`)
      }
      index++
    })
  })
}
```

設計メモ（このタスクの実装者向け）:
- `index` は `umn-delay-*` の有無に関わらず、対象子要素すべてに対してインクリメントする。手動 delay の子要素があっても、以降の要素の段差がずれないようにするため
- `child.matches(effectSelector)` で直下の子要素のうち `UMINATION_EFFECT_CLASSES` を持つものだけを対象にする（孫要素は `parent.children` の時点で含まれないため自然に除外される）
- `hasManualDelay()` は `umn-delay-100` 〜 `umn-delay-1000` のような命名パターンにマッチする。将来 delay class が増減しても、命名規則 `umn-delay-<数値>` を守る限りこの正規表現は追随する

- [ ] **Step 2: 型チェックで確認**

Run: `npm run typecheck`
Expected: エラー 0

- [ ] **Step 3: Commit**

```bash
git add src/ts/stagger.ts
git commit -m "feat: applyStagger() を実装"
```

---

### Task 3: `observer.ts` から `applyStagger()` を呼び出す

**Files:**
- Modify: `src/ts/observer.ts`

**Interfaces:**
- Consumes: `applyStagger(): void`（Task 2 の `./stagger.js` から import）
- Produces: `initObserver()`/`refreshObserver()` の内部動作変更のみ。外部シグネチャ（`initObserver(): void` / `refreshObserver(): void` / `destroyObserver(): void`）は変更なし

- [ ] **Step 1: 現状の `src/ts/observer.ts` 全体を確認**

```ts
import {
  UMINATION_EFFECT_CLASSES,
  UMINATION_READY_CLASS,
  UMINATION_VISIBLE_CLASS,
  OBSERVER_OPTIONS,
} from './constants.js'

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
  observer = createObserver()

  const elements = document.querySelectorAll(getSelector())
  elements.forEach((el) => {
    observedElements.add(el)
    observer!.observe(el)
  })
}

export function refreshObserver(): void {
  if (!observer) return

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

- [ ] **Step 2: import に `applyStagger` を追加し、`initObserver()`/`refreshObserver()` の要素取得の直前に呼び出す**

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

`applyStagger()` は `umn-delay-*` を持たない対象子要素すべてに再度書き込むだけの冪等処理なので、`refreshObserver()` から毎回呼び出しても既存の delay 値を壊さない。

- [ ] **Step 3: 型チェックとビルドで確認**

Run: `npm run typecheck && npm run build`
Expected: 両方エラー 0。`dist/umination.js` に `applyStagger` 由来のコードが同梱されていることを確認する場合は `grep -o "umn-stagger" dist/umination.js` で1件以上ヒットすることを確認する

- [ ] **Step 4: Commit**

```bash
git add src/ts/observer.ts
git commit -m "feat: initObserver/refreshObserver から applyStagger を呼び出す"
```

---

### Task 4: ドキュメント更新（README.md）

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: なし（ドキュメントのみ）
- Produces: なし

- [ ] **Step 1: 「対応 effect class」セクションと「Utility class」セクションの間に stagger セクションを追加**

現状、`README.md` の該当箇所は次のようになっている（`## Utility class` の直前、`umn-scale-in` の表の後ろに `umn-img-zoom` の hover セクションが既にある）:

```markdown
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

## Utility class
```

`## Utility class` の直前に以下のセクションを追加する:

```markdown
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
```

- [ ] **Step 2: CSS variables 一覧に `--umn-stagger-step` を追加**

現状:

```css
:root {
  --umn-duration: 0.8s;
  --umn-delay: 0s;
  --umn-distance: 24px;
  --umn-blur: 12px;
  --umn-scale: 0.96;
  --umn-ease: cubic-bezier(0.22, 1, 0.36, 1);
}
```

このコードブロックを次の内容に置き換える（Task 1 で実装した `variables.css` の実値に合わせ、`--umn-stagger-step` を追加する）:

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

- [ ] **Step 3: 目視確認**

`README.md` をエディタで開き、Markdown のコードフェンスが正しく閉じているか、セクション見出しの階層（`##`/`###`）が壊れていないかを確認する。

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: stagger API の使い方をREADMEに追加"
```

---

### Task 5: `examples/index.html` の Stagger セクションを `umn-stagger` ベースに更新

**Files:**
- Modify: `examples/index.html`

**Interfaces:**
- Consumes: `umn-stagger` class（Task 1〜3 で実装したJS/CSSの動作を前提とする）
- Produces: なし（サンプルページの表示のみ）

**背景:** 既存の `examples/index.html` には「Stagger」という見出しのセクション（`id="stagger"`）が既にあるが、中身は `umn-delay-100`〜`umn-delay-400` を手動で個別に付けているだけで、新しい自動付番の `umn-stagger` class は使われていない。このタスクでこのセクションを差し替える。

- [ ] **Step 1: 現状の該当セクションを確認**

`examples/index.html` の `<!-- Stagger -->` コメント以下、`<section id="stagger">` 〜 対応する `</section>` までが対象（既存の実装は次の内容）:

```html
  <!-- Stagger -->
  <section id="stagger">
    <div class="section-header">
      <div>
        <div class="section-label">Stagger</div>
        <div class="section-title">delay utility の組み合わせ</div>
      </div>
      <button class="btn" onclick="replaySection('stagger')">↺ Replay</button>
    </div>
    <div class="stagger-list">
      <div class="stagger-item umn-slide-up">
        <span>Item 1</span>
        <code>umn-slide-up</code>
      </div>
      <div class="stagger-item umn-slide-up umn-delay-100">
        <span>Item 2</span>
        <code>umn-slide-up umn-delay-100</code>
      </div>
      <div class="stagger-item umn-slide-up umn-delay-200">
        <span>Item 3</span>
        <code>umn-slide-up umn-delay-200</code>
      </div>
      <div class="stagger-item umn-slide-up umn-delay-300">
        <span>Item 4</span>
        <code>umn-slide-up umn-delay-300</code>
      </div>
      <div class="stagger-item umn-slide-up umn-delay-400">
        <span>Item 5</span>
        <code>umn-slide-up umn-delay-400</code>
      </div>
    </div>
    <div class="code-block" style="margin-top:16px;">
      <div class="code-block-header">
        <span>HTML</span>
        <button class="copy-btn" data-copy='&lt;li class="umn-slide-up"&gt;Item 1&lt;/li&gt;
&lt;li class="umn-slide-up umn-delay-100"&gt;Item 2&lt;/li&gt;
&lt;li class="umn-slide-up umn-delay-200"&gt;Item 3&lt;/li&gt;
&lt;li class="umn-slide-up umn-delay-300"&gt;Item 4&lt;/li&gt;'>Copy</button>
      </div>
      <pre><code>&lt;li class="umn-slide-up"&gt;Item 1&lt;/li&gt;
&lt;li class="umn-slide-up umn-delay-100"&gt;Item 2&lt;/li&gt;
&lt;li class="umn-slide-up umn-delay-200"&gt;Item 3&lt;/li&gt;
&lt;li class="umn-slide-up umn-delay-300"&gt;Item 4&lt;/li&gt;</code></pre>
    </div>
  </section>
```

- [ ] **Step 2: セクション全体を `umn-stagger` を使う内容に置き換える**

上記ブロックを次の内容で置き換える（`stagger-list`/`stagger-item` クラス名・`section-header`/`btn`/`code-block` 構造は既存デザインを踏襲。`umn-stagger` を `stagger-list` に付与し、各 `stagger-item` からは delay class を除去）:

```html
  <!-- Stagger -->
  <section id="stagger">
    <div class="section-header">
      <div>
        <div class="section-label">Stagger</div>
        <div class="section-title">umn-stagger — 自動連番delay</div>
      </div>
      <button class="btn" onclick="replaySection('stagger')">↺ Replay</button>
    </div>
    <p style="font-size:0.78rem; color:var(--muted); margin-bottom:16px;">親要素に umn-stagger を付けるだけで、直下の子要素に自動で連番の delay が付与される。</p>
    <div class="stagger-list umn-stagger">
      <div class="stagger-item umn-slide-up">
        <span>Item 1</span>
      </div>
      <div class="stagger-item umn-slide-up">
        <span>Item 2</span>
      </div>
      <div class="stagger-item umn-slide-up">
        <span>Item 3</span>
      </div>
      <div class="stagger-item umn-slide-up">
        <span>Item 4</span>
      </div>
      <div class="stagger-item umn-slide-up">
        <span>Item 5</span>
      </div>
    </div>
    <div class="code-block" style="margin-top:16px;">
      <div class="code-block-header">
        <span>HTML</span>
        <button class="copy-btn" data-copy='&lt;ul class="umn-stagger"&gt;
  &lt;li class="umn-slide-up"&gt;Item 1&lt;/li&gt;
  &lt;li class="umn-slide-up"&gt;Item 2&lt;/li&gt;
  &lt;li class="umn-slide-up"&gt;Item 3&lt;/li&gt;
&lt;/ul&gt;'>Copy</button>
      </div>
      <pre><code>&lt;ul class="umn-stagger"&gt;
  &lt;li class="umn-slide-up"&gt;Item 1&lt;/li&gt;
  &lt;li class="umn-slide-up"&gt;Item 2&lt;/li&gt;
  &lt;li class="umn-slide-up"&gt;Item 3&lt;/li&gt;
&lt;/ul&gt;</code></pre>
    </div>
  </section>
```

**注意:** `replaySection('stagger')` は `triggerReplay()` を通じて `.is-visible` を一旦外し新規 `IntersectionObserver` で再監視するだけで、`window.Umination.refresh()` は呼ばない。そのため `applyStagger()` の再実行はされないが、Task 3 で `--umn-delay` は各要素の inline style に既に書き込まれているため、リプレイしても delay 値はそのまま保持され、段差付きの動きが再現される。この挙動はこのタスクでは変更しない。

- [ ] **Step 3: 開発サーバーで目視確認**

Run: `npm run dev`

ブラウザで `examples/index.html` の `#stagger` セクションまでスクロールし、以下を確認する:
- Item 1〜5 が上から順に少しずつ遅れて `umn-slide-up` のアニメーションで表示される
- 「↺ Replay」ボタンを押すと再度段差付きで表示される
- ブラウザの devtools で `.stagger-item` 要素の `style` 属性に `--umn-delay: calc(var(--umn-stagger-step) * N)` が入っていることを確認する（N はDOM順の連番）

- [ ] **Step 4: ビルドして確認**

Run: `npm run build`
Expected: エラー 0。`dist/umination.js`・`dist/umination.min.js`・`dist/umination.css`・`dist/umination.min.css` の4ファイルが更新される

- [ ] **Step 5: Commit**

```bash
git add examples/index.html
git commit -m "docs: examples の Stagger セクションを umn-stagger ベースに更新"
```

---

## Self-Review Notes

- **spec カバレッジ:** spec の「JS実装方針」「CSS変数」「変更ファイル一覧」「HTML例」は Task 1〜5 でそれぞれ対応済み。「スコープ外」に明記されたネスト対応・パフォーマンス最適化は本計画でも扱わない
- **命名の一貫性:** `UMINATION_STAGGER_CLASS`（Task 1）→ `applyStagger()`（Task 2）→ `observer.ts` からの呼び出し（Task 3）まで、関数名・定数名の表記ゆれなし
- **CLAUDE.md との整合性:** stagger は「effect class 1つで動く」原則には抵触しない（`umn-stagger` は effect class ではなく、既存の `UMINATION_EFFECT_CLASSES` には追加しない）。README の「effect class 追加時は constants.ts を更新」ルールの対象外であることは spec に明記済み
