// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDXai5SE3wpyW0qo2cbQMrGCZJ40LLgYjI",
  authDomain: "foneflow-6d122.firebaseapp.com",
  projectId: "foneflow-6d122",
  storageBucket: "foneflow-6d122.appspot.com",
  messagingSenderId: "220460888013",
  appId: "1:220460888013:web:c888aac02058d4a2cd1e84",
  measurementId: "G-75JDW3V68N"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db, firebaseConfig };
