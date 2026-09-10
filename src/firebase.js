import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";

// ------------------------------------------------------------------
// Firebaseプロジェクトの設定値。
// Firebaseコンソール（https://console.firebase.google.com/）で
// プロジェクトを作成し、「プロジェクトの設定」→「全般」→
// 「マイアプリ」→ ウェブアプリを追加 すると、この形式の設定値が
// 発行されます。それを下の環境変数（.env.local）に設定してください。
//
// これらの値はサーバー側の「秘密鍵」ではなく、Webアプリに埋め込まれる
// 公開設定です（ビルドすると誰でもブラウザの開発者ツールから見えます）。
// そのためアクセス制御は、この値を隠すことではなく、Firestoreの
// 「セキュリティルール」で行います。README.mdの手順に従って
// 必ずルールを設定してください。
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// 通常のストリーミング接続(WebChannel)が、社内ネットワークや一部のブラウザ
// 環境でブロックされ「Failed to get document because the client is
// offline」のようなエラーになることがある。
// experimentalAutoDetectLongPolling を有効にすると、Firestoreが接続時に
// 自動でロングポーリング方式にフォールバックしてくれるため、より多くの
// ネットワーク環境で接続できるようになる。
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false,
});
