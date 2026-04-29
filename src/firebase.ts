import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDvlFfoIs70xpp7tHSvju4ZoF85QD58gl8",
  authDomain: "boxibox-7c208.firebaseapp.com",
  projectId: "boxibox-7c208",
  storageBucket: "boxibox-7c208.firebasestorage.app",
  messagingSenderId: "873208205230",
  appId: "1:873208205230:web:edc8be096e52c321ccc23f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
