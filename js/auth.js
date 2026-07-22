import { auth, db } from './firebase.js';
import { RecaptchaVerifier, signInWithPhoneNumber } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

let confirmationResultMap = null;

// 1. Initialize the Spam-Bot Protection Widget
window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    'size': 'invisible', // Invisible ensures users don't have to click traffic lights
    'callback': (response) => { /* Recaptcha solved */ }
});

// 2. Trigger Text Message Request
document.getElementById('send-otp-btn').addEventListener('click', async () => {
    const phoneNumber = document.getElementById('user-phone').value.trim();
    const appVerifier = window.recaptchaVerifier;

    try {
        // Firebase dispatches text message containing dynamic code variables
        confirmationResultMap = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        alert("OTP successfully dispatched to device!");
        document.getElementById('otp-section').classList.remove('hidden');
    } catch (error) {
        alert(`SMS Dispatch Error: ${error.message}`);
    }
});

// 3. Confirm Code Verification
document.getElementById('verify-otp-btn').addEventListener('click', async () => {
    const code = document.getElementById('otp-code').value.trim();

    try {
        // Authenticate input parameters
        const credentialResult = await confirmationResultMap.confirm(code);
        const loggedInUser = credentialResult.user;
        
        alert("Authentication confirmed! Please complete profile data entries.");
        
        // Advance user interface panels
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('profile-section').classList.remove('hidden');
    } catch (error) {
        alert(`Invalid OTP Parameter Exception: ${error.message}`);
    }
});

// 4. Commit Profile Details to Cloud Firestore Database
document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const currentUser = auth.currentUser;
    
    // Capture profile entries
    const name = document.getElementById('user-name').value.trim();
    const currentClass = document.getElementById('user-class').value.trim();
    const dob = document.getElementById('user-dob').value;

    if (!currentUser) return;

    try {
        // 🚀 BEST PRACTICE: Save details using the user's exact account UID as the document path ID
        await setDoc(doc(db, "users", currentUser.uid), {
            fullName: name,
            studentClass: currentClass,
            dateOfBirth: dob,
            mobileNumber: currentUser.phoneNumber, // Automatically grabbed from authentication
            accountCreated: serverTimestamp()
        });

        alert("Profile operational matrix established! Welcome aboard.");
        window.location.href = "index.html"; // Forward to student portal landing area
    } catch (dbError) {
        alert(`Firestore Profile Registry Error: ${dbError.message}`);
    }
});