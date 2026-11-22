import {initializeApp} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut}
  from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {getFirestore, collection, doc, onSnapshot, runTransaction}
  from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyD31tDnw_aN7q18BivKNSadcAEeU9MWXPs",
  authDomain: "aspiranty-nubip.firebaseapp.com",
  projectId: "aspiranty-nubip",
  appId: "1:1049436939866:web:b17f49810668d3cec85a63"
}, "nubip-education");
const auth = getAuth(app);
const db = getFirestore(app);
const owner = "boiarchuk.serhii@gmail.com";
const maxBytes = 850000;

export const observe = callback => onAuthStateChanged(auth, callback);
export const exit = () => signOut(auth);
export const isOwner = user => Boolean(user?.emailVerified && user.email === owner
  && user.providerData.some(provider => provider.providerId === "google.com"));

export async function enter() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({prompt: "select_account"});
  await signInWithPopup(auth, provider);
}

function accountDocument(user) {
  if (auth.currentUser?.uid !== user.uid || !isOwner(user)) {
    throw Error("Увійдіть під Google-акаунтом власника.");
  }
  return doc(db, "nubipEducation", user.uid);
}

function read(snapshot) {
  if (!snapshot.exists()) return {revision: 0, records: {}};
  const {revision, content} = snapshot.data();
  const records = JSON.parse(content);
  if (!Number.isSafeInteger(revision) || revision < 1 || !records
      || typeof records !== "object" || Array.isArray(records)) {
    throw Error("Не вдалося прочитати дані облікового запису.");
  }
  return {revision, records};
}

export function watch(user, receive, fail) {
  return onSnapshot(accountDocument(user), {includeMetadataChanges: true}, snapshot => {
    if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
    try { receive(read(snapshot)); } catch (error) { fail(error); }
  }, fail);
}

export function watchRegistry(user, receive, fail) {
  accountDocument(user);
  const registry = collection(db, "workspaces", "aspirantura-nubip", "registry");
  return onSnapshot(registry, {includeMetadataChanges: true}, snapshot => {
    if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
    try {
      const documents = new Map(snapshot.docs.map(item => [item.id, item.data()]));
      const meta = documents.get("meta");
      if (!meta && documents.size === 0) {
        receive([]);
        return;
      }
      if (!Number.isSafeInteger(meta?.revision) || meta.revision < 1
          || !Number.isInteger(meta.count) || meta.count < 0 || meta.count > 32) {
        throw Error("Не вдалося прочитати реєстр аспірантів.");
      }
      const cards = [];
      for (let index = 0; index < meta.count; index++) {
        const part = documents.get("part-" + index);
        if (part?.revision !== meta.revision || typeof part.data !== "string") {
          throw Error("Реєстр аспірантів отримано не повністю.");
        }
        const rows = JSON.parse(part.data);
        if (!Array.isArray(rows)) throw Error("Некоректні дані реєстру аспірантів.");
        cards.push(...rows);
      }
      receive(cards);
    } catch (error) { fail(error); }
  }, fail);
}

export async function save(user, expectedRevision, records) {
  const ref = accountDocument(user);
  const content = JSON.stringify(records);
  if (new TextEncoder().encode(content).length > maxBytes) {
    throw Error("Дані перевищують допустимий розмір хмарного сховища.");
  }
  const revision = expectedRevision + 1;
  await runTransaction(db, async transaction => {
    const previous = read(await transaction.get(ref));
    if (previous.revision !== expectedRevision) {
      throw Error("Дані вже змінилися в іншому сеансі. Відкрийте форму знову.");
    }
    transaction.set(ref, {revision, content});
  });
  return {revision, records};
}
