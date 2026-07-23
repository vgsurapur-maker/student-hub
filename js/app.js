// js/app.js
import { auth, db } from './firebase.js';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { doc, setDoc, getDoc, collection, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// DOM Elements
const googleSection = document.getElementById('google-signin-section');
const profileSection = document.getElementById('profile-registration-section');
const googleLoginBtn = document.getElementById('google-login-btn');
const saveProfileBtn = document.getElementById('save-profile-btn');
const navUserStatus = document.getElementById('nav-user-status');

const nameInput = document.getElementById('profile-name');
const phoneInput = document.getElementById('profile-phone');
const classInput = document.getElementById('profile-class');
const dobInput = document.getElementById('profile-dob');

const googleProvider = new GoogleAuthProvider();

// Store all fetched materials locally
let cachedMaterials = [];

// -------------------------------------------------------------
// 1. Session Observer
// -------------------------------------------------------------
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            const displayName = userData.fullName || userData.name || user.displayName || user.email.split('@')[0];

            if (navUserStatus) {
                navUserStatus.innerHTML = `
                    <div class="flex items-center gap-3">
                        <span class="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            <i class="fa-solid fa-circle-user"></i> ${displayName}
                        </span>
                        <button id="student-logout-btn" class="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all">
                            Logout
                        </button>
                    </div>
                `;
                document.getElementById('student-logout-btn').addEventListener('click', () => signOut(auth));
            }
            if (typeof window.closeAuthModal === 'function') window.closeAuthModal();
        } else {
            if (typeof window.openAuthModal === 'function') window.openAuthModal();
            if (googleSection) googleSection.classList.add('hidden');
            if (profileSection) profileSection.classList.remove('hidden');
            if (nameInput && user.displayName) nameInput.value = user.displayName;
        }
    } else {
        if (navUserStatus) {
            navUserStatus.innerHTML = `
                <button onclick="openAuthModal()" class="bg-primary hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm">
                    Student Sign In
                </button>
            `;
        }
        if (googleSection) googleSection.classList.remove('hidden');
        if (profileSection) profileSection.classList.add('hidden');
    }
});

// -------------------------------------------------------------
// 2. Google Login
// -------------------------------------------------------------
if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Google Auth Error: ", error);
            alert(`Google Sign-In Error: ${error.message}`);
        }
    });
}

// -------------------------------------------------------------
// 3. Save Profile
// -------------------------------------------------------------
if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', async () => {
        const activeUser = auth.currentUser;
        if (!activeUser) return alert("Session expired. Please sign in again.");

        const studentName = nameInput ? nameInput.value.trim() : '';
        const rawPhone = phoneInput ? phoneInput.value.trim() : '';
        const studentClass = classInput ? classInput.value : '';
        const studentDob = dobInput ? dobInput.value : '';

        if (!studentName || !rawPhone || !studentClass || !studentDob) {
            return alert("Please fill in all fields.");
        }

        if (!/[6-9][0-9]{9}/.test(rawPhone) || rawPhone.length !== 10) {
            return alert("Please enter a valid 10-digit mobile contact number.");
        }

        saveProfileBtn.disabled = true;
        saveProfileBtn.textContent = "Saving Account Details...";

        try {
            await setDoc(doc(db, "users", activeUser.uid), {
                fullName: studentName,
                email: activeUser.email,
                mobileNumber: `+91${rawPhone}`,
                academicClass: studentClass,
                dateOfBirth: studentDob,
                registrationTimestamp: serverTimestamp()
            });

            alert("Registration successful! Access granted.");
            if (typeof window.closeAuthModal === 'function') window.closeAuthModal();
            window.location.reload();
        } catch (dbError) {
            console.error("Database Write Error: ", dbError);
            alert(`Database Error: ${dbError.message}`);
            saveProfileBtn.disabled = false;
            saveProfileBtn.textContent = "Complete Registration & Unlock Access";
        }
    });
}

// -------------------------------------------------------------
// 4. Robust Material Fetcher & Renderer (Reads resources & materials)
// -------------------------------------------------------------
export async function loadHomePageMaterials(selectedClass = 'all') {
    const materialsGrid = document.getElementById('dynamic-resources-grid');
    const sectionTitle = document.getElementById('section-title');
    if (!materialsGrid) return;

    if (sectionTitle) {
        sectionTitle.textContent = selectedClass === 'all' 
            ? 'Featured Study Materials' 
            : `${selectedClass} Study Materials`;
    }

    try {
        if (cachedMaterials.length === 0) {
            cachedMaterials = [];

            // Query "resources" collection (matches your Firebase console)
            try {
                const resSnapshot = await getDocs(collection(db, "resources"));
                resSnapshot.forEach(docSnap => {
                    cachedMaterials.push({ id: docSnap.id, ...docSnap.data() });
                });
            } catch (e) {
                console.warn("Could not read resources collection:", e);
            }

            // Query "materials" collection
            try {
                const matSnapshot = await getDocs(collection(db, "materials"));
                matSnapshot.forEach(docSnap => {
                    cachedMaterials.push({ id: docSnap.id, ...docSnap.data() });
                });
            } catch (e) {
                console.warn("Could not read materials collection:", e);
            }

            console.log("Fetched total items count:", cachedMaterials.length, cachedMaterials);
        }

        // Filter client-side (Case-Insensitive check for class / academicClass / course)
        const filtered = cachedMaterials.filter(item => {
            if (selectedClass === 'all') return true;
            const itemClass = (item.academicClass || item.class || item.course || '').toString().trim().toLowerCase();
            return itemClass === selectedClass.trim().toLowerCase();
        });

        materialsGrid.innerHTML = '';

        if (filtered.length === 0) {
            materialsGrid.innerHTML = `
                <div class="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                    <i class="fa-solid fa-folder-open text-4xl mb-3 text-gray-400"></i>
                    <p class="font-bold text-lg">No Materials Available</p>
                    <p class="text-sm">No uploaded resources match "${selectedClass}". (Total database items: ${cachedMaterials.length})</p>
                </div>
            `;
            return;
        }

        filtered.forEach((material) => {
            const card = document.createElement('div');
            card.className = "bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-800/60 flex flex-col justify-between hover:shadow-2xl transition-all";

            const displayClass = (material.academicClass || material.class || material.course || 'General').toUpperCase();
            const displayTitle = material.title || material.subject || 'Untitled Study Material';
            const fileLink = material.fileUrl || material.pdfUrl || '#';

            card.innerHTML = `
                <div>
                    <div class="flex justify-between items-center mb-4">
                        <span class="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full dark:bg-blue-900/50 dark:text-blue-300">
                            ${displayClass}
                        </span>
                        <span class="text-xs text-gray-400"><i class="fa-solid fa-file-pdf text-red-500 mr-1"></i> PDF</span>
                    </div>
                    <h3 class="text-xl font-bold mb-2 text-gray-900 dark:text-white">${displayTitle}</h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">${material.description || 'Official study notes uploaded for student review.'}</p>
                </div>
                <button onclick="handleSecureDownload('${fileLink}', '${displayTitle}')" 
                        class="w-full mt-6 bg-primary hover:bg-blue-800 dark:bg-secondary dark:hover:bg-blue-600 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md">
                    <i class="fa-solid fa-arrow-down-to-line"></i> Download PDF Asset
                </button>
            `;

            materialsGrid.appendChild(card);
        });

    } catch (error) {
        console.error("Error fetching materials: ", error);
        materialsGrid.innerHTML = `
            <div class="col-span-full text-center text-red-500 py-8 font-semibold">
                Error connecting to database: ${error.message}
            </div>
        `;
    }
}

// Update Active Button Style
function updateActivePill(selectedClass) {
    const pills = document.querySelectorAll('.course-pill-btn');
    pills.forEach(pill => {
        const pillClass = pill.getAttribute('data-class');
        if (pillClass === selectedClass) {
            pill.className = "course-pill-btn bg-secondary text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm";
        } else {
            pill.className = "course-pill-btn bg-white dark:bg-gray-900 border dark:border-gray-800 text-gray-700 dark:text-gray-300 text-xs font-bold px-4 py-2 rounded-xl hover:border-secondary transition-all";
        }
    });
}

// Global Filter Call
window.filterHomePageClass = function(className) {
    updateActivePill(className);
    loadHomePageMaterials(className);
};

// Global Download Guard
window.handleSecureDownload = function(fileUrl, title) {
    if (!auth.currentUser) {
        alert("Authentication Required: Please sign in to download study materials.");
        if (typeof window.openAuthModal === 'function') window.openAuthModal();
        return;
    }
    if (fileUrl && fileUrl !== '#') {
        window.open(fileUrl, '_blank');
    } else {
        alert("File link is invalid or missing in database record.");
    }
};

// Theme Toggle
const themeToggleBtn = document.getElementById('theme-toggle');
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
    });
}

// Initial Run
document.addEventListener('DOMContentLoaded', () => {
    loadHomePageMaterials('all');
});
// Paste inside js/app.js

let currentCourse = 'SSLC';
let currentSubject = 'All';

// Retrieve materials array from localStorage or Firebase
let uploadedMaterials = JSON.parse(localStorage.getItem('materials')) || [];

function selectCourse(course) {
    currentCourse = course;
    currentSubject = 'All';

    const courseHeading = document.getElementById('course-heading');
    if (courseHeading) {
        courseHeading.innerText = `${course} Study Materials`;
    }

    renderSubjectFilters();
    renderMaterials();
}

function renderSubjectFilters() {
    const subjectContainer = document.getElementById('subject-container');
    const subjectButtonsDiv = document.getElementById('subject-buttons');

    if (!subjectContainer || !subjectButtonsDiv) return;

    // Filter items belonging to the selected course
    const courseMaterials = currentCourse === 'All' 
        ? uploadedMaterials 
        : uploadedMaterials.filter(item => item.course === currentCourse);

    // Extract ONLY unique subjects that exist in uploaded materials
    const availableSubjects = [...new Set(courseMaterials.map(item => item.subject))];

    // Hide filter bar if no subjects exist for this course yet
    if (availableSubjects.length === 0) {
        subjectContainer.classList.add('hidden');
        return;
    }

    subjectContainer.classList.remove('hidden');

    let buttonsHTML = `
        <button onclick="selectSubject('All')" 
            class="px-3 py-1 text-xs font-semibold rounded-lg transition ${
                currentSubject === 'All' 
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
            }">
            All Subjects
        </button>
    `;

    // Only create buttons for subjects present in uploaded notes (e.g., Mathematics, Kannada, Physics)
    availableSubjects.forEach(subject => {
        const isActive = currentSubject === subject;
        buttonsHTML += `
            <button onclick="selectSubject('${subject}')" 
                class="px-3 py-1 text-xs font-semibold rounded-lg transition ${
                    isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                }">
                ${subject}
            </button>
        `;
    });

    subjectButtonsDiv.innerHTML = buttonsHTML;
}

function selectSubject(subject) {
    currentSubject = subject;
    renderSubjectFilters();
    renderMaterials();
}

function renderMaterials() {
    const materialsList = document.getElementById('materials-list');
    if (!materialsList) return;

    let filtered = uploadedMaterials.filter(item => {
        const matchesCourse = currentCourse === 'All' || item.course === currentCourse;
        const matchesSubject = currentSubject === 'All' || item.subject === currentSubject;
        return matchesCourse && matchesSubject;
    });

    if (filtered.length === 0) {
        materialsList.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 text-center">
                <i class="fa-solid fa-folder-open text-5xl text-gray-300 mb-4"></i>
                <h3 class="text-lg font-bold text-gray-700 dark:text-gray-300">No Materials Available</h3>
                <p class="text-sm text-gray-400 mt-1">No uploaded resources match "${currentCourse}" ${currentSubject !== 'All' ? '- ' + currentSubject : ''}.</p>
            </div>
        `;
        return;
    }

    materialsList.innerHTML = filtered.map(item => `
        <div class="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm mb-3 flex justify-between items-center">
            <div>
                <span class="text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded dark:bg-blue-950 dark:text-blue-300">${item.subject}</span>
                <h4 class="font-bold text-gray-900 dark:text-white mt-1">${item.title}</h4>
            </div>
            <a href="${item.fileUrl}" download class="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition">
                Download PDF
            </a>
        </div>
    `).join('');
}

// Automatically load SSLC course view when page loads
document.addEventListener('DOMContentLoaded', () => {
    selectCourse('SSLC');
});