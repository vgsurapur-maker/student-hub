// js/downloads.js
import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs, query, where, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// DOM References
const navUserStatus = document.getElementById('nav-user-status');
const userBadge = document.getElementById('user-badge');
const materialsGrid = document.getElementById('materials-grid');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('resource-search');
const filterTabs = document.querySelectorAll('.filter-tab');

let allMaterials = [];
let currentCategoryFilter = 'all';

// 1. Session Observer & Route Protection
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // Redirect non-authenticated visitors back to Home
        window.location.href = 'index.html';
        return;
    }

    // Load User Data
    const userSnap = await getDoc(doc(db, "users", user.uid));
    
    if (userSnap.exists()) {
        const userData = userSnap.data();
        const studentClass = userData.academicClass || 'SSLC';

        // Update Navbar Status
        if (navUserStatus) {
            navUserStatus.innerHTML = `
                <span class="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    <i class="fa-solid fa-circle-user"></i> ${userData.fullName || 'Student'}
                </span>
                <button id="logout-btn" class="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all">
                    Logout
                </button>
            `;
            document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
        }

        if (userBadge) {
            userBadge.textContent = `${studentClass} Class Portal`;
        }

        // Fetch materials specific to student's class
        fetchClassMaterials(studentClass);
    } else {
        // Unregistered profile fallback
        window.location.href = 'index.html';
    }
});

// 2. Fetch Class Study Materials from Firestore
async function fetchClassMaterials(studentClass) {
    try {
        const materialsQuery = query(
            collection(db, "materials"),
            where("academicClass", "==", studentClass)
        );

        const querySnapshot = await getDocs(materialsQuery);
        allMaterials = [];

        querySnapshot.forEach((docSnap) => {
            allMaterials.push({ id: docSnap.id, ...docSnap.data() });
        });

        renderMaterials(allMaterials);
    } catch (error) {
        console.error("Error fetching study materials: ", error);
        materialsGrid.innerHTML = `
            <div class="col-span-full text-center text-red-500 py-8">
                Failed to load resources. Make sure your database collection is populated.
            </div>
        `;
    }
}

// 3. Render Material Cards Grid
function renderMaterials(materials) {
    materialsGrid.innerHTML = '';

    const filtered = materials.filter(item => {
        const matchesCategory = currentCategoryFilter === 'all' || item.category === currentCategoryFilter;
        const matchesSearch = item.title.toLowerCase().includes(searchInput.value.toLowerCase()) ||
                              item.subject.toLowerCase().includes(searchInput.value.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    filtered.forEach((material) => {
        const card = document.createElement('div');
        card.className = "bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between";

        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between mb-3">
                    <span class="text-[10px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-secondary px-2.5 py-1 rounded-md">
                        ${material.subject || 'General'}
                    </span>
                    <span class="text-xs text-gray-400">
                        <i class="fa-solid fa-file-pdf text-red-500 mr-1"></i> PDF
                    </span>
                </div>
                <h3 class="text-base font-bold text-gray-900 dark:text-white mb-2 leading-snug">
                    ${material.title}
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-6 line-clamp-2">
                    ${material.description || 'Official study resource uploaded for academic review.'}
                </p>
            </div>
            <button class="download-trigger-btn w-full bg-secondary hover:bg-blue-600 text-white font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                data-url="${material.fileUrl}" data-title="${material.title}">
                <i class="fa-solid fa-download"></i> Download Resource
            </button>
        `;

        materialsGrid.appendChild(card);
    });

    // Attach Download Event Listeners
    document.querySelectorAll('.download-trigger-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const url = e.currentTarget.getAttribute('data-url');
            const title = e.currentTarget.getAttribute('data-title');
            recordDownloadAndOpen(url, title);
        });
    });
}

// 4. Record Download History Entry in Firestore & Open Document
async function recordDownloadAndOpen(fileUrl, fileTitle) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        await addDoc(collection(db, "downloads_log"), {
            userId: user.uid,
            userEmail: user.email,
            documentTitle: fileTitle,
            downloadedAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Log error: ", e);
    }

    // Open PDF link in new browser tab
    window.open(fileUrl, '_blank');
}

// 5. Search & Filter Handlers
if (searchInput) {
    searchInput.addEventListener('input', () => renderMaterials(allMaterials));
}

filterTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        filterTabs.forEach(t => {
            t.classList.remove('active', 'bg-secondary', 'text-white');
            t.classList.add('bg-white', 'dark:bg-gray-900', 'text-gray-600', 'dark:text-gray-300');
        });

        e.currentTarget.classList.add('active', 'bg-secondary', 'text-white');
        e.currentTarget.classList.remove('bg-white', 'dark:bg-gray-900', 'text-gray-600', 'dark:text-gray-300');

        currentCategoryFilter = e.currentTarget.getAttribute('data-filter');
        renderMaterials(allMaterials);
    });
});