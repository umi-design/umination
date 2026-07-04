# umn-typing / umn-parallax Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** umination v0.2 に2つの effect を追加する。`umn-typing`（JS 駆動のタイプライター、複数行対応・タイプ中のみカーソル点滅）と `umn-parallax`（CSS scroll-driven の視差、方向4種・速度可変・JS非依存）。

**Architecture:** `umn-typing` は専用の `IntersectionObserver` を持つ新規モジュール `src/ts/typing.ts` として実装し、char を `<span>` に分割して `requestAnimationFrame` で1文字ずつ表示、カーソルを直後の char に追従させる。既存の is-visible 系 observer（`src/ts/observer.ts`）とは完全に分離する。MutationObserver によるオートリフレッシュの配線は `src/index.ts` に一本化する（現状 `observer.ts` 内で完結していたものを、typing 追加に伴い両モジュールを束ねる形に変更）。`umn-parallax` は `animation-timeline: view()` による CSS-only 実装で、JS 変更は一切不要。`@supports` で未対応ブラウザは通常表示に degrade する。

**Tech Stack:** TypeScript（strict）+ Vite + plain CSS。テストランナーは未導入。

## Global Constraints

- class prefix は `umn-` 固定。data 属性は使わない。HTML に書く class は基本1つ（utility との組み合わせは可）。
- 初期非表示ルール（`opacity: 0` 等）は `html.umn-ready` 配下のみ。JS 無効時はコンテンツが常に表示されること。
- `UMINATION_EFFECT_CLASSES`（`src/ts/constants.ts`）は is-visible トグル系のみを保持する。`umn-typing` は別の専用セレクタ定数を使い、この配列には追加しない。
- GSAP 非依存。clip-path 系は追加しない。行分割・単語分割の text reveal は追加しない（`umn-typing` の char 分割のみ例外として許可）。
- `tsconfig.json` は `strict: true` / `noUnusedLocals: true` / `noUnusedParameters: true` / `noImplicitReturns: true`。型エラーは許容しない。
- **テストランナー未導入のため、各タスクの検証は `npm run typecheck` の成功 + `npm run build` の成功 + ブラウザでの実地確認（`npm run dev` → `examples/index.html`）で代替する。**自動テストコードは書かない（既存プロジェクト方針どおり）。
- 既存 class 名・既存 JS API（`window.Umination.init/refresh/destroy`）のシグネチャは変更しない。

---

### Task 1: typing.ts — 定数追加とテキスト分割ロジック

**Files:**
- Modify: `src/ts/constants.ts`
- Create: `src/ts/typing.ts`

**Interfaces:**
- Produces: `UMINATION_TYPING_CLASS`, `UMINATION_TYPING_CHAR_CLASS`, `UMINATION_TYPING_CURSOR_CLASS`, `UMINATION_TYPING_TYPED_CLASS`（`constants.ts` からexport）。`splitIntoChars(el: HTMLElement): HTMLElement[]`（`typing.ts` 内部関数、Task 2 で使用）。

- [ ] **Step 1: constants.ts に typing 用定数を追加**

`src/ts/constants.ts` の末尾に追記する。

```ts
export const UMINATION_TYPING_CLASS = 'umn-typing'
export const UMINATION_TYPING_CHAR_CLASS = 'umn-char'
export const UMINATION_TYPING_CURSOR_CLASS = 'umn-typing-cursor'
export const UMINATION_TYPING_TYPED_CLASS = 'is-typed'

export const TYPING_OBSERVER_OPTIONS: IntersectionObserverInit = {
  root: null,
  rootMargin: '0px 0px -10% 0px',
  threshold: 0.1,
}
```

- [ ] **Step 2: typing.ts を作成し、テキスト分割関数を実装**

```ts
import {
  UMINATION_TYPING_CLASS,
  UMINATION_TYPING_CHAR_CLASS,
} from './constants.js'

function splitIntoChars(el: HTMLElement): HTMLElement[] {
  const text = el.textContent ?? ''
  el.textContent = ''
  const chars: HTMLElement[] = []

  for (const ch of text) {
    if (ch === '\n') {
      el.appendChild(document.createElement('br'))
      continue
    }
    const span = document.createElement('span')
    span.className = UMINATION_TYPING_CHAR_CLASS
    span.textContent = ch === ' ' ? ' ' : ch
    el.appendChild(span)
    chars.push(span)
  }

  return chars
}

export function getSelector(): string {
  return `.${UMINATION_TYPING_CLASS}`
}
```

`\n`（HTML ソース上の実改行）は `<br>` に変換し、複数行を明示的な改行として扱う。半角スペースは ` `（nbsp）にして、`textContent` 代入時に空白が潰れないようにする。

- [ ] **Step 3: typecheck で型エラーがないことを確認**

Run: `npm run typecheck`
Expected: エラーなく終了する（`splitIntoChars` が現時点で未使用でも `noUnusedLocals` に引っかからないよう、Step 2 で export 済みの `getSelector` 以外は同ファイル内で完結しているため問題なし）。

- [ ] **Step 4: Commit**

```bash
git add src/ts/constants.ts src/ts/typing.ts
git commit -m "feat: umn-typing 用の定数とテキスト分割ロジックを追加"
```

---

### Task 2: typing.ts — タイピングアニメーション（rAF）とカーソル追従

**Files:**
- Modify: `src/ts/typing.ts`

**Interfaces:**
- Consumes: `UMINATION_TYPING_CHAR_CLASS`, `UMINATION_TYPING_CURSOR_CLASS`, `UMINATION_TYPING_TYPED_CLASS`（Task 1 の `constants.ts`）、`splitIntoChars`（Task 1、同ファイル内）
- Produces: `createCursor(): HTMLElement`, `typeElement(el: HTMLElement, chars: HTMLElement[], cursor: HTMLElement): void`（Task 3 で使用）

- [ ] **Step 1: import を追加し、カーソル生成・速度解決・タイピング関数を実装**

`src/ts/typing.ts` の import を以下に差し替える。

```ts
import {
  UMINATION_TYPING_CLASS,
  UMINATION_TYPING_CHAR_CLASS,
  UMINATION_TYPING_CURSOR_CLASS,
  UMINATION_TYPING_TYPED_CLASS,
} from './constants.js'
```

同ファイルに以下を追記する。

```ts
function createCursor(): HTMLElement {
  const cursor = document.createElement('span')
  cursor.className = UMINATION_TYPING_CURSOR_CLASS
  cursor.setAttribute('aria-hidden', 'true')
  return cursor
}

function getTypingSpeed(el: HTMLElement): number {
  const value = getComputedStyle(el).getPropertyValue('--umn-typing-speed')
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 45
}

function typeElement(el: HTMLElement, chars: HTMLElement[], cursor: HTMLElement): void {
  if (chars.length === 0) return

  el.insertBefore(cursor, chars[0])

  const speed = getTypingSpeed(el)
  let index = 0
  let startTime: number | null = null

  function step(timestamp: number): void {
    if (startTime === null) startTime = timestamp
    const elapsed = timestamp - startTime
    const targetIndex = Math.min(chars.length, Math.floor(elapsed / speed) + 1)

    while (index < targetIndex) {
      chars[index].classList.add(UMINATION_TYPING_TYPED_CLASS)
      chars[index].after(cursor)
      index++
    }

    if (index < chars.length) {
      requestAnimationFrame(step)
    } else {
      cursor.remove()
    }
  }

  requestAnimationFrame(step)
}
```

`prefers-reduced-motion` は JS 側で分岐しない。CSS 側（Task 5）で `.umn-char` の `opacity` を強制的に `1` にし、カーソルを非表示にすることで対応する（既存コードの `base.css` / `effects.css` と同じ「JS は同じロジックを実行するが CSS が上書きする」方針に合わせる）。

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: エラーなく終了する。`createCursor` / `typeElement` は Task 3 で使用するため、この時点では `noUnusedLocals` の対象にならないよう同ファイル内 export はまだ付けない（ファイル内関数として定義するのみ）。

- [ ] **Step 3: Commit**

```bash
git add src/ts/typing.ts
git commit -m "feat: umn-typing のタイピングアニメーションとカーソル追従を実装"
```

---

### Task 3: typing.ts — IntersectionObserver 統合（init/refresh/destroy）

**Files:**
- Modify: `src/ts/typing.ts`

**Interfaces:**
- Consumes: `TYPING_OBSERVER_OPTIONS`（Task 1）、`getSelector` / `splitIntoChars` / `createCursor` / `typeElement`（Task 1・2、同ファイル内）
- Produces: `initTyping(): void`, `refreshTyping(): void`, `destroyTyping(): void`（Task 4 の `src/index.ts` から呼び出す）

- [ ] **Step 1: observer 管理コードを追加**

`src/ts/typing.ts` の import に `TYPING_OBSERVER_OPTIONS` を加える。

```ts
import {
  UMINATION_TYPING_CLASS,
  UMINATION_TYPING_CHAR_CLASS,
  UMINATION_TYPING_CURSOR_CLASS,
  UMINATION_TYPING_TYPED_CLASS,
  TYPING_OBSERVER_OPTIONS,
} from './constants.js'
```

ファイル末尾に以下を追記する。

```ts
let observer: IntersectionObserver | null = null
let initialized = false
const processedElements = new WeakSet<Element>()

function onIntersect(entries: IntersectionObserverEntry[]): void {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue
    const el = entry.target as HTMLElement
    observer?.unobserve(el)

    const chars = splitIntoChars(el)
    const cursor = createCursor()
    typeElement(el, chars, cursor)
  }
}

function createObserver(): IntersectionObserver {
  return new IntersectionObserver(onIntersect, TYPING_OBSERVER_OPTIONS)
}

function observeNewElements(): void {
  const elements = document.querySelectorAll<HTMLElement>(getSelector())
  elements.forEach((el) => {
    if (processedElements.has(el)) return
    processedElements.add(el)
    observer!.observe(el)
  })
}

export function initTyping(): void {
  if (initialized) return
  initialized = true

  observer = createObserver()
  observeNewElements()
}

export function refreshTyping(): void {
  if (!observer) return
  observeNewElements()
}

export function destroyTyping(): void {
  observer?.disconnect()
  observer = null
  initialized = false
}
```

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: エラーなく終了する。

- [ ] **Step 3: Commit**

```bash
git add src/ts/typing.ts
git commit -m "feat: umn-typing の IntersectionObserver 統合を実装"
```

---

### Task 4: observer.ts + index.ts — MutationObserver 配線の一本化と typing 統合

**Files:**
- Modify: `src/ts/observer.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: `initTyping`, `refreshTyping`, `destroyTyping`（Task 3）
- Produces: なし（エントリポイントの配線のみ）

現状 `observer.ts` の `initObserver()` 内で `initMutationWatcher(refreshObserver)` を呼び、`destroyObserver()` 内で `destroyMutationWatcher()` を呼んでいる。typing にも同じ MutationObserver 監視（`document.body` 全体、動的追加要素の自動検知）が必要なため、mutation watcher の所有権を `observer.ts` から `index.ts` に移し、`refreshObserver` と `refreshTyping` の両方を呼ぶコールバックに束ねる。

- [ ] **Step 1: observer.ts から mutation-watcher の呼び出しを削除**

`src/ts/observer.ts` の import を以下に変更する（`initMutationWatcher, destroyMutationWatcher` の import を削除）。

```ts
import {
  UMINATION_EFFECT_CLASSES,
  UMINATION_READY_CLASS,
  UMINATION_VISIBLE_CLASS,
  UMINATION_REPEAT_CLASS,
  OBSERVER_OPTIONS,
} from './constants.js'
import { applyStagger } from './stagger.js'
```

`initObserver()` から `initMutationWatcher(refreshObserver)` の行を削除する。

```ts
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
```

`destroyObserver()` から `destroyMutationWatcher()` の行を削除する。

```ts
export function destroyObserver(): void {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  initialized = false
  // is-visible が付いた要素は残す（WeakSet はリセットのみ）
}
```

- [ ] **Step 2: index.ts に typing と mutation-watcher の統合配線を実装**

`src/index.ts` 全体を以下に書き換える。

```ts
// CSS を inline 文字列として import（JS バンドルに同梱するため）
import cssText from './css/index.css?inline'
// CSS を副作用 import（Vite が dist/umination.css として抽出する）
import './css/index.css'

import { injectStyle } from './ts/inject-style.js'
import { initObserver, refreshObserver, destroyObserver } from './ts/observer.js'
import { initTyping, refreshTyping, destroyTyping } from './ts/typing.js'
import { initMutationWatcher, destroyMutationWatcher } from './ts/mutation-watcher.js'
export { UMINATION_EFFECT_CLASSES } from './ts/constants.js'

function refreshAll(): void {
  refreshObserver()
  refreshTyping()
}

export function initUmination(): void {
  injectStyle(cssText)
  initObserver()
  initTyping()
  initMutationWatcher(refreshAll)
}

export function refreshUmination(): void {
  refreshAll()
}

export function destroyUmination(): void {
  destroyMutationWatcher()
  destroyObserver()
  destroyTyping()
}

// window.Umination を公開（script type="module" では自動 export されないため明示的に代入）
declare global {
  interface Window {
    Umination: {
      init: () => void
      refresh: () => void
      destroy: () => void
    }
  }
}

window.Umination = {
  init: initUmination,
  refresh: refreshUmination,
  destroy: destroyUmination,
}

// 自動初期化（二重 init は initObserver 内部フラグで防ぐ）
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUmination, { once: true })
} else {
  initUmination()
}
```

- [ ] **Step 3: typecheck**

Run: `npm run typecheck`
Expected: エラーなく終了する。

- [ ] **Step 4: build**

Run: `npm run build`
Expected: `dist/umination.js` / `dist/umination.min.js` / `dist/umination.css` / `dist/umination.min.css` が生成され、エラーなく終了する。

- [ ] **Step 5: Commit**

```bash
git add src/ts/observer.ts src/index.ts
git commit -m "refactor: MutationObserver 配線を index.ts に一本化し umn-typing を統合"
```

---

### Task 5: effects.css — umn-typing の CSS

**Files:**
- Modify: `src/css/effects.css`

**Interfaces:**
- Consumes: `UMINATION_TYPING_CHAR_CLASS`('umn-char') / `UMINATION_TYPING_CURSOR_CLASS`('umn-typing-cursor') / `UMINATION_TYPING_TYPED_CLASS`('is-typed') と同じクラス名を CSS セレクタに直書きする（constants.ts の値と手動で一致させる。既存 effects.css も同様に文字列直書き）。

- [ ] **Step 1: effects.css の末尾に umn-typing セクションを追記**

```css
/* ============================================
   umn-typing — タイプライター（JS 駆動）
   umn-char への分割・is-typed 付与は typing.ts が行う。
   ============================================ */
html.umn-ready .umn-typing .umn-char {
  opacity: 0;
}
html.umn-ready .umn-typing .umn-char.is-typed {
  opacity: 1;
}
.umn-typing-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 1px;
  background: currentColor;
  vertical-align: text-bottom;
  animation: umn-typing-cursor-kf 0.8s step-end infinite;
}
@keyframes umn-typing-cursor-kf {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  html.umn-ready .umn-typing .umn-char {
    opacity: 1 !important;
  }
  .umn-typing-cursor {
    display: none;
  }
}
```

- [ ] **Step 2: build して CSS が dist に反映されることを確認**

Run: `npm run build`
Expected: エラーなく終了する。

Run: `grep -c "umn-typing-cursor-kf" dist/umination.css`
Expected: `1`（新しい keyframes が出力に含まれる）

- [ ] **Step 3: Commit**

```bash
git add src/css/effects.css
git commit -m "feat: umn-typing の CSS（char表示・カーソル点滅・reduced-motion）を追加"
```

---

### Task 6: variables.css + utilities.css — --umn-typing-speed と fast/slow utility

**Files:**
- Modify: `src/css/variables.css`
- Modify: `src/css/utilities.css`

**Interfaces:**
- Produces: `--umn-typing-speed`（デフォルト `45ms`）、`.umn-typing-fast`（`25ms`）、`.umn-typing-slow`（`80ms`）

- [ ] **Step 1: variables.css にデフォルト値を追加**

`src/css/variables.css` の `:root` ブロック内、`--umn-scroll-size` の行の直後に追記する。

```css
  --umn-typing-speed: 45ms;
```

- [ ] **Step 2: utilities.css に speed utility を追加**

`src/css/utilities.css` の末尾に追記する。

```css

/* typing speed */
.umn-typing-fast { --umn-typing-speed: 25ms; }
.umn-typing-slow { --umn-typing-speed: 80ms; }
```

- [ ] **Step 3: typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: エラーなく終了する。

- [ ] **Step 4: Commit**

```bash
git add src/css/variables.css src/css/utilities.css
git commit -m "feat: umn-typing の速度 utility (--umn-typing-speed / fast / slow) を追加"
```

---

### Task 7: examples/index.html — typing デモ追加とブラウザ確認

**Files:**
- Modify: `examples/index.html`

**Interfaces:**
- Consumes: `umn-typing` / `umn-typing-fast` class（Task 1〜6 で実装済み）

- [ ] **Step 1: サイドナビに Typing リンクを追加**

`examples/index.html` の `<nav id="sideNav">` 内、`</a>\n    </nav>` の直前（`#variables` の行の直後）に追記する。既存の `<a href="#api" ...>` の番号を `09` から `11` に変更する。

変更前:
```html
      <a href="#variables" data-target="variables"><span class="num">08</span>CSS Variables</a>
      <a href="#api" data-target="api"><span class="num">09</span>JS API</a>
```

変更後:
```html
      <a href="#variables" data-target="variables"><span class="num">08</span>CSS Variables</a>
      <a href="#typing" data-target="typing"><span class="num">09</span>Typing</a>
      <a href="#parallax" data-target="parallax"><span class="num">10</span>Parallax</a>
      <a href="#api" data-target="api"><span class="num">11</span>JS API</a>
```

- [ ] **Step 2: variables セクションの直後に Typing セクションを追加**

`</section>\n\n      <!-- 08 JS API -->\n      <section id="api">` の直前に以下を挿入する。

```html

      <!-- 09 Typing -->
      <section id="typing">
        <div class="section-header-row">
          <div>
            <div class="section-label">09 / JS 駆動</div>
            <div class="section-title">Typing</div>
          </div>
        </div>
        <p class="section-lead">スクロールで画面に入ると1文字ずつタイプされる。複数行対応、タイプ中のみカーソルが点滅する。</p>
        <div class="card-grid">
          <div class="doc-card">
            <span class="class-name">umn-typing</span>
            <h3 class="umn-typing" style="font-size: 1.3rem; margin-top: 10px;">umination で作る、
タイプライター演出。</h3>
          </div>
          <div class="doc-card">
            <span class="class-name">umn-typing umn-typing-fast</span>
            <p class="umn-typing" style="margin-top: 10px;">高速表示のバリエーション。</p>
          </div>
        </div>
      </section>
```

`<h3>` 内の改行は HTML ソース上の実改行（`umination で作る、` の直後で改行して `タイプライター演出。` と続ける）にする。これが `textContent` の `\n` として `typing.ts` の `splitIntoChars` に渡り、複数行のタイピングとして表示される。

- [ ] **Step 3: JS API セクションのラベル番号を更新**

変更前:
```html
      <!-- 08 JS API -->
      <section id="api">
        <div class="section-header-row">
          <div>
            <div class="section-label">09 / window.Umination</div>
```

変更後:
```html
      <!-- 11 JS API -->
      <section id="api">
        <div class="section-header-row">
          <div>
            <div class="section-label">11 / window.Umination</div>
```

- [ ] **Step 4: dev サーバーで実地確認**

Run: `npm run dev`

ブラウザで `http://localhost:5173`（Vite の実際のポート番号に従う）を開き、以下を確認する。

- サイドナビに "Typing" が追加され、クリックで `#typing` セクションへスクロールする
- `#typing` セクションまでスクロールすると見出しが1文字ずつ表示され、複数行に折り返される
- タイプ中はカーソル（縦棒）が点滅し、タイプ完了後は消える
- 2枚目のカード（`umn-typing-fast`）が1枚目より速く表示される

確認後、`npm run dev` のプロセスは停止する。

- [ ] **Step 5: Commit**

```bash
git add examples/index.html
git commit -m "docs: examplesページにumn-typingのデモを追加"
```

---

### Task 8: variables.css + effects.css — umn-parallax 本体

**Files:**
- Modify: `src/css/variables.css`
- Modify: `src/css/effects.css`

**Interfaces:**
- Produces: `.umn-parallax`（デフォルト up 方向）、`.umn-parallax-down` / `-left` / `-right`（方向 override）、`--umn-parallax-speed`（デフォルト `0.15`）

- [ ] **Step 1: variables.css にデフォルト値を追加**

`src/css/variables.css` の `:root` ブロック内、Task 6 で追加した `--umn-typing-speed: 45ms;` の直後に追記する。

```css
  --umn-parallax-speed: 0.15;
```

- [ ] **Step 2: effects.css の末尾に umn-parallax セクションを追記**

`src/css/effects.css` の末尾（Task 5 で追加した umn-typing セクションの後）に追記する。

```css

/* ============================================
   umn-parallax — スクロール連動の視差（CSS scroll-driven animations）
   JS 非依存。animation-timeline: view() 未対応ブラウザでは
   通常表示（視差なし）に degrade する。
   ============================================ */
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .umn-parallax {
      animation-name: umn-parallax-up;
      animation-timing-function: linear;
      animation-fill-mode: both;
      animation-timeline: view();
      animation-range: cover 0% cover 100%;
      will-change: transform;
    }
    .umn-parallax-down  { animation-name: umn-parallax-down; }
    .umn-parallax-left  { animation-name: umn-parallax-left; }
    .umn-parallax-right { animation-name: umn-parallax-right; }

    @keyframes umn-parallax-up {
      from { transform: translateY(calc(var(--umn-parallax-speed) * 50vh)); }
      to   { transform: translateY(calc(var(--umn-parallax-speed) * -50vh)); }
    }
    @keyframes umn-parallax-down {
      from { transform: translateY(calc(var(--umn-parallax-speed) * -50vh)); }
      to   { transform: translateY(calc(var(--umn-parallax-speed) * 50vh)); }
    }
    @keyframes umn-parallax-left {
      from { transform: translateX(calc(var(--umn-parallax-speed) * 50vh)); }
      to   { transform: translateX(calc(var(--umn-parallax-speed) * -50vh)); }
    }
    @keyframes umn-parallax-right {
      from { transform: translateX(calc(var(--umn-parallax-speed) * -50vh)); }
      to   { transform: translateX(calc(var(--umn-parallax-speed) * 50vh)); }
    }
  }
}
```

`.umn-parallax` 本体・方向 override・keyframes すべてを `@supports (animation-timeline: view())` の内側に置くことで、未対応ブラウザでは一切のルールが適用されず、通常の静止表示（視差なし）に degrade する。`@media (prefers-reduced-motion: no-preference)` で外側を囲むことで、reduced-motion 環境でも同様に無効化される。

- [ ] **Step 3: typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: エラーなく終了する。

Run: `grep -c "umn-parallax-up" dist/umination.css`
Expected: `1` 以上（keyframes が出力に含まれる）

- [ ] **Step 4: Commit**

```bash
git add src/css/variables.css src/css/effects.css
git commit -m "feat: umn-parallax の CSS scroll-driven 視差を追加"
```

---

### Task 9: utilities.css — umn-parallax-slow / -fast

**Files:**
- Modify: `src/css/utilities.css`

**Interfaces:**
- Produces: `.umn-parallax-slow`（`--umn-parallax-speed: 0.08`）、`.umn-parallax-fast`（`--umn-parallax-speed: 0.3`）

- [ ] **Step 1: utilities.css の末尾に速度 utility を追加**

`src/css/utilities.css` の末尾（Task 6 で追加した typing speed utility の後）に追記する。

```css

/* parallax speed */
.umn-parallax-slow { --umn-parallax-speed: 0.08; }
.umn-parallax-fast { --umn-parallax-speed: 0.3; }
```

これは純粋な CSS 変数の上書きのみで `@supports` 内の宣言に依存しないため、`@supports` の外（utilities.css）に置いても安全（未対応ブラウザでは単に無視される変数になるだけで、意図しない見た目には影響しない）。

- [ ] **Step 2: typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: エラーなく終了する。

- [ ] **Step 3: Commit**

```bash
git add src/css/utilities.css
git commit -m "feat: umn-parallax の速度 utility (slow/fast) を追加"
```

---

### Task 10: examples/index.html — parallax デモ追加とブラウザ確認

**Files:**
- Modify: `examples/index.html`

**Interfaces:**
- Consumes: `umn-parallax` / `umn-parallax-down` / `umn-parallax-left` / `umn-parallax-right` / `umn-parallax-slow` / `umn-parallax-fast` class（Task 8・9 で実装済み）

- [ ] **Step 1: Typing セクションの直後に Parallax セクションを追加**

Task 7 で追加した `#typing` セクションの `</section>` の直後、`<!-- 11 JS API -->` の直前に挿入する。

```html

      <!-- 10 Parallax -->
      <section id="parallax">
        <div class="section-header-row">
          <div>
            <div class="section-label">10 / CSS scroll-driven・JS 不要</div>
            <div class="section-title">Parallax</div>
          </div>
        </div>
        <p class="section-lead">animation-timeline: view() によるスクロール連動の視差。未対応ブラウザでは通常表示に degrade する。方向は umn-parallax（up・デフォルト）/ -down / -left / -right、速度は umn-parallax-slow / -fast または --umn-parallax-speed で指定する。</p>
        <div class="card-grid">
          <div class="doc-card umn-parallax">
            <span class="class-name">umn-parallax</span>
            up・デフォルト速度
          </div>
          <div class="doc-card umn-parallax umn-parallax-down umn-parallax-fast">
            <span class="class-name">umn-parallax-down umn-parallax-fast</span>
            down・高速
          </div>
          <div class="doc-card umn-parallax umn-parallax-left umn-parallax-slow">
            <span class="class-name">umn-parallax-left umn-parallax-slow</span>
            left・低速
          </div>
          <div class="doc-card umn-parallax umn-parallax-right" style="--umn-parallax-speed: 0.4;">
            <span class="class-name">umn-parallax-right</span>
            right・任意値 (--umn-parallax-speed: 0.4)
          </div>
        </div>
      </section>
```

- [ ] **Step 2: dev サーバーで実地確認**

Run: `npm run dev`

ブラウザで `#parallax` セクションまでスクロールし、以下を確認する。

- 4枚のカードがそれぞれ異なる方向（up/down/left/right）に視差移動する
- `umn-parallax-fast` のカードが `umn-parallax-slow` のカードより移動量が大きい
- `preview_resize` や DevTools のレンダリング設定で `prefers-reduced-motion: reduce` を有効にすると、視差が止まり通常表示になる

確認後、`npm run dev` のプロセスは停止する。

- [ ] **Step 3: Commit**

```bash
git add examples/index.html
git commit -m "docs: examplesページにumn-parallaxのデモを追加"
```

---

### Task 11: CLAUDE.md + README.md — ドキュメント更新

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`
- Modify: `src/ts/constants.ts`（コメント確認のみ、コード変更なし）

**Interfaces:**
- Consumes: Task 1〜10 で実装した全 class・CSS変数・ファイル構成

- [ ] **Step 1: CLAUDE.md の「追加してはいけないもの」段落を更新**

変更前:
```markdown
hover 系は `:hover` のみで完結する CSS only effect（`umn-img-zoom` / `umn-hover-lift` / `umn-hover-border` / `umn-hover-tilt` / `umn-hover-fade`）に限り例外として許可。IntersectionObserver・JS 側の状態管理を伴う hover 系は追加しない。MutationObserver による動的要素検知は `init()` 時にデフォルトで有効（`src/ts/mutation-watcher.ts`）。監視範囲は `document.body` 全体固定で、opt-inセレクタ方式は追加しない。
```

変更後:
```markdown
hover 系は `:hover` のみで完結する CSS only effect（`umn-img-zoom` / `umn-hover-lift` / `umn-hover-border` / `umn-hover-tilt` / `umn-hover-fade`）に限り例外として許可。IntersectionObserver・JS 側の状態管理を伴う hover 系は追加しない。MutationObserver による動的要素検知は `init()` 時にデフォルトで有効（`src/ts/mutation-watcher.ts`）。監視範囲は `document.body` 全体固定で、opt-inセレクタ方式は追加しない。

text reveal（行分割・単語分割による文字送り演出）は原則追加しない。ただし `umn-typing`（タイプライター）に限り、JS による char 分割・専用 IntersectionObserver・カーソル駆動を例外として許可する（`src/ts/typing.ts`）。
```

- [ ] **Step 2: CLAUDE.md のファイル構成ツリーに typing.ts を追加**

変更前:
```
│  ├─ mutation-watcher.ts MutationObserverのdebounceラッパー（initMutationWatcher/destroyMutationWatcher）
│  └─ observer.ts        IntersectionObserver 管理（init/refresh/destroy、umn-repeatの分岐を含む）
```

変更後:
```
│  ├─ mutation-watcher.ts MutationObserverのdebounceラッパー（initMutationWatcher/destroyMutationWatcher）
│  ├─ observer.ts        IntersectionObserver 管理（init/refresh/destroy、umn-repeatの分岐を含む）
│  └─ typing.ts          umn-typing の char分割・タイピングアニメーション・専用IntersectionObserver管理（initTyping/refreshTyping/destroyTyping）
```

- [ ] **Step 3: CLAUDE.md の「実行時の流れ」に typing 初期化のステップを追加**

変更前:
```markdown
3. `initUmination()` → `injectStyle()` で CSS を head に注入 → `initObserver()` で `html` に `umn-ready` を付与し、`UMINATION_EFFECT_CLASSES` に該当する要素を `IntersectionObserver` で監視開始
4. 交差したら `is-visible` を付与して即 `unobserve`（一度表示したら監視終了、`once` 相当の動作がデフォルト）。ただし `umn-repeat` class を持つ要素は `unobserve` せず監視を継続し、`isIntersecting` に応じて `is-visible` をトグルする（`src/ts/observer.ts` の `onIntersect()` 内で分岐）
5. `window.Umination.refresh()` は動的に追加された要素を再スキャンして未観測分のみ observe に追加（`WeakSet` で観測済みを管理）
6. `window.Umination.destroy()` は observer を disconnect するのみ。`is-visible` が付いた要素のクラスは剥がさない
```

変更後:
```markdown
3. `initUmination()` → `injectStyle()` で CSS を head に注入 → `initObserver()` で `html` に `umn-ready` を付与し、`UMINATION_EFFECT_CLASSES` に該当する要素を `IntersectionObserver` で監視開始
4. 続けて `initTyping()` で `umn-typing` 要素を専用の `IntersectionObserver`（is-visible系とは分離）で監視開始。交差したら char 分割 + `requestAnimationFrame` でのタイピングを開始し、即 `unobserve`
5. `initUmination()` の最後に `initMutationWatcher(refreshAll)` を呼び、`document.body` 配下の動的要素追加を検知するたびに `refreshObserver()` と `refreshTyping()` の両方を実行する（`src/index.ts` が両 observer の refresh を束ねる）
6. 交差したら `is-visible` を付与して即 `unobserve`（一度表示したら監視終了、`once` 相当の動作がデフォルト）。ただし `umn-repeat` class を持つ要素は `unobserve` せず監視を継続し、`isIntersecting` に応じて `is-visible` をトグルする（`src/ts/observer.ts` の `onIntersect()` 内で分岐）
7. `window.Umination.refresh()` は動的に追加された要素を再スキャンして未観測分のみ observe に追加（`WeakSet` で観測済みを管理）。typing 側も同様に未処理の `umn-typing` 要素のみ observe に追加する
8. `window.Umination.destroy()` は mutation watcher と両方の observer を disconnect するのみ。`is-visible` / `is-typed` が付いた要素のクラスは剥がさない
```

- [ ] **Step 4: README.md の対応 effect class 表に umn-typing の説明セクションを追加**

`### スクロール誘導系（CSS only・JS不要）` セクションの直後、`## Stagger` の直前に挿入する。

```markdown
### Typing（JS 駆動）

スクロールで画面に入ると1文字ずつタイプされる。複数行に対応し、タイプ中のみカーソルが点滅する（完了後は消える）。

```html
<h2 class="umn-typing">1文字ずつ
タイプされる見出し</h2>
```

速度は `--umn-typing-speed`（ms/char、デフォルト `45ms`）で調整できる。プリセット utility も用意している。

| class | 値 |
|---|---|
| `umn-typing-fast` | `25ms` |
| `umn-typing-slow` | `80ms` |

HTML ソース上の実改行は `<br>` として扱われ、複数行のタイピングになる。

### Parallax（CSS scroll-driven・JS不要）

`animation-timeline: view()` によるスクロール連動の視差。JS には一切依存しない。未対応ブラウザ（対応状況はブラウザにより異なる）では通常表示（視差なし）に degrade する。

```html
<img class="umn-parallax" src="/image.jpg" alt="">
<div class="umn-parallax umn-parallax-left umn-parallax-fast">...</div>
```

| class | 動作 |
|---|---|
| `umn-parallax` | 視差の基点。方向は上（up）がデフォルト |
| `umn-parallax-down` | 下方向へ視差移動 |
| `umn-parallax-left` | 左方向へ視差移動 |
| `umn-parallax-right` | 右方向へ視差移動 |
| `umn-parallax-slow` | 移動量を抑える（`--umn-parallax-speed: 0.08`） |
| `umn-parallax-fast` | 移動量を大きくする（`--umn-parallax-speed: 0.3`） |

速度は `--umn-parallax-speed`（デフォルト `0.15`）を直接指定することもできる。視差移動で要素が親要素の外にはみ出す場合、親に `overflow: hidden` 等を設定するのは利用側の責務。
```

- [ ] **Step 5: README.md の CSS variables 一覧コードブロックに新変数を追加**

変更前:
```css
  --umn-scroll-color: currentColor;
  --umn-scroll-duration: 1.6s;
  --umn-scroll-size: 26px;
}
```

変更後:
```css
  --umn-scroll-color: currentColor;
  --umn-scroll-duration: 1.6s;
  --umn-scroll-size: 26px;
  --umn-typing-speed: 45ms;
  --umn-parallax-speed: 0.15;
}
```

- [ ] **Step 6: README.md の「v0.1 の範囲」を更新**

変更前:
```markdown
## v0.1 の範囲

- GSAP 非依存
- reset / layout / color / typography は含まない
- アニメーション・transition・motion 関連のみ
- text reveal・clip-path 系は含まない（hover 系は `:hover` のみで完結する CSS only effect、スクロール誘導系は常時ループする CSS only effect に限り対応済み。上記「hover 系」「スクロール誘導系」参照）
```

変更後:
```markdown
## v0.1 の範囲

- GSAP 非依存
- reset / layout / color / typography は含まない
- アニメーション・transition・motion 関連のみ
- clip-path 系は含まない（hover 系は `:hover` のみで完結する CSS only effect、スクロール誘導系は常時ループする CSS only effect に限り対応済み。上記「hover 系」「スクロール誘導系」参照）
- text reveal は行分割・単語分割のものは含まない。`umn-typing`（タイプライター）に限り JS 駆動の char 分割を例外として対応済み（上記「Typing」参照）
- parallax は `umn-parallax` として CSS scroll-driven 視差を対応済み（上記「Parallax」参照）
```

- [ ] **Step 7: 最終ビルド確認**

Run: `npm run typecheck && npm run build`
Expected: エラーなく終了し、`dist/` に4ファイルが出力される。

- [ ] **Step 8: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: umn-typing / umn-parallax の設計原則・使い方をドキュメントに反映"
```

---

## Self-Review 結果

- **Spec coverage**: design doc の「機能1: umn-typing」（複数行・rAF・カーソル追従・専用observer・reduced-motion）は Task 1〜5・7 で実装。「機能2: umn-parallax」（4方向・速度utility・@supports degrade）は Task 8〜10 で実装。「設計原則の変更（CLAUDE.md）」は Task 11 で反映。「更新が必要な箇所」の全ファイルが Task 1〜11 のいずれかで網羅されている。
- **Placeholder scan**: 全ステップに実コード・実コマンドを記載済み。「TBD」等のプレースホルダーなし。
- **Type consistency**: `initTyping/refreshTyping/destroyTyping` の名称は Task 3（定義）→ Task 4（`index.ts` からの呼び出し）→ Task 11（CLAUDE.md記述）で一貫。`UMINATION_TYPING_*` 定数名も Task 1（定義）→ Task 2・3・5（使用）で一貫。
