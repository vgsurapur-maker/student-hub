// js/app.js
import { db } from './firebase.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

let currentSelectedCourse = '2nd PUC'; // Default selected course
let currentSelectedSubject = 'all';
let appResources = [];

// 1. LISTEN TO FIRESTORE REAL-TIME DATA
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
});

// 2. TRIGGERED WHEN CLICKING COURSE BUTTONS (SSLC, 1st PUC, 2nd PUC, KCET...)
window.filterHomePageClass = function(course) {
    currentSelectedCourse = course;
    currentSelectedSubject = 'all'; // Reset subject selection on course change

    // Update Heading Text
    const sectionTitle = document.getElementById('section-title');
    if (sectionTitle) {
        sectionTitle.innerText = course === 'all' ? 'Featured Study Materials' : `${course} Study Materials`;
    }

    // Refresh UI
    updateCourseButtonsUI(course);
    renderSubjectFilters();
    renderResourcesGrid();
};

// 3. TRIGGERED WHEN CLICKING SUBJECT BUTTONS (Chemistry, Physics, Kannada...)
window.filterHomePageSubject = function(subject) {
    currentSelectedSubject = subject;
    renderSubjectFilters();
    renderResourcesGrid();
};

// 4. DYNAMICALLY GENERATE SUBJECT BUTTONS
function renderSubjectFilters() {
    const subjectContainer = document.getElementById('subject-filter-container');
    const subjectList = document.getElementById('subject-buttons-list');

    if (!subjectContainer || !subjectList) return;

    // Filter resources for the active course
    const courseResources = currentSelectedCourse === 'all'
        ? appResources
        : appResources.filter(res => res.course.toLowerCase() === currentSelectedCourse.toLowerCase());

    // Extract UNIQUE subjects available in database for this course
    const availableSubjects = [...new Set(
        courseResources
            .map(res => res.subject)
            .filter(subj => subj && subj.trim() !== '')
    )];

    // If no subjects found for this course, hide the bar
    if (availableSubjects.length === 0) {
        subjectContainer.classList.add('hidden');
        return;
    }

    // Unhide container
    subjectContainer.classList.remove('hidden');

    // Create "All Subjects" button first
    let html = `
        <button onclick="filterHomePageSubject('all')" 
            class="px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentSelectedSubject === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }">
            All Subjects
        </button>
    `;

    // Render individual subject buttons
    availableSubjects.forEach(subject => {
        const isActive = currentSelectedSubject.toLowerCase() === subject.toLowerCase();
        html += `
            <button onclick="filterHomePageSubject('${subject}')" 
                class="px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }">
                ${subject}
            </button>
        `;
    });

    subjectList.innerHTML = html;
}

// 5. RENDER CARDS GRID
function renderResourcesGrid() {
    const grid = document.getElementById('dynamic-resources-grid');
    if (!grid) return;

    let filtered = appResources.filter(res => {
        const matchesCourse = currentSelectedCourse === 'all' || res.course.toLowerCase() === currentSelectedCourse.toLowerCase();
        const matchesSubject = currentSelectedSubject === 'all' || res.subject.toLowerCase() === currentSelectedSubject.toLowerCase();
        return matchesCourse && matchesSubject;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="h-16 w-16 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
                    <i class="fa-solid fa-folder-open"></i>
                </div>
                <h3 class="text-lg font-bold text-gray-700 dark:text-gray-300">No Materials Available</h3>
                <p class="text-sm text-gray-400 mt-1">
                    No uploaded resources match "${currentSelectedCourse}" ${currentSelectedSubject !== 'all' ? '- ' + currentSelectedSubject : ''}.
                </p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(res => `
        <div class="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 rounded-lg">
                            ${res.course}
                        </span>
                        ${res.subject ? `
                            <span class="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 rounded-lg">
                                ${res.subject}
                            </span>
                        ` : ''}
                    </div>
                    <span class="text-xs text-red-500 font-semibold flex items-center gap-1">
                        <i class="fa-solid fa-file-pdf"></i> PDF
                    </span>
                </div>
                <h4 class="font-bold text-base text-gray-900 dark:text-white mb-2 line-clamp-2">
                    ${res.title}
                </h4>
                <p class="text-xs text-gray-400 line-clamp-2 mb-4">
                    ${res.description}
                </p>
            </div>
            <a href="${res.fileUrl}" download class="mt-2 flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-sm">
                Download PDF Asset
            </a>
        </div>
    `).join('');
}

// Highlight Active Course Button Style
function updateCourseButtonsUI(activeCourse) {
    const buttons = document.querySelectorAll('[onclick^="filterHomePageClass"]');
    buttons.forEach(btn => {
        if (btn.getAttribute('onclick').includes(`'${activeCourse}'`)) {
            btn.className = 'px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm';
        } else {
            btn.className = 'px-4 py-2 bg-white dark:bg-gray-900 border dark:border-gray-800 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl hover:border-blue-500 transition-all';
        }
    });
}