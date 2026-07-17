# umination npm git依存共有 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** umination を GitHub git依存として、自社テンプレート（umi-static-starter / umidesign_classic_theme）にインストールするだけで最新版が自動ビルド・導入される状態にする。

**Architecture:** umination 側に `prepare` スクリプトを追加し、npm/pnpm の git依存ライフサイクルでインストール時に `dist/` を自動ビルドさせる。各テンプレートの `package.json` に `github:umi-design/umination#main` を dependencies として追加する。

**Tech Stack:** npm, pnpm, Vite, TypeScript（umination既存スタック）

## Global Constraints

- umination の class prefix / 設計原則は変更しない（このタスクではビルド設定・依存宣言のみ変更、`src/` のロジックは触らない）
- `dist/` は git 管理しない（`.gitignore` のまま）
- バージョン運用は main ブランチ追従のみ。タグは切らない
- push は明示的にユーザーへ確認してから実行する（3リポジトリとも）

---

### Task 1: umination に prepare スクリプトを追加しビルドを検証

**Files:**
- Modify: `/Users/tako3ch/Projects/02_Self/umination/package.json`
- Modify: `/Users/tako3ch/Projects/02_Self/umination/README.md`（`## npm package` セクション）

**Interfaces:**
- Produces: `npm run prepare`（= `npm run build` を実行）が `dist/umination.js` / `dist/umination.js` / `dist/umination.min.js` / `dist/umination.min.css` を生成する。後続タスクはこの `dist/` 生成をインストール時に期待する。

- [ ] **Step 1: `package.json` の `scripts` に `prepare` を追加**

`/Users/tako3ch/Projects/02_Self/umination/package.json` の `scripts` ブロックを次のように変更する（既存の `dev` / `build` / `preview` / `typecheck` は変更しない、`prepare` を追加）:

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build --mode dev && vite build --mode min",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "prepare": "npm run build"
  },
```

- [ ] **Step 2: dist を消してから prepare を実行し、生成物を確認**

Run:
```bash
rm -rf dist
npm run prepare
ls dist
```
Expected: `dist/umination.js dist/umination.css dist/umination.min.js dist/umination.min.css` が出力される

- [ ] **Step 3: README の `## npm package` セクションに git依存の使い方を追記**

`/Users/tako3ch/Projects/02_Self/umination/README.md` の該当箇所を次のように置き換える:

置き換え前:
```markdown
## npm package

```
@umi-design/umination
```
```

置き換え後:
```markdown
## npm package

npm registry には publish していない。GitHub リポジトリへの git 依存として導入する。

```bash
npm install github:umi-design/umination#main
```

```json
"dependencies": {
  "umination": "github:umi-design/umination#main"
}
```

インストール時に `prepare` スクリプトが自動で `dist/` をビルドする。最新版を取り込みたい場合は `npm update umination`（pnpm の場合は `pnpm update umination`）を実行する。バージョンはタグ固定せず main ブランチ追従。
```

- [ ] **Step 4: コミット**

```bash
cd /Users/tako3ch/Projects/02_Self/umination
git add package.json README.md
git commit -m "feat: git依存インストール向けにprepareスクリプトを追加"
```

- [ ] **Step 5: push はユーザーに確認してから実行**

このステップはユーザーへ「umination リポジトリを push していいか」を確認し、承認を得てから `git push` を実行する。無断で実行しない。

---

### Task 2: umi-static-starter に umination を git依存として追加（pnpm）

**Files:**
- Modify: `/Users/tako3ch/Projects/00_Common/Templates/umi-static-starter/package.json`
- Modify: `/Users/tako3ch/Projects/00_Common/Templates/umi-static-starter/pnpm-lock.yaml`（`pnpm install` により自動更新）

**Interfaces:**
- Consumes: Task 1 で追加した umination の `prepare` スクリプト（git依存インストール時に `dist/` を自動ビルドする前提）

- [ ] **Step 1: package.json の dependencies に umination を追加**

`/Users/tako3ch/Projects/00_Common/Templates/umi-static-starter/package.json` の `dependencies` ブロックを次のように変更する:

```json
  "dependencies": {
    "gsap": "^3.14.2",
    "swiper": "^12.0.3",
    "umination": "github:umi-design/umination#main"
  },
```

- [ ] **Step 2: pnpm install を実行し、ビルド許可が必要か確認**

Run:
```bash
cd /Users/tako3ch/Projects/00_Common/Templates/umi-static-starter
pnpm install
```
Expected: `umination` が `node_modules/umination` に追加される。pnpm が git依存のビルドスクリプト実行をブロックした場合（「Ignored build scripts」等の警告が出た場合）は `pnpm approve-builds` を実行し、`umination` を許可リストに追加してから `pnpm install` を再実行する。

- [ ] **Step 3: dist が生成されていることを確認**

Run:
```bash
ls node_modules/umination/dist
```
Expected: `umination.js umination.css umination.min.js umination.min.css` が出力される

- [ ] **Step 4: コミット**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: uminationをgit依存として追加"
```

- [ ] **Step 5: push はユーザーに確認してから実行**

「umi-static-starter リポジトリを push していいか」をユーザーに確認してから `git push` を実行する。

---

### Task 3: umidesign_classic_theme に umination を git依存として追加（npm）

**Files:**
- Modify: `/Users/tako3ch/Projects/00_Common/Templates/umidesign_classic_theme/package.json`
- Create/Modify: `/Users/tako3ch/Projects/00_Common/Templates/umidesign_classic_theme/package-lock.json`（`npm install` により自動生成・更新）

**Interfaces:**
- Consumes: Task 1 で追加した umination の `prepare` スクリプト

- [ ] **Step 1: package.json の dependencies に umination を追加**

`/Users/tako3ch/Projects/00_Common/Templates/umidesign_classic_theme/package.json` は現状 `dependencies` フィールドを持たないため新規に追加する:

```json
{
  "name": "umidesign-classic-theme",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build:wp": "vite build && node scripts/build-webp.mjs",
    "build:css": "vite build --watch"
  },
  "devDependencies": {
    "sharp": "^0.33.0",
    "vite": "^6.0.0"
  },
  "dependencies": {
    "umination": "github:umi-design/umination#main"
  }
}
```

- [ ] **Step 2: npm install を実行**

Run:
```bash
cd /Users/tako3ch/Projects/00_Common/Templates/umidesign_classic_theme
npm install
```
Expected: `umination` が `node_modules/umination` に追加され、`prepare` が自動実行される

- [ ] **Step 3: dist が生成されていることを確認**

Run:
```bash
ls node_modules/umination/dist
```
Expected: `umination.js umination.css umination.min.js umination.min.css` が出力される

- [ ] **Step 4: コミット**

このリポジトリには remote が設定されていない（ローカルのみ）。push ステップは不要。

```bash
git add package.json package-lock.json
git commit -m "feat: uminationをgit依存として追加"
```

---

## Self-Review メモ

- スペックの「umination側prepare追加」「両テンプレへのgit依存追加」「README追記」「main追従・タグ運用なし」は全てTask1〜3でカバー
- プレースホルダなし。全ステップに実コマンド・実コードを記載
- umidesign_classic_theme は remote 未設定のため push ステップを設けていない（他2リポジトリのみ push 確認を要求）
