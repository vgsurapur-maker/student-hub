// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDWNIVlRSRdAaB5diUKO0qdxwfT67WPBCQ",
  authDomain: "student-hub-12.firebaseapp.com",
  projectId: "student-hub-12",
  storageBucket: "student-hub-12.firebasestorage.app",
  messagingSenderId: "45803687369",
  appId: "1:45803687369:web:524a611980cd9fc1272c18",
  // If Firebase gave you a measurementId on your screen (starts with "G-"), paste it below:
  // measurementId: "G-XXXXXXXXXX"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize & Export Services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);