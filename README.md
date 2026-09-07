# 数学の道 — math-learning-app

中学〜高校数学の学習フローを確認する静的プロトタイプ。41 Unit・123 Skill・固定410題。紙に解いた後、仮採点結果を選択して、診断・stable・修復・MAX・単元解放を確認できます。

## 保存と公開範囲

学習状態は端末のブラウザ内のIndexedDBへ保存します。Firebase、外部AI API、サーバーへの答案・顧客情報保存は使用しません。学習データはGitHubへ送信されません。

localhostとGitHub Pagesは保存領域が異なります。公開サイトは新しい学習状態から始まり、端末間の自動同期はありません。同じ端末・同じブラウザ・同じURLで再開してください。サイトデータを削除すると、そのブラウザの記録も消えます。

公開版でも仮採点を利用します。AI採点・本番認証は未接続です。MAX問題の入試水準と時間は未校正で、固定問題を使い切ると追加の独立問題が必要です。

## 開発

Node.js 24以上で npm ci、npm run dev。検証は npm test と npm run typecheck。Pages用ビルドは npm run build:pages。

## GitHub Pages

数学アプリ専用の新規公開リポジトリ。GitHub Freeの公開リポジトリ＋GitHub Actionsから静的ファイルだけを配信します。mainへのpushでテスト・型検査・ビルド後に配信します。Settings → Pages の Source を GitHub Actions にします。カスタムドメインや他のリポジトリ設定は使用しません。

既存テストの保全ハッシュを維持するため、.gitattributesで改行の自動変換を無効化しています。

- [単元一覧](docs/CURRICULUM-MANIFEST.md)
- [公式カリキュラム監査](docs/CURRICULUM-AUDIT.md)

既存の政治活動ホームページ・既存リポジトリとは独立しています。
