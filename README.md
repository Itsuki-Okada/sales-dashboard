# 案件・受注率管理ダッシュボード（ローカル動作版）

同じネットワーク（同じWi-Fi/社内LAN）内であれば、URLを送るだけで
第三者のPCやスマホからもこのダッシュボードを見てもらえます。

## 1. セットアップ（あなたのPCで一度だけ）

Node.js（18以上推奨）がインストールされたPCで、このフォルダに移動して：

```bash
npm install
```

## 2. 起動する

```bash
npm run dev
```

実行すると、ターミナルに以下のように表示されます。

```
  Local:   http://localhost:5173/
  Network: http://192.168.x.x:5173/
```

- あなた自身は `Local` のURLで確認できます。
- 同じWi-Fi／社内LANに繋がっている第三者には、`Network` に表示されている
  `http://192.168.x.x:5173/` のようなURLをそのまま伝えてください。
  そのURLをブラウザで開くと、あなたのPCで動いているダッシュボードが
  相手の画面にも表示されます。

## 3. 注意点

- **あなたのPCが起動していて、`npm run dev` を実行している間だけ**アクセスできます。
  PCをスリープ・シャットダウンしたり、ターミナルを閉じると見られなくなります。
- 同じネットワークに接続している必要があります（外出先や別のWi-Fiからは開けません）。
- Windowsの場合、初回起動時に「Windows セキュリティの重要な警告」（ファイアウォール）
  が出ることがあります。「アクセスを許可する」を選んでください。
- データはFirestoreに保存されます（下記「5. Firestoreに接続する」を参照）。
  セットアップが済んでいれば、ページを再読み込みしても消えず、
  複数人が同時に見ている場合もリアルタイムで反映されます。

## 4. GitHubにアップロードして、URLで誰でも見れるようにする（GitHub Pages）

このプロジェクトには、GitHub Pagesへ**pushするたびに自動でビルド・公開される**
GitHub Actionsの設定 (`.github/workflows/deploy.yml`) と、
サブパス配信に対応した `vite.config.js` の設定がすでに入っています。

あなたが行う必要があるのは、以下の手順だけです（GitHubのログインが必要なため、
これだけはご自身で行ってください）。

### 手順

1. GitHubで新しい空のリポジトリを作成する
   （例: `sales-dashboard`。README等は追加せず「空」で作成してください）

2. このフォルダのターミナルで、以下を実行してコミットする

   ```bash
   git add -A
   git commit -m "Initial commit"
   git branch -M main
   ```

3. 作成したリポジトリのURLをリモートとして登録し、pushする
   （`<あなたのユーザー名>` と `<リポジトリ名>` は実際の値に置き換えてください）

   ```bash
   git remote add origin https://github.com/<あなたのユーザー名>/<リポジトリ名>.git
   git push -u origin main
   ```

   ※ 初回pushの際にGitHubのユーザー名とパスワード（またはPersonal Access Token）
   の入力を求められます。GitHubの認証情報はご自身でのみ入力してください。

4. GitHubのリポジトリページで
   **Settings → Pages** を開き、「Build and deployment」の
   **Source** を **GitHub Actions** に設定する（これは最初の1回だけでOK）

5. `main` ブランチにpushすると自動的にビルドが走り、数分後に

   ```
   https://<あなたのユーザー名>.github.io/<リポジトリ名>/
   ```

   のURLでアクセスできるようになります。このURLを共有すれば、
   相手は同じネットワークにいなくても、あなたのPCを起動していなくても
   いつでも閲覧できます。

   進捗はリポジトリの **Actions** タブで確認できます。

### 今後の更新について

コードを変更したら、以下を実行するだけで自動的にサイトが更新されます。

```bash
git add -A
git commit -m "変更内容"
git push
```

### 注意点（引き続き）

- GitHub Pagesで公開する場合も、あなたのPCと同じFirestoreデータベースに
  接続されるので、全員が同じ最新データを見ることができます
  （下記「5. Firestoreに接続する」のセットアップが完了している場合）。
- GitHub Actionsでビルドする際は、Firebaseの設定値をGitHubのSecretsとして
  登録する必要があります（下記「6. GitHub PagesでもFirestoreに繋げる」を参照）。

## 5. Firestoreに接続する（データを消えないように保存する）

このアプリのデータ（案件・訪問記録・月間目標）は、Googleの
Firebase Firestoreというデータベースに保存する構成になっています。
以下の手順で、あなた専用のFirebaseプロジェクトを作成して接続してください。
（この手順はGoogleアカウントでの操作が必要なため、ご自身で行ってください。
無料の範囲で問題なく使えます。）

### 5-1. Firebaseプロジェクトを作成する

1. https://console.firebase.google.com/ を開き、Googleアカウントでログイン
2. 「プロジェクトを追加」をクリックし、プロジェクト名を入力（例: `sales-dashboard`）
3. Googleアナリティクスは「無効にする」で問題ありません
4. 「プロジェクトを作成」をクリック

### 5-2. Firestoreデータベースを有効にする

1. 左メニューの「構築」→「Firestore Database」を開く
2. 「データベースの作成」をクリック
3. ロケーションは `asia-northeast1`（東京）などお好みで選択
4. セキュリティルールは、最初は「テストモードで開始」を選んでOKです
   （後述の手順4でルールを設定し直します）

### 5-3. ウェブアプリを追加し、設定値を取得する

1. プロジェクト概要画面の「</>」（ウェブ）アイコンをクリック
2. アプリのニックネームを入力（例: `sales-dashboard-web`）し、「アプリを登録」
3. 表示された `firebaseConfig` の値をメモしておく（次のような形です）

   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "xxxx.firebaseapp.com",
     projectId: "xxxx",
     storageBucket: "xxxx.appspot.com",
     messagingSenderId: "...",
     appId: "...",
   };
   ```

4. このフォルダの `.env.example` をコピーして `.env.local` という名前で保存し、
   メモした値をそれぞれ埋めてください。

   ```bash
   cp .env.example .env.local
   ```

   ```
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=xxxx.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=xxxx
   VITE_FIREBASE_STORAGE_BUCKET=xxxx.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

   `.env.local` はGitには含まれません（`.gitignore`済み）。

### 5-4. Firestoreのセキュリティルールを設定する

Firebaseコンソールの「Firestore Database」→「ルール」タブを開き、
以下のように設定して「公開」してください。

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ これは「認証なしで誰でも読み書きできる」設定です。
このアプリはまだログイン機能がないため、いったんこの設定で動かせるように
しています。**FirestoreのURLや設定値を公開の場に貼らない**ようにしてください
（GitHub Pagesで公開したサイト自体は問題ありませんが、
リポジトリを公開する場合は誰でもこのデータベースを操作できてしまいます）。
のちほど認証機能を追加する際に、より安全なルールに変更することをおすすめします。

### 5-5. 動作確認

```bash
npm install
npm run dev
```

案件を1件登録してみて、Firebaseコンソールの「Firestore Database」→「データ」
タブに `projects` コレクションが増えていれば接続成功です。

## 6. GitHub PagesでもFirestoreに繋げる

GitHub Actionsでビルドする際は `.env.local` が使われないため、
GitHubのリポジトリに「Secrets」として同じ値を登録する必要があります。

1. GitHubのリポジトリ →「Settings」→ 左メニュー「Secrets and variables」→「Actions」
2. 「New repository secret」を6回繰り返し、以下の名前で値を登録する

   ```
   VITE_FIREBASE_API_KEY
   VITE_FIREBASE_AUTH_DOMAIN
   VITE_FIREBASE_PROJECT_ID
   VITE_FIREBASE_STORAGE_BUCKET
   VITE_FIREBASE_MESSAGING_SENDER_ID
   VITE_FIREBASE_APP_ID
   ```

   （値は `.env.local` に書いたものと同じです）

3. 登録が終わったら、`main` ブランチに何かpushすると、
   その値を使ってビルド・公開されます。

これで、ローカルで動かしている時も、GitHub Pagesで公開している時も、
同じFirestoreデータベースに接続され、データは共有・保存され続けます。

