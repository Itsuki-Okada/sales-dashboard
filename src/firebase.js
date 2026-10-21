import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// ------------------------------------------------------------------
// Firebaseプロジェクトの設定値（.env.local / GitHub Secrets から読み込み）。
//
// これらの値はサーバー側の「秘密鍵」ではなく、Webアプリに埋め込まれる
// 公開設定です（ビルドすると誰でもブラウザの開発者ツールから見えます）。
// そのためデータの守りは、この値を隠すことではなく、
//   1. Firebase Authentication によるログイン
//   2. Firestore の「セキュリティルール」（firestore.rules）
// で行います。README.md の「ログインとセキュリティ」の手順に従ってください。
//
// パスワードはこのリポジトリには一切書きません。
// ユーザーとパスワードは Firebase コンソールの Authentication で作成し、
// Firebase（Google）側で暗号化（ハッシュ化）して保管されます。
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
// 環境でブロックされることがあるため、自動でロングポーリングに切り替える。
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false,
});

export const auth = getAuth(app);
