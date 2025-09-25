import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAgpzJU-YSxHaH4n3eoD8EIMKy4IdJnfsc",
  authDomain: "sihsample2.firebaseapp.com",
  projectId: "sihsample2",
  storageBucket: "sihsample2.firebasestorage.app",
  messagingSenderId: "485080992031",
  appId: "1:485080992031:web:783711de1bf61aa565082a",
  measurementId: "G-KZQBCW28X3"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

let resolveAuthReady;
export const authReady = new Promise((resolve) => { resolveAuthReady = resolve; });

onAuthStateChanged(auth, (user) => {
  if (!user) {
    console.log('No user found, signing in anonymously...');
    signInAnonymously(auth)
      .then((userCredential) => {
        console.log('Anonymous sign-in successful:', userCredential.user.uid);
        resolveAuthReady();
      })
      .catch((error) => {
        console.error('Anonymous sign-in failed:', error);
        resolveAuthReady(); // Resolve anyway to prevent hanging
      });
  } else {
    console.log('User already signed in:', user.uid);
    resolveAuthReady();
  }
});