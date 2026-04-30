import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA4EY0rZm88eb_3zlKVR927HaNqNPAuMy0",
  authDomain: "boxibox-34a71.firebaseapp.com",
  projectId: "boxibox-34a71",
  storageBucket: "boxibox-34a71.firebasestorage.app",
  messagingSenderId: "213238099905",
  appId: "1:213238099905:web:91152d61f6ff370b244940"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
