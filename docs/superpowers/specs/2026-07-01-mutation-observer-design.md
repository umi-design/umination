# MutationObserver 対応 設計

## 目的

`umination` v0.2 候補の一つ。SPA・無限スクロール等で動的に追加された要素を、`window.Umination.refresh()` の手動呼び出しなしで自動検知してアニメーション対象に加える。

## 決定事項

- `initUmination()`（自動init含む）実行時に MutationObserver もデフォルトで有効化する（opt-in オプションは設けない）
- 監視範囲は `document.body` 全体、`{ childList: true, subtree: true }`
- DOM変更検知時は `queueMicrotask()` で同一tickの複数mutationを1回の再スキャンに集約する（debounce）。無限スクロール等の連続DOM変更でも過剰実行しない
- 既存の `window.Umination.refresh()` は後方互換として引き続き公開する（MutationObserverの検知を待たず即時再スキャンしたい場合に使える）
- `umn-stagger` 配下に動的追加された子要素にも、MutationObserver検知時に `applyStagger()` が再実行されることで自動的に連番delayが付与される。これは新規ロジックではなく、既存の `refreshObserver()`（内部で `applyStagger()` → 未観測要素の `observe()` を行う）をそのまま呼び出すことで実現する
- `destroyUmination()` 実行時は IntersectionObserver と同時に MutationObserver も disconnect する
- `window.Umination.init/refresh/destroy` のシグネチャ変更なし

## 実装方針

- 新規 `src/ts/mutation-watcher.ts` を作成する。既存の `observer.ts`/`stagger.ts` とは独立した汎用モジュールとし、effect classやstaggerを一切知らない「debounce付きMutationObserverラッパー」として実装する
  - `initMutationWatcher(onMutate: () => void): void` — MutationObserverを作成し `document.body` を監視開始。二重初期化を防ぐガードを持つ
  - `destroyMutationWatcher(): void` — observerをdisconnectし内部状態をリセット
- `src/ts/observer.ts` の `initObserver()` の最後で `initMutationWatcher(refreshObserver)` を呼ぶ。`destroyObserver()` の最後で `destroyMutationWatcher()` を呼ぶ
- 依存方向は `observer.ts → mutation-watcher.ts`（一方向）。`mutation-watcher.ts` は `refreshObserver` の存在を知らず、コールバックとして受け取るだけなので循環importは発生しない

## 変更ファイル一覧

- `src/ts/mutation-watcher.ts` — 新規
- `src/ts/observer.ts` — `initObserver()`/`destroyObserver()` から呼び出しを追加
- `README.md` — MutationObserverによる自動検知の説明を追加（`refresh()` は後方互換で残る旨も明記）
- `CLAUDE.md` — 「追加してはいけないもの」から「MutationObserver による動的検出（v0.1 範囲外）」を削除

## スコープ外

- 監視対象コンテナを利用者が指定できるopt-inセレクタ方式は導入しない（`document.body`全体固定）
- 固定時間debounce（setTimeout方式）は導入しない（マイクロタスク集約のみ）
- MutationObserverの`attributes`監視（class変更検知）は行わない。`childList`（要素の追加）のみを対象とする
