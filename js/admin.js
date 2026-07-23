// js/admin.js
import { auth, db } from './firebase.js';
import { 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { 
    collection, 
    addDoc, 
    doc, 
    deleteDoc, 
    serverTimestamp, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// DOM Node Element Declarations
const loginCard = document.getElementById('admin-login-card');
const dashboardPanel = document.getElementById('admin-dashboard-panel');
const loginForm = document.getElementById('admin-login-form');
const logoutBtn = document.getElementById('admin-logout-btn');
const uploadForm = document.getElementById('resource-upload-form');
const fileInput = document.getElementById('res-file');
const fileNameDisplay = document.getElementById('file-name-display');
const progressContainer = document.getElementById('upload-progress-container');
const progressBar = document.getElementById('upload-progress-bar');
const progressPercentage = document.getElementById('upload-percentage');
const submitBtn = document.getElementById('submit-upload-btn');
const adminList = document.getElementById('admin-materials-list');

// Target Verification String Configuration
const ADMIN_EMAIL_TARGET = "admin@studenthub.com"; 

// 1. Session Auth Observer Pipeline
onAuthStateChanged(auth, (user) => {
    if (user && user.email === ADMIN_EMAIL_TARGET) {
        if (loginCard) loginCard.classList.add('hidden');
        if (dashboardPanel) dashboardPanel.classList.remove('hidden');
    } else {
        if (dashboardPanel) dashboardPanel.classList.add('hidden');
        if (loginCard) loginCard.classList.remove('hidden');
    }
});

// 2. Execute Admin Authentication Requests
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('admin-email').value.trim();
        const password = document.getElementById('admin-password').value;

        if (email !== ADMIN_EMAIL_TARGET) {
            alert("Security Violation Exception: Input identifier parameters do not possess administrative permissions.");
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            alert(`Authentication Request Refused: ${error.message}`);
        }
    });
}

// 3. Clear Active Management Sessions
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => signOut(auth));
}

// Visual File Tracking Hook Function
if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        const structuralFile = e.target.files[0];
        if (structuralFile) {
            fileNameDisplay.textContent = `Target Asset Queued: ${structuralFile.name} (${(structuralFile.size / (1024 * 1024)).toFixed(2)} MB)`;
            fileNameDisplay.classList.remove('hidden');
        }
    });
}

// 4. Resource Upload & Database Publishing
if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const targetFile = fileInput.files[0];
        const selectedClass = document.getElementById('res-class').value;
        const subject = document.getElementById('res-subject').value.trim();
        const title = document.getElementById('res-title').value.trim();
        const description = document.getElementById('res-description').value.trim();

        // Validation check
        if (!targetFile || targetFile.type !== "application/pdf") {
            alert("Structural Reject Exception: Upload asset must present pure application/pdf type headers.");
            return;
        }

        // Freeze interface elements
        if (submitBtn) submitBtn.disabled = true;
        if (progressContainer) progressContainer.classList.remove('hidden');

        // Step progress indicator
        if (progressBar) progressBar.style.width = '50%';
        if (progressPercentage) progressPercentage.textContent = '50%';

        try {
            // Standardize file name & fix duplicate extensions
            let clearedFileName = targetFile.name.replace(/\s+/g, '_');
            if (clearedFileName.endsWith('.pdf.pdf')) {
                clearedFileName = clearedFileName.replace('.pdf.pdf', '.pdf');
            }
            
            // Relative path for GitHub Pages & Local compatibility
            const localDistributionUrl = `materials/${clearedFileName}`;

            if (progressBar) progressBar.style.width = '100%';
            if (progressPercentage) progressPercentage.textContent = '100%';

            // Document payload formatted for app.js filters
            const payload = {
                course: selectedClass,        // Matched for course filter
                academicClass: selectedClass, 
                class: selectedClass,         
                subject: subject,             // Matched for subject filter
                title: title,
                description: description || 'Official study notes uploaded for student review.',
                fileUrl: localDistributionUrl, 
                fileSize: `${(targetFile.size / (1024 * 1024)).toFixed(2)} MB`,
                downloadCount: 0,
                uploadedAt: serverTimestamp()
            };

            // Saves to both "materials" AND "resources" collections
            await addDoc(collection(db, "materials"), payload);
            await addDoc(collection(db, "resources"), payload);

            alert(`Study material successfully uploaded and published under ${selectedClass} - ${subject}!`);
            uploadForm.reset();
            resetUploadFormControls();
        } catch (dbError) {
            console.error("Upload error:", dbError);
            alert(`Firestore Mapping Error: ${dbError.message}`);
            resetUploadFormControls();
        }
    });
}

// Reset Interface Controls Utility Function
function resetUploadFormControls() {
    if (submitBtn) submitBtn.disabled = false;
    if (progressContainer) progressContainer.classList.add('hidden');
    if (progressBar) progressBar.style.width = '0%';
    if (progressPercentage) progressPercentage.textContent = '0%';
    if (fileNameDisplay) fileNameDisplay.classList.add('hidden');
}

// 5. Fetch and Display Uploaded Materials in Admin Panel
if (adminList) {
    onSnapshot(collection(db, "materials"), (snapshot) => {
        adminList.innerHTML = '';
        if (snapshot.empty) {
            adminList.innerHTML = '<p class="text-slate-500 text-sm">No uploaded materials found.</p>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;

            const item = document.createElement('div');
            item.className = 'flex items-center justify-between p-3 bg-slate-50 dark:bg-gray-800/60 rounded-xl border border-slate-200 dark:border-gray-700';
            item.innerHTML = `
                <div>
                    <h4 class="font-bold text-slate-800 dark:text-gray-200 text-sm">${data.title || 'Untitled'}</h4>
                    <p class="text-xs text-slate-500 dark:text-gray-400">${data.course || data.class || ''} • ${data.subject || ''}</p>
                </div>
                <button onclick="window.deleteMaterial('${id}')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-bold transition">
                    Delete
                </button>
            `;
            adminList.appendChild(item);
        });
    });
}

// 6. Global Delete Function
window.deleteMaterial = async function(docId) {
    if (confirm("Are you sure you want to delete this study material from the database?")) {
        try {
            await deleteDoc(doc(db, "materials", docId));
            await deleteDoc(doc(db, "resources", docId));
            alert("Material deleted successfully!");
        } catch (error) {
            console.error("Delete Error:", error);
            alert(`Error deleting material: ${error.message}`);
        }
    }
};