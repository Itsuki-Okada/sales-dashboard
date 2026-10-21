import { useCallback, useEffect, useRef, useState } from "react";
import { db, auth } from "./firebase";
import { collection, doc, onSnapshot, getDoc, setDoc, writeBatch } from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";

// ------------------------------------------------------------------
// Firestoreのコレクション／ドキュメント構成
//
//   projects/{projectId}   … 案件（参考見積り・受注月未定も含む）
//   visits/{visitId}       … 訪問記録
//   stocks/{stockId}       … ストック売上（運用・保守などの月額契約）
//   settings/app           … 設定（月間目標・月ごとの目標・月次シートの売上・前年度売上）
//   members/{uid}          … ログインを許可するメンバー（Firebaseコンソールで作成）
//
// セキュリティルール（firestore.rules）で「members に登録されたログイン中の
// ユーザーだけが読み書きできる」ようにしています。
// ------------------------------------------------------------------

/* ---------------------------- ログイン ---------------------------- */

// IDだけ入力された場合に付けるメールのドメイン（Firebaseのユーザーはメール形式のため）
// 例：ID「okada」→「okada@<このドメイン>」でログイン。メールアドレスをそのまま入力してもOK。
const LOGIN_DOMAIN = import.meta.env.VITE_LOGIN_DOMAIN || "sales-dashboard.local";

export function loginIdToEmail(id) {
  const v = String(id || "").trim();
  return v.includes("@") ? v : `${v}@${LOGIN_DOMAIN}`;
}

export async function login(id, password, remember) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  const cred = await signInWithEmailAndPassword(auth, loginIdToEmail(id), password);
  return cred.user;
}

export function logout() {
  return signOut(auth);
}

/** ログイン状態とメンバー登録の有無を見張る。member: null=確認中 / true / false */
export function useAuthState() {
  const [state, setState] = useState({ loading: true, user: null, member: null });
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setState({ loading: false, user: null, member: null });
        return;
      }
      setState({ loading: false, user, member: null });
      try {
        const snap = await getDoc(doc(db, "members", user.uid));
        setState({ loading: false, user, member: snap.exists(), memberName: snap.exists() ? snap.data().name || "" : "" });
      } catch (e) {
        // ルールで読めない＝メンバー未登録
        setState({ loading: false, user, member: false });
      }
    });
  }, []);
  return state;
}

/* ---------------------- コレクションの同期（一覧） ---------------------- */

// Firestoreに保存できない undefined を取り除く（idは書き込まない）
function toDocData(obj) {
  const { id, ...rest } = obj;
  return JSON.parse(JSON.stringify(rest));
}

/**
 * コレクションを丸ごと購読し、[一覧, 一覧を更新する関数, 読み込み済みか] を返す。
 * 更新関数は React の setState と同じ使い方（値 または 前の値を受け取る関数）。
 * 前の一覧との差分（追加・変更・削除）だけを Firestore にまとめて書き込む。
 */
export function useFirestoreList(colName, enabled, onError) {
  const [list, setListState] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef([]);

  useEffect(() => {
    if (!enabled) return undefined;
    return onSnapshot(
      collection(db, colName),
      (snap) => {
        const arr = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
        ref.current = arr;
        setListState(arr);
        setLoaded(true);
      },
      (err) => onError && onError(err)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colName, enabled]);

  const setList = useCallback(
    (next) => {
      const prev = ref.current;
      const value = typeof next === "function" ? next(prev) : next;
      ref.current = value;
      setListState(value);
      writeDiff(colName, prev, value).catch((err) => onError && onError(err));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colName]
  );

  return [list, setList, loaded];
}

// キーの並び順に左右されない比較用の文字列（Firestoreから返るキー順は保存時と違うことがあるため）
function stableStringify(v) {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`).join(",")}}`;
  return JSON.stringify(v);
}

async function writeDiff(colName, prev, next) {
  const prevMap = new Map(prev.map((x) => [x.id, x]));
  const nextIds = new Set();
  const ops = [];
  for (const item of next) {
    if (!item || !item.id) continue;
    nextIds.add(item.id);
    const before = prevMap.get(item.id);
    const data = toDocData(item);
    if (!before || stableStringify(toDocData(before)) !== stableStringify(data)) ops.push({ type: "set", id: item.id, data });
  }
  for (const item of prev) if (!nextIds.has(item.id)) ops.push({ type: "delete", id: item.id });
  // 1回の書き込みは最大500件のため、分けて送る
  for (let i = 0; i < ops.length; i += 400) {
    const batch = writeBatch(db);
    ops.slice(i, i + 400).forEach((op) => {
      const ref = doc(db, colName, op.id);
      if (op.type === "set") batch.set(ref, op.data);
      else batch.delete(ref);
    });
    await batch.commit();
  }
}

/* ---------------------------- 設定（1件） ---------------------------- */

const settingsRef = doc(db, "settings", "app");

/** settings/app を購読し、[設定, 一部を更新する関数] を返す。 */
export function useSettings(enabled, onError) {
  const [settings, setSettings] = useState({});
  const ref = useRef({});
  useEffect(() => {
    if (!enabled) return undefined;
    return onSnapshot(
      settingsRef,
      (snap) => {
        const v = snap.exists() ? snap.data() : {};
        ref.current = v;
        setSettings(v);
      },
      (err) => onError && onError(err)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
  const update = useCallback((patch) => {
    const value = typeof patch === "function" ? patch(ref.current) : patch;
    ref.current = { ...ref.current, ...value };
    setSettings(ref.current);
    return setDoc(settingsRef, JSON.parse(JSON.stringify(value)), { merge: true }).catch((err) => onError && onError(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [settings, update];
}
