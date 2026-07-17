# umination を自社テンプレートで npm 経由共有する設計

## 背景

umination を umi.design の自社用ライブラリとして正式運用したい。新規案件テンプレートをコピーして `npm install` するだけで umination の最新版が自動的に入る状態を目指す。npm registry への publish は行わず、GitHub リポジトリ（`umi-design/umination`、既存）への git 依存で共有する。

対象テンプレート:
- `~/Projects/00_Common/Templates/umi-static-starter`（pnpm）
- `~/Projects/00_Common/Templates/umidesign_classic_theme`（npm）

## 方針

### バージョン管理
main ブランチ追従。タグ運用はしない（軽量・シンプル優先）。案件側で `umination` を最新化したい場合は `npm update umination`（または `pnpm update umination`）を実行する。

### umination リポジトリ側の変更
`package.json` に `prepare` スクリプトを追加する。

```json
"scripts": {
  "prepare": "npm run build"
}
```

git 依存としてインストールされたパッケージは、npm/pnpm が依存解決時に `prepare` を実行してビルド成果物を生成する。`dist/` は現状どおり `.gitignore` に残し、git 管理しない。これにより `github:umi-design/umination#main` を参照するだけで、インストール時に常に最新ソースからビルドされた `dist/` が手に入る。

### テンプレート側の変更
両テンプレートの `package.json` の `dependencies` に以下を追加する。

```json
"umination": "github:umi-design/umination#main"
```

pnpm 側（umi-static-starter）は git 依存の `prepare` スクリプト実行がデフォルトで許可されるため追加設定は不要。ビルドがブロックされた場合のみ `pnpm approve-builds` を案内する。

### README への追記
両テンプレートの README（または umination 側 README の「使い方」節）に、git 依存での導入方法・更新コマンドを短く追記する。

## スコープ外
- npm registry への publish
- examples ページの本番URL発行・アンカーリンク付与（別タスク）
- `_project-name-a` / `_template_vite` 等、今回指定していないテンプレートへの追加

## 検証
- `npm install`（および pnpm）で `dist/umination.js` / `dist/umination.css` が正しく生成されることを確認
- 各テンプレートに `umn-fade-in` 等を実際に配置し、動作確認
