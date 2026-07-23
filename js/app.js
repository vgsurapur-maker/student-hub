// js/app.js
import { db, auth } from './firebase.js';
import { collection, onSnapshot, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

// =========================================================================
// GLOBAL STATE MANAGEMENT
// =========================================================================
let currentSelectedCourse = '2nd PUC'; // Default selected course
let currentSelectedSubject = 'all';
let appResources = [];
let currentUser = null;

// =========================================================================
// 1. LISTEN TO FIRESTORE REAL-TIME DATA
// =========================================================================
const materialsRef = collection(db, "materials");

onSnapshot(materialsRef, (snapshot) => {
    appResources = [];
    snapshot.forEach((doc) => {
        const data = doc.data();
        appResources.push({
            id: doc.id,
            title: data.title || 'Study Material',
            course: data.course || data.class || data.academicClass || 'SSLC',
            subject: data.subject || '',
            description: data.description || 'It is for KSEB student.',
            fileUrl: data.fileUrl || '#'
        });
    });

    // Automatically build subject filters and grid cards when Firebase data arrives
    renderSubjectFilters();
    renderResourcesGrid();
}, (error) => {
    console.error("Firestore error:", error);
});

// =========================================================================
// 2. COURSE FILTERING (GLOBAL WINDOW BINDING)
// =========================================================================
window.filterHomePageClass = function(course) {
    currentSelectedCourse = course;
    currentSelectedSubject = 'all'; // Reset subject selection on course change

    // Update Heading Text
    const sectionTitle = document.getElementById('section-title');
    if (sectionTitle) {
        sectionTitle.innerText = (course === 'all' || course === 'All') 
            ? 'Featured Study Materials' 
            : `${course} Study Materials`;
    }

    // Refresh UI Components
    updateCourseButtonsUI(course);
    renderSubjectFilters();
    renderResourcesGrid();
};

// =========================================================================
// 3. SUBJECT FILTERING (GLOBAL WINDOW BINDING)
// =========================================================================
window.filterHomePageSubject = function(subject) {
    currentSelectedSubject = subject;
    renderSubjectFilters();
    renderResourcesGrid();
};

// =========================================================================
// 4. DYNAMIC SUBJECT FILTER BUTTON GENERATOR
// =========================================================================
function renderSubjectFilters() {
    const subjectContainer = document.getElementById('subject-filter-container');
    const subjectList = document.getElementById('subject-buttons-list');

    if (!subjectContainer || !subjectList) return;

    // Filter resources for the active course selection
    const courseResources = (currentSelectedCourse === 'all' || currentSelectedCourse === 'All')
        ? appResources
        : appResources.filter(res => res.course.toLowerCase() === currentSelectedCourse.toLowerCase());

    // Extract UNIQUE subjects available in database for this course
    const availableSubjects = [...new Set(
        courseResources
            .map(res => res.subject)
            .filter(subj => subj && subj.trim() !== '')
    )];

    // Hide container if no subjects exist for selected course
    if (availableSubjects.length === 0) {
        subjectContainer.classList.add('hidden');
        return;
    }

    subjectContainer.classList.remove('hidden');

    // Create "All Subjects" pill button
    let html = `
        <button onclick="filterHomePageSubject('all')" 
            class="px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentSelectedSubject === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }">
            All Subjects
        </button>
    `;

    // Render individual subject pill buttons
    availableSubjects.forEach(subject => {
        const isActive = currentSelectedSubject.toLowerCase() === subject.toLowerCase();
        html += `
            <button onclick="filterHomePageSubject('${subject}')" 
                class="px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }">
                ${subject}
            </button>
        `;
    });

    subjectList.innerHTML = html;
}

// =========================================================================
// 5. PREMIUM CARDS GRID RENDERER
// =========================================================================
function renderResourcesGrid() {
    const grid = document.getElementById('dynamic-resources-grid');
    if (!grid) return;

    let filtered = appResources.filter(res => {
        const matchesCourse = (currentSelectedCourse === 'all' || currentSelectedCourse === 'All') || 
                              res.course.toLowerCase() === currentSelectedCourse.toLowerCase();
        const matchesSubject = (currentSelectedSubject === 'all') || 
                               res.subject.toLowerCase() === currentSelectedSubject.toLowerCase();
        return matchesCourse && matchesSubject;
    });

    // Empty State UI
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full glass-card border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center">
                <div class="h-16 w-16 bg-blue-50 dark:bg-blue-950/50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
                    <i class="fa-solid fa-folder-open"></i>
                </div>
                <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200">No Materials Available</h3>
                <p class="text-xs text-slate-400 mt-1">
                    No uploaded resources match "${currentSelectedCourse}" ${currentSelectedSubject !== 'all' ? '→ ' + currentSelectedSubject : ''}.
                </p>
            </div>
        `;
        return;
    }

    // Dynamic Cards Grid Layout
    grid.innerHTML = filtered.map(res => `
        <div class="group glass-card border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between">
            <div>
                <!-- Tag Badges -->
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-blue-300 rounded-full border border-blue-200/40 dark:border-blue-800/40">
                            ${res.course}
                        </span>
                        ${res.subject ? `
                            <span class="text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 bg-purple-50 text-purple-600 dark:bg-purple-950/80 dark:text-purple-300 rounded-full border border-purple-200/40 dark:border-purple-800/40">
                                ${res.subject}
                            </span>
                        ` : ''}
                    </div>
                    <span class="text-[11px] font-bold text-rose-500 dark:text-rose-400 flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-full border border-rose-200/40 dark:border-rose-900/40">
                        <i class="fa-solid fa-file-pdf"></i> PDF
                    </span>
                </div>

                <!-- Title & Description -->
                <h4 class="font-bold text-base text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 mb-2">
                    ${res.title}
                </h4>
                <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-6 leading-relaxed">
                    ${res.description}
                </p>
            </div>

            <!-- Download Button -->
            <a href="${res.fileUrl}" download target="_blank" class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold py-3.5 rounded-2xl transition-all duration-300 shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 group-hover:scale-[1.01]">
                <i class="fa-solid fa-arrow-down-to-line"></i> Download PDF Asset
            </a>
        </div>
    `).join('');
}

// =========================================================================
// 6. HIGHLIGHT ACTIVE COURSE BUTTON STYLE
// =========================================================================
function updateCourseButtonsUI(activeCourse) {
    const buttons = document.querySelectorAll('.course-pill-btn, [onclick^="filterHomePageClass"]');
    buttons.forEach(btn => {
        const btnOnclick = btn.getAttribute('onclick') || '';
        const btnDataClass = btn.getAttribute('data-class') || '';

        if (btnOnclick.includes(`'${activeCourse}'`) || btnDataClass.toLowerCase() === activeCourse.toLowerCase()) {
            btn.className = 'course-pill-btn px-5 py-2 rounded-2xl text-xs font-bold transition-all duration-300 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 scale-105';
        } else {
            btn.className = 'course-pill-btn px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-300 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-blue-500 shadow-sm';
        }
    });
}

// =========================================================================
// 7. GOOGLE AUTHENTICATION & STUDENT PROFILE SYSTEM
// =========================================================================
const googleLoginBtn = document.getElementById('google-login-btn');
const saveProfileBtn = document.getElementById('save-profile-btn');
const googleSection = document.getElementById('google-signin-section');
const profileSection = document.getElementById('profile-registration-section');
const navUserStatus = document.getElementById('nav-user-status');

if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            currentUser = result.user;

            // Check if profile exists in database
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            if (userDoc.exists()) {
                if (window.closeAuthModal) window.closeAuthModal();
            } else {
                // Show Step 2 Registration Form
                if (googleSection) googleSection.classList.add('hidden');
                if (profileSection) profileSection.classList.remove('hidden');
            }
        } catch (err) {
            console.error("Authentication Error:", err);
            alert("Google Sign-in failed: " + err.message);
        }
    });
}

if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', async () => {
        if (!currentUser) return;

        const name = document.getElementById('profile-name')?.value.trim();
        const phone = document.getElementById('profile-phone')?.value.trim();
        const studentClass = document.getElementById('profile-class')?.value;
        const dob = document.getElementById('profile-dob')?.value;

        if (!name || !phone || !studentClass || !dob) {
            alert("Please complete all registration fields.");
            return;
        }

        try {
            await setDoc(doc(db, "users", currentUser.uid), {
                name: name,
                email: currentUser.email,
                phone: phone,
                class: studentClass,
                dob: dob,
                registeredAt: new Date().toISOString()
            });

            if (window.closeAuthModal) window.closeAuthModal();
        } catch (err) {
            console.error("Save Profile Error:", err);
            alert("Failed to save profile: " + err.message);
        }
    });
}

// Listen to Authentication State Changes
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user && navUserStatus) {
        navUserStatus.innerHTML = `
            <div class="flex items-center gap-3">
                <img src="${user.photoURL || 'https://via.placeholder.com/40'}" class="w-8 h-8 rounded-full border border-blue-500 shadow-sm" alt="User Avatar">
                <button id="logout-btn" class="text-xs font-bold text-slate-500 hover:text-rose-500 transition-colors flex items-center gap-1">
                    <i class="fa-solid fa-right-from-bracket"></i> Sign Out
                </button>
            </div>
        `;
        document.getElementById('logout-btn')?.addEventListener('click', () => signOut(auth));
    } else if (navUserStatus) {
        navUserStatus.innerHTML = `
            <button onclick="openAuthModal()" class="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98]">
                <i class="fa-solid fa-user-circle mr-1.5"></i> Student Sign In
            </button>
        `;
    }
});

// =========================================================================
// 8. DARK / LIGHT THEME TOGGLE
// =========================================================================
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });

    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}