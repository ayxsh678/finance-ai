import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDdijXJmuKeCx1VJSzuhcLHaNSTxMlFcvU",
  authDomain: "fintrest-7af4c.firebaseapp.com",
  projectId: "fintrest-7af4c",
  storageBucket: "fintrest-7af4c.firebasestorage.app",
  messagingSenderId: "887327214605",
  appId: "1:887327214605:web:12ad6dbad88f75f6275944",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
