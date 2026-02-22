# Offline Mermaid Editor

Python (`pywebview`) とフロントエンド技術 (HTML/CSS/JS) で構築された、**完全オフラインで動作するデスクトップ版の Mermaid 実時間エディタ** です。
インターネット接続がなくても、お手元のPC上で高速にMermaidダイアグラムを作成・編集・保存・書き出しすることができます。

![Offline Mermaid Editor](https://mermaid.js.org/mermaid-logo.svg) <!-- 必要に応じて実際のスクリーンショット等に差し替えてください -->

## 主な機能 (Features)

- 🔒 **完全オフライン動作**: `mermaid.js` をローカルにバンドルしているため、ネットワーク不要でセキュアに図形を作成可能。
- ⚡ **リアルタイムプレビュー**: 左側のコード（デバウンス付き）を変更すると、即座に右側のビューアーに描画されます。
- 🔢 **高機能コードエディタ**: `CodeMirror 5` を搭載し、行番号の表示・シンタックスハイライト・インデント等に標準対応。
- 🪄 **ダイナミック入力支援**: 編集中のダイアグラム種類（Flowchart, Sequenceなど）を自動検知し、エディタ上部のツールバーによく使う矢印（`-->`, `->>` など）の挿入ボタンを動的に表示します。
- 🎨 **テーマ切替**: default, dark, forest, neutral など、複数の Mermaid 組み込みテーマを切り替え可能。
- 💾 **履歴と自動保存**: 1秒ごとのオートセーブ機能。ローカルの `history.json` を通じて前回終了時のタブやコード履歴をそのまま復元します。
- 🖼️ **多様なエクスポート機能**:
  - **SVG 保存**: 高精細なベクター画像として保存。
  - **PNG 保存**: 2倍スケールで高解像度のPNG画像として保存。
  - **Visio 用エクスポート**: Visioへドラッグ＆ドロップでインポートしやすいSVG形式で出力。
  - **クリップボード連携**: コードそのもののコピーや、プレビュー画像のワンクリックコピー（PNG形式）に標準対応。
- 📝 **Sticky Note**: プレビュー画面上にドラッグ＆ドロップで動かせる付箋メモウィジェットを搭載。図形ごとのメモを残せます。

## 必要要件 (Prerequisites)

- Python 3.8 以上
- Google Chrome, Edge などの近代的なブラウザ（Windows環境での WebView2 実行用）

## インストールと起動 (Installation & Usage)

1. リポジトリをクローンまたはダウンロードします。
2. 必要な Python パッケージをインストールします。
   ```bash
   pip install -r requirements.txt
   ```
3. メインスクリプトを実行してアプリを起動します。
   ```bash
   python app.py
   ```

## 構成設定 (Config)
ツールバーの「⚙️ Config」メニューから以下の設定が行えます（設定内容はブラウザ側にキャッシュ・保存されます）：
- **Editor Theme**: エディタのUI背景色や文字色
- **Font Size**: エディタ領域の文字サイズを数値や ➕/➖ ボタンで調整
- **Git Labels**: Git Graphダイアグラムにおけるコミットラベル表示の ON/OFF トグル

## 実行可能ファイル（EXE）のビルド (Build as EXE)

Python 環境がないPCでも動かせる単一の `.exe` ファイルを作成することができます。ビルドには `PyInstaller` を使用します。

1. PyInstaller をインストールします。
   ```bash
   pip install pyinstaller
   ```
2. 以下のコマンドを実行してビルドします。
   ```bash
   pyinstaller --noconfirm --onedir --windowed --name "Offline Mermaid Editor" --add-data "web;web" --add-data "history.json;." app.py
   ```
3. ビルドに成功すると `dist/Offline Mermaid Editor/` フォルダが作成されます。この中の `Offline Mermaid Editor.exe` をダブルクリックするだけでアプリが起動します。

---

## 開発情報 (Tech Stack)
- **Backend (Window/Files)**: Python (`pywebview`)
- **Frontend (UI)**: Vanilla HTML / CSS / JavaScript
- **Editor Component**: [CodeMirror 5](https://codemirror.net/5/)
- **Diagram Rendering**: [Mermaid.js](https://mermaid.js.org/)
