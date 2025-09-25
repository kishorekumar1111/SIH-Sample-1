import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCK2ORtYom1vazNQzlkjueIHaNVpoby210",
  authDomain: "pwartc.firebaseapp.com",
  projectId: "pwartc",
  // Use the bucket shown in Storage settings. For Firebase Web SDK, this is usually <project-id>.appspot.com
  storageBucket: "pwartc.appspot.com",
  messagingSenderId: "438767032334",
  appId: "1:438767032334:web:568afc759290752e4b845f",
  measurementId: "G-WBHSVNM5Q7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

let resolveAuthReady;
export const authReady = new Promise((resolve) => { resolveAuthReady = resolve; });

onAuthStateChanged(auth, (user) => {
  if (!user) {
    signInAnonymously(auth)
      .catch((error) => {
        // Log the error for debugging
        console.error("Anonymous sign-in failed:", error);
      })
      .finally(() => {
        if (resolveAuthReady) resolveAuthReady();
      });
  } else {
    if (resolveAuthReady) resolveAuthReady();
  }
});
