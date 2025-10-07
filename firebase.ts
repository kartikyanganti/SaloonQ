// firebase.ts
import { getApp } from "@react-native-firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from "@react-native-firebase/auth";
import { getFirestore } from "@react-native-firebase/firestore";

// 🔹 Initialize Native Firebase App
const app = getApp();

// ✅ Instances
export const auth = getAuth(app);
export const firestore = getFirestore(app);

// ✅ Export Auth helpers (clean imports in screens)
export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
};
