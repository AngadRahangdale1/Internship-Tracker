document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const form = document.getElementById('application-form');
    const tableBody = document.getElementById('applications-body');
    const totalAppsEl = document.getElementById('total-apps');
    const totalInterviewsEl = document.getElementById('total-interviews');
    const totalOffersEl = document.getElementById('total-offers');
    const totalRejectionsEl = document.getElementById('total-rejections');
    const searchInput = document.getElementById('search-input');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const btnExport = document.getElementById('btn-export');
    const fileUpload = document.getElementById('file-upload');
    const chartCanvas = document.getElementById('analyticsChart');

    // State
    let applications = [];
    let isDarkMode = localStorage.getItem('theme') === 'dark';

    // Constants for Analytics
    const STAGE_COLORS = {
        'Applied': '#3b82f6',   // blue
        'OA': '#a855f7',        // purple
        'Interview': '#f59e0b', // amber
        'Offer': '#10b981',     // emerald
        'Rejected': '#ef4444'   // red
    };

    // Load inputs
    const companyInput = document.getElementById('company');
    const roleInput = document.getElementById('role');
    const stageInput = document.getElementById('stage');
    const resultInput = document.getElementById('result');
    const dateInput = document.getElementById('date');

    // Initialization
    applyTheme();
    loadApplications();

    // Event Listeners
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        addApplication();
    });

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            renderApplications(term);
        });
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    if (btnExport) btnExport.addEventListener('click', exportToCSV);
    if (fileUpload) fileUpload.addEventListener('change', importFromJSON);

    // Functions

    function toggleTheme() {
        isDarkMode = !isDarkMode;
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        applyTheme();
    }

    function applyTheme() {
        if (isDarkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            const sunIcon = document.querySelector('.sun-icon');
            const moonIcon = document.querySelector('.moon-icon');
            if(sunIcon) sunIcon.style.display = 'block';
            if(moonIcon) moonIcon.style.display = 'none';
        } else {
            document.documentElement.removeAttribute('data-theme');
            const sunIcon = document.querySelector('.sun-icon');
            const moonIcon = document.querySelector('.moon-icon');
            if(sunIcon) sunIcon.style.display = 'none';
            if(moonIcon) moonIcon.style.display = 'block';
        }
        if (applications.length > 0) drawChart();
    }

    function loadApplications() {
        const storedData = localStorage.getItem('internshipTrackerData');
        if (storedData) {
            try {
                applications = JSON.parse(storedData);
            } catch (e) {
                console.error("Error parsing data", e);
                applications = [];
                showToast("Error loading saved data", "error");
            }
        }
        renderApplications();
        updateSummary();
        drawChart();
    }

    function saveApplications() {
        localStorage.setItem('internshipTrackerData', JSON.stringify(applications));
        updateSummary();
        drawChart();
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
        showToast("Application added successfully!", "success");
    }

    // Expose deleteApplication to global scope
    window.deleteApplication = function(id) {
        if(confirm('Are you sure you want to delete this application?')) {
            applications = applications.filter(app => app.id !== id);
            saveApplications();
            renderApplications(searchInput ? searchInput.value.toLowerCase() : '');
            showToast("Application deleted", "success");
        }
    };

    function renderApplications(filterTerm = '') {
        tableBody.innerHTML = '';

        const filteredApps = applications.filter(app => 
            app.company.toLowerCase().includes(filterTerm) || 
            app.role.toLowerCase().includes(filterTerm)
        );

        if (filteredApps.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-secondary);">
                ${filterTerm ? 'No matching applications found.' : 'No applications added yet. Start tracking! 🚀'}
            </td>`;
            tableBody.appendChild(row);
            return;
        }

        // Sort by date (newest first)
        filteredApps.sort((a, b) => new Date(b.date) - new Date(a.date));

        filteredApps.forEach(app => {
            const row = document.createElement('tr');
            
            const safeCompany = escapeHtml(app.company);
            const safeRole = escapeHtml(app.role);
            const safeStage = escapeHtml(app.stage);
            const safeResult = escapeHtml(app.result);
            const safeDate = escapeHtml(app.date);

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
        const interviews = applications.filter(app => app.stage === 'Interview' || app.stage === 'Offer').length;
        const offers = applications.filter(app => app.stage === 'Offer').length;
        const rejections = applications.filter(app => app.stage === 'Rejected' || app.result === 'Rejected').length;

        if (totalAppsEl) animateValue(totalAppsEl, parseInt(totalAppsEl.textContent) || 0, total, 500);
        if (totalInterviewsEl) animateValue(totalInterviewsEl, parseInt(totalInterviewsEl.textContent) || 0, interviews, 500);
        if (totalOffersEl) animateValue(totalOffersEl, parseInt(totalOffersEl.textContent) || 0, offers, 500);
        if (totalRejectionsEl) animateValue(totalRejectionsEl, parseInt(totalRejectionsEl.textContent) || 0, rejections, 500);
    }

    // Canvas Chart Implementation
    function drawChart() {
        if (!chartCanvas) return;
        const ctx = chartCanvas.getContext('2d');
        const width = chartCanvas.offsetWidth;
        const height = chartCanvas.offsetHeight;
        
        // Handle High DPI displays
        const dpr = window.devicePixelRatio || 1;
        chartCanvas.width = width * dpr;
        chartCanvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);

        const emptyMsg = document.getElementById('empty-chart-msg');
        const legendContainer = document.getElementById('chart-legend');

        if (applications.length === 0) {
            if(emptyMsg) emptyMsg.style.display = 'block';
            if(legendContainer) legendContainer.innerHTML = '';
            return;
        } else {
            if(emptyMsg) emptyMsg.style.display = 'none';
        }

        // Aggregate Data by Stage
        const counts = {};
        let total = 0;
        applications.forEach(app => {
            let key = app.stage;
            if (app.result === 'Rejected') key = 'Rejected';
            if (app.result === 'Offer') key = 'Offer';
            
            counts[key] = (counts[key] || 0) + 1;
            total++;
        });

        // Draw Pie Chart
        let startAngle = 0;
        const centerX = width / 2;
        const centerY = height / 2 - 20;
        const radius = Math.min(width, height) / 3; // Smaller radius to fit

        if (legendContainer) legendContainer.innerHTML = '';

        for (const [stage, count] of Object.entries(counts)) {
            const color = STAGE_COLORS[stage] || '#cbd5e1';
            const sliceAngle = (count / total) * 2 * Math.PI;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
            
            ctx.strokeStyle = isDarkMode ? '#1e293b' : '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            startAngle += sliceAngle;

            if (legendContainer) {
                const legendItem = document.createElement('div');
                legendItem.className = 'legend-item';
                legendItem.innerHTML = `
                    <div class="legend-color" style="background-color: ${color}"></div>
                    <span>${stage} (${count})</span>
                `;
                legendContainer.appendChild(legendItem);
            }
        }
        
        // Donut Hole
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
        ctx.fillStyle = isDarkMode ? '#1e293b' : '#ffffff';
        ctx.fill();
        
        // Total Text
        ctx.fillStyle = isDarkMode ? '#f1f5f9' : '#0f172a';
        ctx.font = "bold 24px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(total, centerX, centerY);
        
        ctx.font = "12px Inter, sans-serif";
        ctx.fillStyle = isDarkMode ? '#94a3b8' : '#64748b';
        ctx.fillText("Apps", centerX, centerY + 20);
    }

    function exportToCSV() {
        if (applications.length === 0) {
            showToast("No data to export", "error");
            return;
        }

        const headers = ["Company", "Role", "Stage", "Outcome", "Date"];
        const rows = applications.map(app => 
            `"${app.company}","${app.role}","${app.stage}","${app.result}","${app.date}"`
        );
        
        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n" + rows.join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "internship_tracker_data.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast("Data exported successfully!", "success");
    }

    function importFromJSON(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                if (Array.isArray(importedData)) {
                    if (importedData.length > 0 && !importedData[0].company) throw new Error("Invalid format");
                    
                    if(confirm(`Found ${importedData.length} records. Merge with existing data? (Cancel to replace)`)) {
                        applications = [...applications, ...importedData];
                    } else {
                        applications = importedData;
                    }
                    saveApplications();
                    renderApplications();
                    showToast("Data imported successfully!", "success");
                }
            } catch (err) {
                showToast("Failed to import file. Invalid JSON.", "error");
                console.error(err);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }

    function escapeHtml(text) {
        if (!text) return '';
        return text.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease-out forwards';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    function animateValue(obj, start, end, duration) {
        if (start === end) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }
});
