# 定尺取り合い計算アプリ

React + Vite で作った、URL公開用の定尺取り合い計算Webアプリです。

## ローカル確認

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
```

## Vercelで公開

1. GitHubにこのフォルダをアップロード
2. Vercelで「Add New Project」
3. GitHubリポジトリを選択
4. Framework Preset は Vite
5. Build Command は `npm run build`
6. Output Directory は `dist`
7. Deploy

## 使い方

- 単品計算：1種類の材料を計算
- 一括計算：複数材料をまとめて計算
- 材料登録：材料名、定尺長さ、切断ロスを保存
- 現場表示：スマホで切断順を確認
- PDF/印刷：ブラウザの印刷機能でPDF保存

## 入力例

```text
870x4
772x6
500x6
350x4
450x4
260x4
```
