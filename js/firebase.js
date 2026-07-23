// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDWNIVlRSRdAaB5diUKOOqdxwfT67WPBCQ",
  authDomain: "student-hub-12.firebaseapp.com",
  projectId: "student-hub-12",
  storageBucket: "student-hub-12.firebasestorage.app",
  messagingSenderId: "45803687369",
  appId: "1:45803687369:web:524a611980cd9fc1272c18"
};

// Initialize the live connection engines
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
import { getAnalytics } from "firebase/analytics";
const analytics = getAnalytics(app);