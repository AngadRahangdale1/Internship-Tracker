document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const form = document.getElementById('application-form');
    const tableBody = document.getElementById('applications-body');
    const totalAppsEl = document.getElementById('total-apps');
    const totalInterviewsEl = document.getElementById('total-interviews');
    const totalOffersEl = document.getElementById('total-offers');
    const totalRejectionsEl = document.getElementById('total-rejections');

    // State
    let applications = [];

    // Load inputs
    const companyInput = document.getElementById('company');
    const roleInput = document.getElementById('role');
    const stageInput = document.getElementById('stage');
    const resultInput = document.getElementById('result');
    const dateInput = document.getElementById('date');

    // Initialization
    loadApplications();

    // Event Listener for Form Submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        addApplication();
    });

    // Functions
    function loadApplications() {
        // Data Persistence Requirement: Read from localStorage
        const storedData = localStorage.getItem('internshipTrackerData');
        if (storedData) {
            try {
                applications = JSON.parse(storedData);
            } catch (e) {
                console.error("Error parsing data", e);
                applications = [];
            }
        }
        renderApplications();
        updateSummary();
    }

    function saveApplications() {
        // Data Persistence Requirement: Save to localStorage
        localStorage.setItem('internshipTrackerData', JSON.stringify(applications));
        updateSummary();
    }

    function addApplication() {
        const newApp = {
            id: Date.now(),
            company: companyInput.value,
            role: roleInput.value,
            stage: stageInput.value,
            result: resultInput.value,
            date: dateInput.value
        };

        applications.push(newApp);
        saveApplications();
        renderApplications();
        form.reset();
    }

    // Expose deleteApplication to global scope so it can be called from HTML onclick
    window.deleteApplication = function(id) {
        if(confirm('Are you sure you want to delete this application?')) {
            applications = applications.filter(app => app.id !== id);
            saveApplications();
            renderApplications();
        }
    };

    function renderApplications() {
        tableBody.innerHTML = '';

        if (applications.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="6" style="text-align:center;">No applications added yet.</td>`;
            tableBody.appendChild(row);
            return;
        }

        applications.forEach(app => {
            const row = document.createElement('tr');
            
            // Clean strings to prevent XSS
            const safeCompany = escapeHtml(app.company);
            const safeRole = escapeHtml(app.role);
            const safeStage = escapeHtml(app.stage);
            const safeResult = escapeHtml(app.result);
            const safeDate = escapeHtml(app.date);

            // Add classes for styling based on data
            const stageClass = `status-${safeStage.replace(/[\s\(\)]+/g, '')}`;
            const resultClass = `status-${safeResult.replace(/[\s\(\)]+/g, '')}`;

            row.innerHTML = `
                <td><div class="company-name">${safeCompany}</div></td>
                <td>${safeRole}</td>
                <td><span class="badge ${stageClass}">${safeStage}</span></td>
                <td><span class="badge ${resultClass}">${safeResult}</span></td>
                <td class="date-cell">${formatDate(safeDate)}</td>
                <td>
                    <button class="btn-delete" onclick="deleteApplication(${app.id})" title="Delete Application">
                        &times;
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    function updateSummary() {
        const total = applications.length;
        // Count interviews: Stage is "Interview"
        const interviews = applications.filter(app => app.stage === 'Interview').length;
        // Count offers: Stage is "Offer"
        const offers = applications.filter(app => app.stage === 'Offer').length;
        // Count rejections: Stage is "Rejected" OR Result is "Rejected"
        const rejections = applications.filter(app => app.stage === 'Rejected' || app.result === 'Rejected').length;

        totalAppsEl.textContent = total;
        totalInterviewsEl.textContent = interviews;
        totalOffersEl.textContent = offers;
        totalRejectionsEl.textContent = rejections;
    }

    // Utility to format date for display
    function formatDate(dateString) {
        if (!dateString) return '-';
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    // Utility to prevent XSS
    function escapeHtml(text) {
        if (!text) return '';
        return text
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
