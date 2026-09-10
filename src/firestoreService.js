import { db } from "./firebase";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  getDoc,
} from "firebase/firestore";

// ------------------------------------------------------------------
// Firestoreのコレクション／ドキュメント構成
//
//   projects/{projectId}   … 案件（参考見積り・アーカイブ済みの過去実績も含む）
//   visits/{visitId}       … 訪問記録
//   settings/app           … アプリ全体の設定（月間目標金額など）
//
// ユーザー認証はまだ導入していないため、現時点では「同じFirestore
// プロジェクトに接続した人は誰でも読み書きできる」状態です。
// 必ずFirestoreのセキュリティルールを設定してください（README参照）。
// ------------------------------------------------------------------

const projectsCol = collection(db, "projects");
const visitsCol = collection(db, "visits");
const settingsDoc = doc(db, "settings", "app");

function withId(docSnap) {
  return { id: docSnap.id, ...docSnap.data() };
}

/** 案件一覧をリアルタイム購読する。作成日時の降順で並べる。 */
export function subscribeToProjects(onChange, onError) {
  const q = query(projectsCol, orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map(withId)),
    (err) => onError && onError(err)
  );
}

/** 訪問記録をリアルタイム購読する。 */
export function subscribeToVisits(onChange, onError) {
  const q = query(visitsCol, orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map(withId)),
    (err) => onError && onError(err)
  );
}

/** アプリ設定（月間目標金額など）をリアルタイム購読する。 */
export function subscribeToSettings(onChange, onError) {
  return onSnapshot(
    settingsDoc,
    (snap) => onChange(snap.exists() ? snap.data() : {}),
    (err) => onError && onError(err)
  );
}

export async function addProjectDoc(data) {
  const ref = await addDoc(projectsCol, data);
  return ref.id;
}

export async function updateProjectDoc(id, patch) {
  await updateDoc(doc(db, "projects", id), patch);
}

export async function deleteProjectDoc(id) {
  await deleteDoc(doc(db, "projects", id));
}

export async function addVisitDoc(data) {
  const ref = await addDoc(visitsCol, data);
  return ref.id;
}

export async function deleteVisitDoc(id) {
  await deleteDoc(doc(db, "visits", id));
}

export async function setMonthlyTargetDoc(amount) {
  await setDoc(settingsDoc, { monthlyTarget: amount }, { merge: true });
}

/** 初回起動時など、settingsドキュメントが存在しない場合に初期値を作る。 */
export async function ensureSettingsDoc(defaultTarget) {
  const snap = await getDoc(settingsDoc);
  if (!snap.exists()) {
    await setDoc(settingsDoc, { monthlyTarget: defaultTarget });
  }
}
