// MeitY Startup Hub - Content Planner Application Controller

// // Default static content database (Empty by default)
const DEFAULT_CONTENT = [];

// Default Social Analytics database (Zeroed by default)
const DEFAULT_ANALYTICS = {
    linkedin: {
        followers: 0,
        followersGrowth: 0,
        impressions: 0,
        engagement: 0
    },
    facebook: {
        followers: 0,
        followersGrowth: 0,
        reach: 0,
        engagement: 0
    },
    instagram: {
        followers: 0,
        followersGrowth: 0,
        reach: 0,
        engagement: 0
    },
    twitter: {
        followers: 0,
        followersGrowth: 0,
        impressions: 0,
        engagement: 0
    },
    youtube: {
        followers: 0,
        followersGrowth: 0,
        views: 0,
        engagement: 0
    }
};

// Default Flagship Series database (Empty by default)
const DEFAULT_SERIES = [];

// App State Management
class ContentCalendarApp {
    constructor() {
        this.schedules = [];
        this.currentView = "dashboard";
        this.selectedDate = null;
        this.activeEventId = null;
        this.isAuthenticated = sessionStorage.getItem("msh_authenticated") === "true";

        // Calendar variables (Static July 2026)
        this.year = 2026;
        this.month = 6; // July is index 6 in JS (0-11)
        
        this.init();
    }

    async init() {
        // Check if page is loaded via file:// protocol
        if (window.location.protocol === 'file:') {
            alert("⚠️ WARNING: You have opened this page directly as a local file (file://).\n\nTo ensure your edits are saved and shared, please start the server (run 'npm start' in the terminal) and open: http://localhost:3000");
        }

        // Cache DOM elements
        this.cacheDOM();

        // Load data from Express backend
        await this.loadDataFromServer();

        // Migration/Sanitization: ensure each schedule has 'series' field instead of 'pillar'
        let needsSave = false;
        this.schedules.forEach(item => {
            if (item.series === undefined) {
                const hasMatchingContentType = this.series.some(s => s.name.toLowerCase() === (item.contentType || "").toLowerCase());
                if (hasMatchingContentType) {
                    const matched = this.series.find(s => s.name.toLowerCase() === (item.contentType || "").toLowerCase());
                    item.series = matched.name;
                } else if (item.pillar) {
                    const matchedPillar = this.series.find(s => s.name.toLowerCase() === (item.pillar || "").toLowerCase());
                    item.series = matchedPillar ? matchedPillar.name : "None";
                } else {
                    item.series = "None";
                }
                needsSave = true;
            }
        });
        if (needsSave) {
            await this.saveToStorage();
        }

        this.populateSeriesDropdown();
        
        // Bind event listeners
        this.bindEvents();

        // Check authentication
        this.checkAuth();
    }

    async loadDataFromServer() {
        try {
            // Add cache-busting timestamp to prevent ANY browser caching
            const cacheBust = `_t=${Date.now()}`;
            const [schedulesRes, seriesRes, analyticsRes] = await Promise.all([
                fetch(`/api/schedules?${cacheBust}`, { cache: 'no-store' }),
                fetch(`/api/series?${cacheBust}`, { cache: 'no-store' }),
                fetch(`/api/analytics?${cacheBust}`, { cache: 'no-store' })
            ]);

            if (!schedulesRes.ok) throw new Error(`Schedules API returned ${schedulesRes.status}`);
            if (!seriesRes.ok) throw new Error(`Series API returned ${seriesRes.status}`);
            if (!analyticsRes.ok) throw new Error(`Analytics API returned ${analyticsRes.status}`);

            this.schedules = await schedulesRes.json();
            this.series = await seriesRes.json();
            this.analytics = await analyticsRes.json();
            console.log(`[LOAD] Loaded ${this.schedules.length} schedules, ${this.series.length} series from server.`);
        } catch (error) {
            console.error('[LOAD ERROR] Failed to load data from server:', error);
            // Only use defaults as absolute last resort (e.g. server not running)
            if (!this.schedules || this.schedules.length === 0) {
                this.schedules = [...DEFAULT_CONTENT];
            }
            if (!this.series || this.series.length === 0) {
                this.series = [...DEFAULT_SERIES];
            }
            if (!this.analytics || !this.analytics.linkedin) {
                this.analytics = { ...DEFAULT_ANALYTICS };
            }
        }
    }

    checkAuth() {
        if (this.isAuthenticated) {
            this.loginScreen.style.display = "none";
            this.appWorkspace.style.display = "grid";
            this.render();
        } else {
            this.loginScreen.style.display = "flex";
            this.appWorkspace.style.display = "none";
        }
    }

    handleLogin(e) {
        e.preventDefault();
        const username = this.loginUsername.value.trim();
        const password = this.loginPassword.value;

        if (username === "Admin" && password === "Admin@123") {
            this.isAuthenticated = true;
            sessionStorage.setItem("msh_authenticated", "true");
            this.loginError.style.display = "none";
            
            // Add a beautiful smooth fade transition out of login card
            const card = this.loginScreen.querySelector(".login-card");
            if (card) {
                card.style.transition = "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)";
                card.style.opacity = "0";
                card.style.transform = "translateY(-15px) scale(0.96)";
            }
            
            setTimeout(() => {
                this.checkAuth();
                // Clear input values
                this.loginUsername.value = "";
                this.loginPassword.value = "";
                // Reset card style for future logouts
                if (card) {
                    card.style.opacity = "";
                    card.style.transform = "";
                }
            }, 300);
        } else {
            // Display error with shake animation
            this.loginErrorText.textContent = "Invalid username or password.";
            this.loginError.style.display = "flex";
            
            // Trigger animation restart
            this.loginError.style.animation = "none";
            this.loginError.offsetHeight; /* trigger reflow */
            this.loginError.style.animation = "";
        }
    }

    handleLogout() {
        if (confirm("Are you sure you want to log out of the Content Planner?")) {
            this.isAuthenticated = false;
            sessionStorage.removeItem("msh_authenticated");
            // Clear any active mobile sidebar drawer states
            this.toggleMobileSidebar(false);
            this.checkAuth();
        }
    }

    toggleMobileSidebar(isOpen) {
        if (this.sidebar && this.sidebarOverlay) {
            if (isOpen) {
                this.sidebar.classList.add("active");
                this.sidebarOverlay.classList.add("active");
            } else {
                this.sidebar.classList.remove("active");
                this.sidebarOverlay.classList.remove("active");
            }
        }
    }

    togglePasswordVisibility() {
        if (this.loginPassword && this.iconEyeShow && this.iconEyeHide) {
            const isPassword = this.loginPassword.type === "password";
            this.loginPassword.type = isPassword ? "text" : "password";
            
            if (isPassword) {
                this.iconEyeShow.classList.add("hidden");
                this.iconEyeHide.classList.remove("hidden");
            } else {
                this.iconEyeShow.classList.remove("hidden");
                this.iconEyeHide.classList.add("hidden");
            }
        }
    }

    cacheDOM() {
        // Nav items
        this.navItems = document.querySelectorAll(".nav-item");
        this.viewPanels = document.querySelectorAll(".view-panel");
        this.viewTitle = document.getElementById("view-title");
        this.viewSubtitle = document.getElementById("view-subtitle");
        
        // Modal
        this.modal = document.getElementById("editor-modal");
        this.modalTitle = document.getElementById("modal-title");
        this.scheduleForm = document.getElementById("schedule-form");
        this.formId = document.getElementById("form-id");
        this.formDate = document.getElementById("form-date");
        this.formType = document.getElementById("form-type");
        this.customTypeRow = document.getElementById("custom-type-row");
        this.formCustomType = document.getElementById("form-custom-type");
        this.formTopic = document.getElementById("form-topic");
        this.formSeriesSelect = document.getElementById("form-series-select");
        this.formCopy = document.getElementById("form-copy");
        this.formStatus = document.getElementById("form-status");
        this.btnDelete = document.getElementById("modal-btn-delete");
        
        // Modal Links integration
        this.modalLinksRow = document.getElementById("modal-links-row");
        this.modalLinksContainer = document.getElementById("modal-links-inputs-container");
        
        // Modals Buttons
        this.btnCloseModal = document.getElementById("modal-btn-close");
        this.btnCancelModal = document.getElementById("modal-btn-cancel");
        this.btnAddSchedule = document.getElementById("btn-add-schedule");
        
        // Grids & Tables
        this.miniCalendar = document.getElementById("mini-calendar-body");
        this.upcomingBody = document.getElementById("upcoming-posts-body");
        this.mainCalendarGrid = document.getElementById("main-calendar-grid");
        this.listTableBody = document.getElementById("list-table-body");
        this.listTableFooter = document.getElementById("list-table-footer");
        
        // Social Analytics elements
        this.btnUpdateAnalytics = document.getElementById("btn-update-analytics");
        this.analyticsModal = document.getElementById("analytics-modal");
        this.analyticsForm = document.getElementById("analytics-form");
        this.analyticsModalClose = document.getElementById("analytics-modal-btn-close");
        this.analyticsModalCancel = document.getElementById("analytics-modal-btn-cancel");
        this.analyticsChannelsGrid = document.getElementById("analytics-channels-grid");
        
        // Flagship Series elements
        this.btnAddSeries = document.getElementById("btn-add-series");
        this.seriesGrid = document.getElementById("series-grid");
        this.seriesModal = document.getElementById("series-modal");
        this.seriesForm = document.getElementById("series-form");
        this.seriesModalClose = document.getElementById("series-modal-btn-close");
        this.seriesModalCancel = document.getElementById("series-modal-btn-cancel");
        this.seriesImageFile = null;
        this.seriesImagePreview = null;
        
        this.seriesStartDate = document.getElementById("series-start-date");
        this.seriesEndDate = document.getElementById("series-end-date");
        this.seriesOngoing = document.getElementById("series-ongoing");
        this.seriesFilterMonth = document.getElementById("series-filter-month");
        this.seriesFilterYear = document.getElementById("series-filter-year");
        
        // Exporter
        this.btnExportJson = document.getElementById("export-json");
        this.btnExportCsv = document.getElementById("export-csv");
        
        // Global search & filters
        this.globalSearch = document.getElementById("global-search");
        this.listSearch = document.getElementById("list-search");
        this.listFilterType = document.getElementById("list-filter-type");
        this.listFilterStatus = document.getElementById("list-filter-status");
        this.listSort = document.getElementById("list-sort");
        this.calendarFilterType = document.getElementById("calendar-filter-type");
        this.calendarFilterStatus = document.getElementById("calendar-filter-status");
        this.calendarMonthYear = document.getElementById("calendar-month-year");
        this.btnPrevMonth = document.getElementById("btn-prev-month");
        this.btnNextMonth = document.getElementById("btn-next-month");
        this.listFilterMonth = document.getElementById("list-filter-month");
        this.listFilterYear = document.getElementById("list-filter-year");

        // Login screen elements
        this.loginScreen = document.getElementById("login-screen");
        this.appWorkspace = document.getElementById("app-workspace");
        this.loginForm = document.getElementById("login-form");
        this.loginUsername = document.getElementById("login-username");
        this.loginPassword = document.getElementById("login-password");
        this.loginError = document.getElementById("login-error");
        this.loginErrorText = document.getElementById("login-error-text");
        this.btnLogout = document.getElementById("btn-logout");

        // Mobile drawer and password eye elements
        this.btnMenuToggle = document.getElementById("btn-menu-toggle");
        this.sidebarOverlay = document.getElementById("sidebar-overlay");
        this.sidebar = document.querySelector(".sidebar");
        this.btnTogglePassword = document.getElementById("btn-toggle-password");
        this.iconEyeShow = document.getElementById("icon-eye-show");
        this.iconEyeHide = document.getElementById("icon-eye-hide");
    }

    bindEvents() {
        // Navigation clicks
        this.navItems.forEach(item => {
            item.addEventListener("click", () => {
                const view = item.getAttribute("data-view");
                this.switchView(view);
            });
        });

        // Quick navigation buttons
        document.querySelector(".btn-view-calendar").addEventListener("click", () => this.switchView("calendar"));
        document.querySelector(".btn-view-list").addEventListener("click", () => this.switchView("list"));

        // Global search input triggers search in active view
        this.globalSearch.addEventListener("input", (e) => {
            const val = e.target.value;
            this.listSearch.value = val;
            if (this.currentView === "calendar") {
                this.renderCalendarGrid();
            } else {
                this.renderListView();
            }
        });

        // Search and filtering lists
        if (this.listSearch) {
            this.listSearch.addEventListener("input", () => this.renderListView());
        }
        if (this.listFilterType) {
            this.listFilterType.addEventListener("change", () => this.renderListView());
        }
        if (this.listFilterStatus) {
            this.listFilterStatus.addEventListener("change", () => this.renderListView());
        }
        if (this.listSort) {
            this.listSort.addEventListener("change", () => this.renderListView());
        }
        if (this.listFilterMonth) {
            this.listFilterMonth.addEventListener("change", () => this.renderListView());
        }
        if (this.listFilterYear) {
            this.listFilterYear.addEventListener("change", () => this.renderListView());
        }

        // Calendar filtering
        this.calendarFilterType.addEventListener("change", () => this.renderCalendarGrid());
        this.calendarFilterStatus.addEventListener("change", () => this.renderCalendarGrid());
        
        if (this.btnPrevMonth) {
            this.btnPrevMonth.addEventListener("click", () => this.prevMonth());
        }
        if (this.btnNextMonth) {
            this.btnNextMonth.addEventListener("click", () => this.nextMonth());
        }

        // Modal triggers
        this.btnAddSchedule.addEventListener("click", () => this.openAddModal());
        this.btnCloseModal.addEventListener("click", () => this.closeModal());
        this.btnCancelModal.addEventListener("click", () => this.closeModal());
        
        // Form submissions
        this.scheduleForm.addEventListener("submit", (e) => this.handleFormSubmit(e));
        this.btnDelete.addEventListener("click", () => this.handleDelete());
        
        // Content Type conditional field trigger
        this.formType.addEventListener("change", () => {
            if (this.formType.value === "Other") {
                this.customTypeRow.style.display = "block";
                this.formCustomType.required = true;
            } else {
                this.customTypeRow.style.display = "none";
                this.formCustomType.required = false;
            }
        });

        // Modal Links conditional rendering triggers
        if (this.formStatus) {
            this.formStatus.addEventListener("change", () => this.updateModalLinksVisibility());
        }
        const platformCheckboxes = [
            "platform-linkedin", "platform-twitter", "platform-instagram", "platform-facebook"
        ];
        platformCheckboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.addEventListener("change", () => {
                    if (this.formStatus && this.formStatus.value === "Published") {
                        this.updateModalLinksInputs();
                    }
                });
            }
        });

        // Export events
        this.btnExportJson.addEventListener("click", (e) => {
            e.preventDefault();
            this.exportToJson();
        });
        this.btnExportCsv.addEventListener("click", (e) => {
            e.preventDefault();
            this.exportToCsv();
        });

        // Login screen bindings
        if (this.loginForm) {
            this.loginForm.addEventListener("submit", (e) => this.handleLogin(e));
        }
        if (this.btnLogout) {
            this.btnLogout.addEventListener("click", () => this.handleLogout());
        }

        // Mobile Sidebar Drawer bindings
        if (this.btnMenuToggle) {
            this.btnMenuToggle.addEventListener("click", () => this.toggleMobileSidebar(true));
        }
        if (this.sidebarOverlay) {
            this.sidebarOverlay.addEventListener("click", () => this.toggleMobileSidebar(false));
        }

        // Password Show/Hide Toggle binding
        if (this.btnTogglePassword) {
            this.btnTogglePassword.addEventListener("click", () => this.togglePasswordVisibility());
        }

        // Social Analytics bindings
        if (this.btnUpdateAnalytics) {
            this.btnUpdateAnalytics.addEventListener("click", () => this.openAnalyticsModal());
        }
        if (this.analyticsModalClose) {
            this.analyticsModalClose.addEventListener("click", () => this.closeAnalyticsModal());
        }
        if (this.analyticsModalCancel) {
            this.analyticsModalCancel.addEventListener("click", () => this.closeAnalyticsModal());
        }
        if (this.analyticsForm) {
            this.analyticsForm.addEventListener("submit", (e) => this.handleAnalyticsFormSubmit(e));
        }

        // Flagship Series bindings
        if (this.btnAddSeries) {
            this.btnAddSeries.addEventListener("click", () => this.openSeriesModal());
        }
        if (this.seriesModalClose) {
            this.seriesModalClose.addEventListener("click", () => this.closeSeriesModal());
        }
        if (this.seriesModalCancel) {
            this.seriesModalCancel.addEventListener("click", () => this.closeSeriesModal());
        }
        if (this.seriesForm) {
            this.seriesForm.addEventListener("submit", (e) => this.handleSeriesFormSubmit(e));
        }

        
        // Add listeners for month/year filters & ongoing toggle
        if (this.seriesFilterMonth) {
            this.seriesFilterMonth.addEventListener("change", () => this.renderSeries());
        }
        if (this.seriesFilterYear) {
            this.seriesFilterYear.addEventListener("change", () => this.renderSeries());
        }
        if (this.seriesOngoing) {
            this.seriesOngoing.addEventListener("change", (e) => {
                if (this.seriesEndDate) {
                    this.seriesEndDate.disabled = e.target.checked;
                    if (e.target.checked) {
                        this.seriesEndDate.value = "";
                        this.seriesEndDate.required = false;
                    }
                }
            });
        }
    }

    switchView(view) {
        this.currentView = view;
        
        // Close mobile sidebar drawer if open
        this.toggleMobileSidebar(false);
        
        // Toggle side menu active class
        this.navItems.forEach(item => {
            if (item.getAttribute("data-view") === view) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });

        // Toggle panel displays
        this.viewPanels.forEach(panel => {
            if (panel.id === `view-${view}`) {
                panel.classList.add("active");
            } else {
                panel.classList.remove("active");
            }
        });

        // Show/hide Add Schedule button based on the active view (hide on analytics and series)
        if (this.btnAddSchedule) {
            if (view === "analytics" || view === "series") {
                this.btnAddSchedule.style.display = "none";
            } else {
                this.btnAddSchedule.style.display = "flex";
            }
        }

        // Update titles
        switch(view) {
            case "dashboard":
                this.viewTitle.innerText = "Dashboard View";
                this.viewSubtitle.innerText = "July 2026 Content Strategy Plan";
                document.getElementById("global-stats").style.display = "grid";
                document.getElementById("header-search-container").style.display = "none";
                break;
            case "calendar":
                this.viewTitle.innerText = "Calendar Grid";
                this.viewSubtitle.innerText = "Interactive schedule mapping";
                document.getElementById("global-stats").style.display = "none";
                document.getElementById("header-search-container").style.display = "flex";
                if (!this.selectedDate) {
                    this.selectedDate = "2026-07-01";
                }
                this.renderDayDetails(this.selectedDate);
                break;
            case "list":
                this.viewTitle.innerText = "Content List";
                this.viewSubtitle.innerText = "Complete schedules directory and copy data";
                document.getElementById("global-stats").style.display = "none";
                document.getElementById("header-search-container").style.display = "flex";
                break;
            case "analytics":
                this.viewTitle.innerText = "Social Analytics";
                this.viewSubtitle.innerText = "Real-time growth and follower tracking";
                document.getElementById("global-stats").style.display = "none";
                document.getElementById("header-search-container").style.display = "none";
                break;
            case "series":
                this.viewTitle.innerText = "Flagship Series";
                this.viewSubtitle.innerText = "Track active content series metrics";
                document.getElementById("global-stats").style.display = "none";
                document.getElementById("header-search-container").style.display = "none";
                break;

        }

        // Trigger dynamic renders
        this.render();
    }

    async saveToStorage() {
        try {
            const res = await fetch('/api/schedules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.schedules),
                cache: 'no-store'
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(`Server responded ${res.status}: ${errData.error || 'Unknown error'}`);
            }
            console.log(`[SAVE] Schedules saved (${this.schedules.length} items)`);
            this.showToast("Content schedules successfully saved to server!");
        } catch (err) {
            console.error('[SAVE ERROR] Failed to save schedules:', err);
            this.showToast("Failed to save schedules to server.", "error");
        }
    }

    async saveSeriesToServer() {
        try {
            const res = await fetch('/api/series', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.series),
                cache: 'no-store'
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(`Server responded ${res.status}: ${errData.error || 'Unknown error'}`);
            }
            console.log(`[SAVE] Series saved (${this.series.length} items)`);
            this.showToast("Flagship Series successfully saved to server!");
        } catch (err) {
            console.error('[SAVE ERROR] Failed to save series:', err);
            this.showToast("Failed to save series to server.", "error");
        }
    }

    async saveAnalyticsToServer() {
        try {
            const res = await fetch('/api/analytics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.analytics),
                cache: 'no-store'
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(`Server responded ${res.status}: ${errData.error || 'Unknown error'}`);
            }
            console.log('[SAVE] Analytics saved');
            this.showToast("Social Analytics metrics successfully updated!");
        } catch (err) {
            console.error('[SAVE ERROR] Failed to save analytics:', err);
            this.showToast("Failed to save analytics metrics.", "error");
        }
    }

    render() {
        this.calculateStats();
        
        if (this.currentView === "dashboard") {
            this.renderDashboard();
        } else if (this.currentView === "calendar") {
            this.renderCalendarGrid();
        } else if (this.currentView === "list") {
            this.renderListView();
        } else if (this.currentView === "analytics") {
            this.renderAnalytics();
        } else if (this.currentView === "series") {
            this.renderSeries();
        }
    }

    calculateStats() {
        const total = this.schedules.length;
        
        // Count Platforms (allowing multiple platforms per post)
        let linkedinCount = 0;
        let twitterCount = 0;
        let facebookCount = 0;
        let completedCount = 0;
        
        let spotlightCount = 0;
        let incubatorCount = 0;
        let humanCount = 0;

        this.schedules.forEach(item => {
            if (item.platforms && item.platforms.includes("LinkedIn")) linkedinCount++;
            if (item.platforms && (item.platforms.includes("X/Twitter") || item.platforms.includes("Twitter"))) twitterCount++;
            if (item.platforms && item.platforms.includes("Facebook")) facebookCount++;
            if (item.status === "Published") completedCount++;
            
            if (item.contentType === "Startup Spotlight") spotlightCount++;
            else if (item.contentType === "Incubator Spotlight") incubatorCount++;
            else if (item.contentType === "Human Content") humanCount++;
        });

        // Set global text stats
        if (document.getElementById("stat-total-posts")) {
            document.getElementById("stat-total-posts").innerText = total;
        }
        if (document.getElementById("stat-linkedin")) {
            document.getElementById("stat-linkedin").innerText = linkedinCount;
        }
        if (document.getElementById("stat-twitter")) {
            document.getElementById("stat-twitter").innerText = twitterCount;
        }
        if (document.getElementById("stat-facebook")) {
            document.getElementById("stat-facebook").innerText = facebookCount;
        }
        if (document.getElementById("stat-completed")) {
            document.getElementById("stat-completed").innerText = completedCount;
        }


    }

    // Modal Operations
    openAddModal(dateStr = "") {
        this.activeEventId = null;
        this.modalTitle.innerText = "Add New Content Schedule";
        this.scheduleForm.reset();
        this.formId.value = "";
        
        // Set date
        if (dateStr) {
            this.formDate.value = dateStr;
        } else {
            // Default to July 1st, 2026
            this.formDate.value = "2026-07-01";
        }
        
        if (this.formSeriesSelect) {
            this.formSeriesSelect.value = "None";
        }
        
        this.customTypeRow.style.display = "none";
        this.btnDelete.style.display = "none";
        
        if (this.modalLinksRow) {
            this.modalLinksRow.style.display = "none";
        }
        if (this.modalLinksContainer) {
            this.modalLinksContainer.innerHTML = "";
        }
        
        this.modal.classList.add("active");
    }

    openEditModal(id) {
        const item = this.schedules.find(s => s.id === id);
        if (!item) return;

        this.activeEventId = id;
        this.modalTitle.innerText = "Edit Content Schedule";
        this.scheduleForm.reset();
        
        this.formId.value = item.id;
        this.formDate.value = item.date;
        this.formTopic.value = item.topic;
        if (this.formSeriesSelect) {
            this.formSeriesSelect.value = item.series || "None";
        }
        this.formCopy.value = item.copy || "";
        this.formStatus.value = item.status;
        
        // Handle Content Type selector
        const standardTypes = [
            "Startup Spotlight", "Incubator Spotlight", "Human Content", 
            "MSH Brand Identity", "FoundHer", "Startup Decode", 
            "Milestone Moments", "Comic Strip", "Student to Founder", "World Youth Skills Day"
        ];
        
        if (standardTypes.includes(item.contentType)) {
            this.formType.value = item.contentType;
            this.customTypeRow.style.display = "none";
            this.formCustomType.required = false;
        } else {
            this.formType.value = "Other";
            this.customTypeRow.style.display = "block";
            this.formCustomType.value = item.contentType;
            this.formCustomType.required = true;
        }

        // Platforms Checkboxes
        document.getElementById("platform-linkedin").checked = item.platforms.includes("LinkedIn");
        document.getElementById("platform-twitter").checked = item.platforms.includes("X/Twitter") || item.platforms.includes("Twitter");
        document.getElementById("platform-instagram").checked = item.platforms.includes("Instagram");
        document.getElementById("platform-facebook").checked = item.platforms.includes("Facebook");

        // Load links for Published items inside modal
        this.updateModalLinksVisibility();
        this.updateModalLinksInputs(item.links || {});

        this.btnDelete.style.display = "inline-flex";
        this.modal.classList.add("active");
    }

    closeModal() {
        this.modal.classList.remove("active");
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const id = this.formId.value;
        const date = this.formDate.value;
        const topic = this.formTopic.value;
        const series = this.formSeriesSelect ? this.formSeriesSelect.value : "None";
        const copy = this.formCopy.value;
        const status = this.formStatus.value;
        
        let contentType = this.formType.value;
        if (contentType === "Other") {
            contentType = this.formCustomType.value;
        }

        // Get checked platforms
        const platforms = [];
        if (document.getElementById("platform-linkedin").checked) platforms.push("LinkedIn");
        if (document.getElementById("platform-twitter").checked) platforms.push("X/Twitter");
        if (document.getElementById("platform-instagram").checked) platforms.push("Instagram");
        if (document.getElementById("platform-facebook").checked) platforms.push("Facebook");

        // Get published links from modal if status is Published
        const links = {};
        if (status === "Published" && this.modalLinksContainer) {
            const inputs = this.modalLinksContainer.querySelectorAll("input");
            inputs.forEach(input => {
                const platform = input.getAttribute("data-platform");
                const value = input.value.trim();
                if (value) {
                    links[platform] = value;
                }
            });
        }

        if (id) {
            // Edit existing
            const index = this.schedules.findIndex(s => s.id === id);
            if (index !== -1) {
                const existing = this.schedules[index];
                
                // Clean up links if any platforms were unchecked, and merge new inputs
                const cleanedLinks = {};
                platforms.forEach(p => {
                    if (links[p]) {
                        cleanedLinks[p] = links[p];
                    } else if (existing.links && existing.links[p]) {
                        cleanedLinks[p] = existing.links[p];
                    }
                });
                
                this.schedules[index] = { 
                    ...existing, 
                    date, 
                    contentType, 
                    topic, 
                    series, 
                    copy, 
                    status, 
                    platforms,
                    links: cleanedLinks
                };
            }
        } else {
            // Create new
            const newId = Date.now().toString();
            this.schedules.push({ id: newId, date, contentType, topic, series, copy, status, platforms, links });
        }

        await this.saveToStorage();
        this.closeModal();
        this.render();
    }

    async handleDelete() {
        const id = this.formId.value;
        if (!id) return;

        if (confirm("Are you sure you want to delete this content schedule?")) {
            this.schedules = this.schedules.filter(s => s.id !== id);
            await this.saveToStorage();
            this.closeModal();
            this.render();
        }
    }

    // Dashboard View Render
    renderDashboard() {
        this.renderMiniCalendar();
        this.renderUpcomingPosts();
    }

    renderMiniCalendar() {
        this.miniCalendar.innerHTML = "";
        
        const firstDayIndex = new Date(this.year, this.month, 1).getDay();
        const totalDays = new Date(this.year, this.month + 1, 0).getDate();
        
        // Add empty cells for padding
        for (let i = 0; i < firstDayIndex; i++) {
            const cell = document.createElement("div");
            cell.className = "mini-day prev-next";
            this.miniCalendar.appendChild(cell);
        }

        // Add actual days
        for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${this.year}-${(this.month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
            const cell = document.createElement("div");
            cell.className = "mini-day current-month";
            cell.innerText = d;
            
            // Check if day has event
            const dayEvents = this.schedules.filter(s => s.date === dateStr);
            if (dayEvents.length > 0) {
                cell.classList.add("has-event");
                cell.title = `${dayEvents.length} post(s) scheduled`;
            }

            cell.addEventListener("click", () => {
                this.openAddModal(dateStr);
            });

            this.miniCalendar.appendChild(cell);
        }
    }

    prevMonth() {
        this.month--;
        if (this.month < 0) {
            this.month = 11;
            this.year--;
        }
        this.renderCalendarGrid();
        this.renderMiniCalendar();
    }

    nextMonth() {
        this.month++;
        if (this.month > 11) {
            this.month = 0;
            this.year++;
        }
        this.renderCalendarGrid();
        this.renderMiniCalendar();
    }

    renderUpcomingPosts() {
        this.upcomingBody.innerHTML = "";
        
        // Sort items by date ascending
        const sorted = [...this.schedules].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        if (sorted.length === 0) {
            this.upcomingBody.innerHTML = "<div class='no-data-msg'>No scheduled posts found.</div>";
            return;
        }

        sorted.forEach(item => {
            const dateObj = new Date(item.date);
            const day = dateObj.getDate();
            // Get short month name
            const monthStr = dateObj.toLocaleString('en-US', { month: 'short' });
            
            const badgeClass = this.getBadgeClass(item.contentType);
            const statusClass = item.status.toLowerCase();

            const div = document.createElement("div");
            div.className = "upcoming-item";
            div.innerHTML = `
                <div class="upcoming-date">
                    <span class="day-num">${day}</span>
                    <span class="day-month">${monthStr}</span>
                </div>
                <div class="upcoming-details">
                    <div class="upcoming-title">${item.topic}</div>
                    <div class="upcoming-meta">
                        <span class="badge ${badgeClass}">${item.contentType}</span>
                        <span class="status-pill ${statusClass}">${item.status}</span>
                    </div>
                </div>
            `;
            
            div.addEventListener("click", () => {
                this.openEditModal(item.id);
            });
            this.upcomingBody.appendChild(div);
        });
    }

    getBadgeClass(type) {
        switch(type) {
            case "Startup Spotlight": return "badge-primary";
            case "Incubator Spotlight": return "badge-secondary";
            case "Human Content": return "badge-accent";
            case "MSH Brand Identity": return "badge-brand";
            case "FoundHer": return "badge-rose";
            case "Milestone Moments": return "badge-emerald";
            case "Startup Decode": return "badge-indigo";
            default: return "badge-secondary";
        }
    }

    // Calendar View Render
    renderCalendarGrid() {
        this.mainCalendarGrid.innerHTML = "";
        
        // Filters
        const typeFilter = this.calendarFilterType.value;
        const statusFilter = this.calendarFilterStatus.value;
        const searchVal = this.globalSearch.value.toLowerCase();
        
        const firstDayIndex = new Date(this.year, this.month, 1).getDay();
        const totalDays = new Date(this.year, this.month + 1, 0).getDate();

        // Update calendar month year title
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        if (this.calendarMonthYear) {
            this.calendarMonthYear.innerText = `${monthNames[this.month]} ${this.year}`;
        }

        // Render previous month empty spaces
        for (let i = 0; i < firstDayIndex; i++) {
            const cell = document.createElement("div");
            cell.className = "calendar-cell prev-next";
            this.mainCalendarGrid.appendChild(cell);
        }

        // Render days
        for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${this.year}-${(this.month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
            const cell = document.createElement("div");
            cell.className = "calendar-cell";
            
            // Check if day is today
            const today = new Date();
            if (today.getDate() === d && today.getMonth() === this.month && today.getFullYear() === this.year) {
                cell.classList.add("current-day");
            }

            // Check if day is selected
            if (this.selectedDate === dateStr) {
                cell.classList.add("active-day");
            }

            // Cell header
            const header = document.createElement("div");
            header.className = "cell-header";
            header.innerHTML = `
                <span class="cell-num">${d}</span>
                <button class="cell-btn-add" title="Add post on this day">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
            `;
            
            // Add click to create post
            header.querySelector(".cell-btn-add").addEventListener("click", (e) => {
                e.stopPropagation();
                this.openAddModal(dateStr);
            });

            cell.appendChild(header);

            // Container for event pills
            const eventsContainer = document.createElement("div");
            eventsContainer.className = "cell-events-container";

            // Find events for this date matching the filters
            const dayEvents = this.schedules.filter(item => {
                if (item.date !== dateStr) return false;
                if (typeFilter && item.contentType !== typeFilter) return false;
                if (statusFilter && item.status !== statusFilter) return false;
                if (searchVal && !item.topic.toLowerCase().includes(searchVal) && 
                    !item.contentType.toLowerCase().includes(searchVal) &&
                    !(item.copy || "").toLowerCase().includes(searchVal) &&
                    !(item.series || "").toLowerCase().includes(searchVal)) {
                    return false;
                }
                return true;
            });

            dayEvents.forEach(evt => {
                const pill = document.createElement("div");
                let typeClass = "";
                
                if (evt.contentType === "Startup Spotlight") typeClass = "spotlight";
                else if (evt.contentType === "Incubator Spotlight") typeClass = "incubator";
                else if (evt.contentType === "Human Content") typeClass = "human";
                else if (evt.contentType === "MSH Brand Identity") typeClass = "brand";
                else if (evt.contentType === "FoundHer") typeClass = "foundher";
                else if (evt.contentType === "Milestone Moments") typeClass = "milestones";
                else if (evt.contentType === "Startup Decode") typeClass = "decode";

                pill.className = `calendar-event-pill ${typeClass}`;
                pill.innerText = evt.topic;
                pill.title = `${evt.contentType}: ${evt.topic}\nStatus: ${evt.status}`;
                
                pill.addEventListener("click", (e) => {
                    e.stopPropagation();
                    this.openEditModal(evt.id);
                });
                eventsContainer.appendChild(pill);
            });

            cell.appendChild(eventsContainer);

            // Clicking cell selects that day and shows details
            cell.addEventListener("click", () => {
                this.selectedDate = dateStr;
                this.renderCalendarGrid();
                this.renderDayDetails(dateStr);
            });

            this.mainCalendarGrid.appendChild(cell);
        }

        // Render subsequent empty slots to fill the grid row
        const totalGridSlots = firstDayIndex + totalDays;
        const remainder = totalGridSlots % 7;
        if (remainder !== 0) {
            const nextEmptySlots = 7 - remainder;
            for (let i = 0; i < nextEmptySlots; i++) {
                const cell = document.createElement("div");
                cell.className = "calendar-cell prev-next";
                this.mainCalendarGrid.appendChild(cell);
            }
        }
    }

    // List Table View Render
    renderListView() {
        this.listTableBody.innerHTML = "";
        
        const searchVal = this.listSearch ? this.listSearch.value.toLowerCase() : "";
        const typeFilter = this.listFilterType ? this.listFilterType.value : "";
        const statusFilter = this.listFilterStatus ? this.listFilterStatus.value : "";
        const monthFilter = this.listFilterMonth ? this.listFilterMonth.value : "";
        const yearFilter = this.listFilterYear ? this.listFilterYear.value : "";
        const sortVal = this.listSort ? this.listSort.value : "date-desc";

        let filtered = this.schedules.filter(item => {
            if (typeFilter && item.contentType !== typeFilter) return false;
            if (statusFilter && item.status !== statusFilter) return false;
            
            if (monthFilter !== "") {
                if (!item.date) return false;
                const parts = item.date.split("-");
                if (parts.length !== 3) return false;
                const postMonth = parseInt(parts[1], 10) - 1;
                if (postMonth !== parseInt(monthFilter, 10)) return false;
            }
            if (yearFilter !== "") {
                if (!item.date) return false;
                const parts = item.date.split("-");
                if (parts.length !== 3) return false;
                const postYear = parseInt(parts[0], 10);
                if (postYear !== parseInt(yearFilter, 10)) return false;
            }
            
            if (searchVal) {
                const matchesTopic = item.topic.toLowerCase().includes(searchVal);
                const matchesType = item.contentType.toLowerCase().includes(searchVal);
                const matchesSeries = (item.series || "").toLowerCase().includes(searchVal);
                const matchesCopy = (item.copy || "").toLowerCase().includes(searchVal);
                return matchesTopic || matchesType || matchesSeries || matchesCopy;
            }
            return true;
        });

        // Sort items
        if (sortVal === "date-asc") {
            filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
        } else {
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        // Render items inside table
        if (filtered.length === 0) {
            this.listTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="align-center" style="padding: 4.5rem 2rem;">
                        <div class="empty-state-wrapper" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; text-align: center;">
                            <div class="empty-state-icon" style="width: 56px; height: 56px; border-radius: 50%; background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.15); display: flex; align-items: center; justify-content: center; color: #60a5fa; box-shadow: 0 0 20px rgba(59, 130, 246, 0.1); margin-bottom: 0.5rem; animation: iconPulse 4s ease-in-out infinite;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
                            </div>
                            <h4 style="font-family: 'Outfit', sans-serif; font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin: 0;">No Scheduled Content Found</h4>
                            <p style="font-size: 0.85rem; color: var(--text-muted); max-width: 280px; line-height: 1.5; margin: 0 auto;">No content items match the selected month, year, and search keywords.</p>
                        </div>
                    </td>
                </tr>
            `;
            this.listTableFooter.innerText = "Showing 0 entries";
            return;
        }

        filtered.forEach(item => {
            const badgeClass = this.getBadgeClass(item.contentType);
            const statusClass = item.status.toLowerCase();
            
            // Format Platforms as mini labels (with links if they are published and links exist)
            const platformBadges = (item.platforms || []).map(p => {
                const color = p === "LinkedIn" ? "#0a66c2" : p === "X/Twitter" ? "#000000" : p === "Instagram" ? "#e1306c" : "#1877f2";
                const border = p === "X/Twitter" ? "rgba(255,255,255,0.15)" : "transparent";
                
                // If a published link exists for this platform, wrap in a clickable link
                const url = item.links && item.links[p];
                if (url) {
                    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block; font-size: 0.65rem; background: ${color}; border: 1px solid ${border}; color: white; padding: 2px 5px; border-radius: 4px; margin-right: 3px; font-weight:600; text-decoration:none; transition: transform 0.2s;" title="View published link on ${p}">🔗 ${p}</a>`;
                }
                
                return `<span style="display:inline-block; font-size: 0.65rem; background: ${color}; border: 1px solid ${border}; color: white; padding: 2px 5px; border-radius: 4px; margin-right: 3px; font-weight:600;">${p}</span>`;
            }).join("");

            const isPublished = item.status === "Published";
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td data-label="Date"><strong>${item.date}</strong></td>
                <td data-label="Content Type"><span class="badge ${badgeClass}">${item.contentType}</span></td>
                <td data-label="Topic"><strong>${item.topic}</strong></td>
                <td data-label="Series" style="color: var(--accent-cyan); font-weight: 500;">${item.series || '-'}</td>
                <td data-label="Caption"><div class="table-copy-cell" title="${escapeHtml(item.copy || '')}">${escapeHtml(item.copy || '-')}</div></td>
                <td data-label="Status">
                    <div class="switch-container">
                        <span class="status-pill ${statusClass}">${item.status}</span>
                        <label class="switch" title="Quick Publish Toggle">
                            <input type="checkbox" class="toggle-publish-btn" data-id="${item.id}" ${isPublished ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </td>
                <td data-label="Platforms">${platformBadges || '-'}</td>
                <td data-label="Actions" class="align-center">
                    <div class="table-actions">
                        <button class="btn-tbl-edit" title="Edit content"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                        <button class="btn-tbl-delete" title="Delete content"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>
                    </div>
                </td>
            `;

            // Bind triggers
            tr.querySelector(".btn-tbl-edit").addEventListener("click", (e) => {
                e.stopPropagation();
                this.openEditModal(item.id);
            });
            tr.querySelector(".btn-tbl-delete").addEventListener("click", (e) => {
                e.stopPropagation();
                this.formId.value = item.id;
                this.handleDelete();
            });
            tr.querySelector(".toggle-publish-btn").addEventListener("change", (e) => {
                const id = e.target.getAttribute("data-id");
                const isChecked = e.target.checked;
                this.togglePublish(id, isChecked);
            });

            this.listTableBody.appendChild(tr);
        });

        this.listTableFooter.innerText = `Showing ${filtered.length} of ${this.schedules.length} entries`;
    }

    async togglePublish(id, isPublished) {
        const index = this.schedules.findIndex(s => s.id === id);
        if (index !== -1) {
            this.schedules[index].status = isPublished ? "Published" : "Scheduled";
            await this.saveToStorage();
            this.render();
        }
    }



    // CSV & JSON Exporters
    exportToJson() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.schedules, null, 4));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", `msh_content_schedule_${this.year}_07.json`);
        dlAnchorElem.click();
    }

    exportToCsv() {
        const headers = ["Date", "Content Type", "Topic/Theme", "Flagship Series", "Caption/Copy Idea", "Status", "Platforms"];
        
        let csvContent = headers.join(",") + "\n";
        
        // Sort items by date ascending
        const sorted = [...this.schedules].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        sorted.forEach(item => {
            const platformsStr = (item.platforms || []).join(";");
            const row = [
                item.date,
                escapeCsvCell(item.contentType),
                escapeCsvCell(item.topic),
                escapeCsvCell(item.series || ""),
                escapeCsvCell(item.copy || ""),
                item.status,
                escapeCsvCell(platformsStr)
            ];
            csvContent += row.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `msh_content_schedule_${this.year}_07.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    renderDayDetails(dateStr) {
        const detailsContainer = document.getElementById("calendar-day-details");
        if (!detailsContainer) return;

        // Parse date for human readability
        const dateObj = new Date(dateStr);
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = dateObj.toLocaleDateString('en-US', options);

        // Find events for this date
        const dayEvents = this.schedules.filter(item => item.date === dateStr);

        let html = `
            <div class="day-details-header">
                <h3>Schedules for <span>${formattedDate}</span></h3>
                <button class="btn btn-primary btn-sm" id="btn-day-add-event">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    <span>Add Schedule</span>
                </button>
            </div>
        `;

        if (dayEvents.length === 0) {
            html += `
                <div class="day-details-empty">
                    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-dark); margin-bottom: 0.5rem;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <span>No schedules planned for this day. Click the button above to add one.</span>
                </div>
            `;
        } else {
            html += `<div class="day-details-list">`;
            dayEvents.forEach(item => {
                const badgeClass = this.getBadgeClass(item.contentType);
                const statusClass = item.status.toLowerCase();
                const platformBadges = (item.platforms || []).map(p => {
                    const color = p === "LinkedIn" ? "#0a66c2" : p === "X/Twitter" ? "#000000" : p === "Instagram" ? "#e1306c" : "#1877f2";
                    const border = p === "X/Twitter" ? "rgba(255,255,255,0.15)" : "transparent";
                    return `<span style="display:inline-block; font-size: 0.65rem; background: ${color}; border: 1px solid ${border}; color: white; padding: 2px 6px; border-radius: 4px; margin-right: 4px; font-weight:600;">${p}</span>`;
                }).join("");

                let linksHtml = "";
                if (item.status === "Published" && item.links && Object.keys(item.links).length > 0) {
                    linksHtml += `<div class="day-details-links" style="margin-top: 0.65rem; padding-top: 0.5rem; border-top: 1px dashed rgba(255,255,255,0.05); display: flex; flex-direction: column; gap: 0.35rem;">`;
                    Object.entries(item.links).forEach(([platform, url]) => {
                        const color = platform === "LinkedIn" ? "#60a5fa" : platform === "X/Twitter" ? "#ffffff" : platform === "Instagram" ? "#f472b6" : "#3b82f6";
                        linksHtml += `
                            <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="font-size: 0.75rem; color: ${color}; text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem; word-break: break-all;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                <span style="font-weight: 600;">${platform}:</span> <span style="text-decoration: underline; opacity: 0.85;">${escapeHtml(url)}</span>
                            </a>
                        `;
                    });
                    linksHtml += `</div>`;
                }

                html += `
                    <div class="day-details-card" data-id="${item.id}">
                        <div class="day-details-main">
                            <div class="day-details-title-row">
                                <span class="day-details-title">${escapeHtml(item.topic)}</span>
                                <span class="badge ${badgeClass}">${item.contentType}</span>
                                ${item.series && item.series !== "None" ? `<span class="day-details-pillar">${escapeHtml(item.series)}</span>` : ""}
                                <span class="status-pill ${statusClass}">${item.status}</span>
                            </div>
                            <p class="day-details-copy">${escapeHtml(item.copy || "No copy description provided.")}</p>
                            <div class="day-details-platforms">${platformBadges || '<span style="color: var(--text-dark); font-size:0.75rem;">No platforms selected</span>'}</div>
                            ${linksHtml}
                        </div>
                        <div class="day-details-actions">
                            <button class="btn btn-secondary btn-sm btn-day-edit" data-id="${item.id}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                <span>Edit</span>
                            </button>
                            <button class="btn btn-danger btn-sm btn-day-delete" data-id="${item.id}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                <span>Delete</span>
                            </button>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        }

        detailsContainer.innerHTML = html;

        // Bind event listeners inside day details panel
        const addBtn = detailsContainer.querySelector("#btn-day-add-event");
        if (addBtn) {
            addBtn.addEventListener("click", () => {
                this.openAddModal(dateStr);
            });
        }

        const editBtns = detailsContainer.querySelectorAll(".btn-day-edit");
        editBtns.forEach(btn => {
            btn.addEventListener("click", (e) => {
                const id = btn.getAttribute("data-id");
                this.openEditModal(id);
            });
        });

        const deleteBtns = detailsContainer.querySelectorAll(".btn-day-delete");
        deleteBtns.forEach(btn => {
            btn.addEventListener("click", (e) => {
                const id = btn.getAttribute("data-id");
                this.formId.value = id;
                this.handleDelete();
            });
        });
    }

    // Analytics Dashboard Operations
    renderAnalytics() {
        if (!this.analyticsChannelsGrid) return;
        
        const channels = [
            {
                key: "linkedin",
                name: "LinkedIn",
                class: "linkedin",
                icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>`,
                followersLabel: "Followers"
            },
            {
                key: "facebook",
                name: "Facebook",
                class: "facebook",
                icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>`,
                followersLabel: "Followers"
            },
            {
                key: "instagram",
                name: "Instagram",
                class: "instagram",
                icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`,
                followersLabel: "Followers"
            },
            {
                key: "twitter",
                name: "X / Twitter",
                class: "twitter",
                icon: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>`,
                followersLabel: "Followers"
            },
            {
                key: "youtube",
                name: "YouTube",
                class: "youtube",
                icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>`,
                followersLabel: "Subscribers"
            }
        ];

        let html = "";
        channels.forEach(ch => {
            const data = this.analytics[ch.key];
            const isGrowthPositive = data.followersGrowth >= 0;
            const growthSign = isGrowthPositive ? "+" : "";
            const growthClass = isGrowthPositive ? "positive" : "negative";
            const arrowIcon = isGrowthPositive 
                ? `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

            html += `
            <div class="analytics-card ${ch.class}">
                <div class="analytics-card-header">
                    <div class="platform-info-wrapper">
                        <div class="platform-icon-circle">${ch.icon}</div>
                        <span class="platform-name">${ch.name}</span>
                    </div>
                    <div class="metric-growth-badge ${growthClass}">
                        ${arrowIcon}
                        <span>${growthSign}${data.followersGrowth}%</span>
                    </div>
                </div>
                
                <div class="analytics-main-stat" style="margin-bottom: 0;">
                    <span>${ch.followersLabel}</span>
                    <h4>${data.followers.toLocaleString()}</h4>
                </div>
            </div>
            `;
        });
        
        this.analyticsChannelsGrid.innerHTML = html;
    }

    openAnalyticsModal() {
        if (!this.analyticsModal) return;
        
        // Pre-fill inputs with current values
        document.getElementById("input-li-followers").value = this.analytics.linkedin.followers;
        document.getElementById("input-li-growth").value = this.analytics.linkedin.followersGrowth;
        
        document.getElementById("input-fb-followers").value = this.analytics.facebook.followers;
        document.getElementById("input-fb-growth").value = this.analytics.facebook.followersGrowth;
        
        document.getElementById("input-ig-followers").value = this.analytics.instagram.followers;
        document.getElementById("input-ig-growth").value = this.analytics.instagram.followersGrowth;
        
        document.getElementById("input-tw-followers").value = this.analytics.twitter.followers;
        document.getElementById("input-tw-growth").value = this.analytics.twitter.followersGrowth;
        
        document.getElementById("input-yt-followers").value = this.analytics.youtube.followers;
        document.getElementById("input-yt-growth").value = this.analytics.youtube.followersGrowth;
        
        this.analyticsModal.classList.add("active");
    }

    closeAnalyticsModal() {
        if (this.analyticsModal) {
            this.analyticsModal.classList.remove("active");
        }
    }

    async handleAnalyticsFormSubmit(e) {
        e.preventDefault();
        
        // Save values
        this.analytics.linkedin.followers = parseInt(document.getElementById("input-li-followers").value, 10) || 0;
        this.analytics.linkedin.followersGrowth = parseFloat(document.getElementById("input-li-growth").value) || 0;
        
        this.analytics.facebook.followers = parseInt(document.getElementById("input-fb-followers").value, 10) || 0;
        this.analytics.facebook.followersGrowth = parseFloat(document.getElementById("input-fb-growth").value) || 0;
        
        this.analytics.instagram.followers = parseInt(document.getElementById("input-ig-followers").value, 10) || 0;
        this.analytics.instagram.followersGrowth = parseFloat(document.getElementById("input-ig-growth").value) || 0;
        
        this.analytics.twitter.followers = parseInt(document.getElementById("input-tw-followers").value, 10) || 0;
        this.analytics.twitter.followersGrowth = parseFloat(document.getElementById("input-tw-growth").value) || 0;
        
        this.analytics.youtube.followers = parseInt(document.getElementById("input-yt-followers").value, 10) || 0;
        this.analytics.youtube.followersGrowth = parseFloat(document.getElementById("input-yt-growth").value) || 0;
        
        // Save to server
        await this.saveAnalyticsToServer();
        
        // Re-render and close
        this.renderAnalytics();
        this.closeAnalyticsModal();
    }

    populateSeriesDropdown() {
        if (!this.formSeriesSelect) return;
        
        let html = '<option value="None">None</option>';
        if (this.series) {
            this.series.forEach(s => {
                html += `<option value="${s.name}">${s.name}</option>`;
            });
        }
        this.formSeriesSelect.innerHTML = html;
    }

    renderSeries() {
        if (!this.seriesGrid) return;
        
        const filterMonth = parseInt(this.seriesFilterMonth.value, 10);
        const filterYear = parseInt(this.seriesFilterYear.value, 10);
        
        let html = "";
        if (this.series) {
            this.series.forEach((s, index) => {
                // Count published posts in schedules matching this content type AND the filtered month/year
                const monthlyCount = this.schedules.filter(item => {
                    if (!item.date || item.status !== "Published") return false;
                    
                    const itemSeries = item.series || "";
                    if (itemSeries.toLowerCase() !== s.name.toLowerCase()) return false;
                    
                    const parts = item.date.split("-");
                    if (parts.length !== 3) return false;
                    
                    const postYear = parseInt(parts[0], 10);
                    const postMonth = parseInt(parts[1], 10) - 1;
                    
                    return postMonth === filterMonth && postYear === filterYear;
                }).length;
                
                const isGradient = s.image.startsWith("linear-gradient");
                const cardBgStyle = isGradient ? s.image : `url(${s.image})`;
                
                const formattedStart = formatDateString(s.startDate);
                const formattedEnd = s.ongoing ? "Ongoing" : formatDateString(s.endDate);
                
                const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                const selectedMonthName = monthNames[filterMonth] || "Monthly";

                html += `
                <div class="series-card" style="position: relative; overflow: hidden;">
                    <!-- Colored accent bar at the top -->
                    <div class="series-accent-bar" style="height: 5px; background: ${s.image || 'var(--accent-primary)'}; width: 100%;"></div>
                    
                    <div class="series-card-body" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                            <h4 class="series-title" style="margin: 0; font-size: 1.15rem; font-weight: 600; font-family: 'Outfit', sans-serif; color: var(--text-primary); line-height: 1.4;">${escapeHtml(s.name)}</h4>
                            <div style="display: flex; gap: 0.4rem; flex-shrink: 0; align-items: center;">
                                <button class="btn-edit-series" data-index="${index}" title="Edit Series">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                </button>
                                <button class="btn-delete-series" data-index="${index}" title="Delete Series">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                </button>
                            </div>
                        </div>
                        
                        <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: var(--text-muted); margin-top: -0.25rem;">
                            <span>Duration:</span>
                            <span style="font-weight: 500; color: var(--text-secondary);">${formattedStart} - ${formattedEnd}</span>
                        </div>

                        <div class="series-meta-new" style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.03); margin-top: 0.5rem; font-size: 0.8rem;">
                            <span style="color: var(--text-muted);">${selectedMonthName} Published:</span>
                            <span style="font-weight: 600; color: #10b981;">${monthlyCount} posts</span>
                        </div>
                    </div>
                </div>
                `;
            });
        }
        
        if (html === "") {
            html = `
                <div class="empty-state-wrapper" style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; text-align: center; padding: 4.5rem 2rem; background: var(--bg-card); border: 1px dashed rgba(255, 255, 255, 0.08); border-radius: 18px; backdrop-filter: var(--glass-blur);">
                    <div class="empty-state-icon" style="width: 56px; height: 56px; border-radius: 50%; background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.15); display: flex; align-items: center; justify-content: center; color: #60a5fa; box-shadow: 0 0 20px rgba(59, 130, 246, 0.1); margin-bottom: 0.5rem; animation: iconPulse 4s ease-in-out infinite;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                    <h4 style="font-family: 'Outfit', sans-serif; font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin: 0;">No Flagship Series Configured</h4>
                    <p style="font-size: 0.85rem; color: var(--text-muted); max-width: 280px; line-height: 1.5; margin: 0 auto;">Get started by adding a new flagship series with a cover image, name, and timeframe.</p>
                </div>
            `;
        }
        
        this.seriesGrid.innerHTML = html;

        // Bind edit buttons
        const editBtns = this.seriesGrid.querySelectorAll(".btn-edit-series");
        editBtns.forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute("data-index"), 10);
                this.openEditSeriesModal(index);
            });
        });

        // Bind delete buttons
        const deleteBtns = this.seriesGrid.querySelectorAll(".btn-delete-series");
        deleteBtns.forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute("data-index"), 10);
                this.deleteSeries(index);
            });
        });
    }

    openSeriesModal() {
        if (!this.seriesModal) return;
        this.activeSeriesIndex = null;
        this.seriesModal.querySelector("h3").innerText = "Add Flagship Series";
        this.seriesForm.reset();
        if (this.seriesEndDate) {
            this.seriesEndDate.disabled = false;
        }
        if (this.seriesImagePreview) {
            this.seriesImagePreview.style.display = "none";
            this.seriesImagePreview.style.backgroundImage = "";
        }
        delete this.seriesForm.dataset.imageResult;
        this.seriesModal.classList.add("active");
    }

    openEditSeriesModal(index) {
        if (!this.seriesModal || !this.series || !this.series[index]) return;
        
        const s = this.series[index];
        this.activeSeriesIndex = index;
        
        // Update modal title
        this.seriesModal.querySelector("h3").innerText = "Edit Flagship Series";
        
        // Fill form fields
        document.getElementById("series-name").value = s.name;
        if (this.seriesStartDate) this.seriesStartDate.value = s.startDate || "";
        if (this.seriesEndDate) {
            this.seriesEndDate.value = s.endDate || "";
            this.seriesEndDate.disabled = s.ongoing || false;
        }
        if (this.seriesOngoing) this.seriesOngoing.checked = s.ongoing || false;
        
        // Preview current image
        if (this.seriesImagePreview) {
            const isGradient = s.image.startsWith("linear-gradient");
            this.seriesImagePreview.style.display = "block";
            this.seriesImagePreview.style.backgroundImage = isGradient ? s.image : `url(${s.image})`;
        }
        
        // Clear file input
        if (this.seriesImageFile) {
            this.seriesImageFile.value = "";
        }
        
        // Set target image result to current image
        this.seriesForm.dataset.imageResult = s.image;
        
        // Open modal
        this.seriesModal.classList.add("active");
    }

    async deleteSeries(index) {
        if (!this.series || !this.series[index]) return;
        
        const seriesName = this.series[index].name;
        if (confirm(`Are you sure you want to delete the flagship series "${seriesName}"?`)) {
            // Remove from series array
            this.series.splice(index, 1);
            
            // Save to server
            await this.saveSeriesToServer();
            
            // Update dropdown and UI
            this.populateSeriesDropdown();
            this.renderSeries();
        }
    }

    closeSeriesModal() {
        if (this.seriesModal) {
            this.seriesModal.classList.remove("active");
        }
    }


    async handleSeriesFormSubmit(e) {
        e.preventDefault();
        const name = document.getElementById("series-name").value.trim();
        let image = this.seriesForm.dataset.imageResult || "";
        
        const startDate = this.seriesStartDate.value;
        const ongoing = this.seriesOngoing.checked;
        const endDate = ongoing ? "" : this.seriesEndDate.value;

        if (!name || !startDate || (!ongoing && !endDate)) {
            alert("Please fill in all required fields.");
            return;
        }

        if (!image) {
            const gradients = [
                "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                "linear-gradient(135deg, #059669 0%, #047857 100%)",
                "linear-gradient(135deg, #db2777 0%, #be185d 100%)",
                "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)",
                "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)"
            ];
            const index = this.series ? this.series.length : 0;
            image = gradients[index % gradients.length];
        }

        const seriesData = { name, image, startDate, endDate, ongoing };

        if (this.activeSeriesIndex !== null && this.activeSeriesIndex !== undefined) {
            // Edit existing series
            const index = this.activeSeriesIndex;
            const oldName = this.series[index].name;
            
            this.series[index] = seriesData;
            
            // Also update any schedules that had the old series name to the new one!
            this.schedules.forEach(item => {
                if (item.series === oldName) {
                    item.series = name;
                }
            });
            await this.saveToStorage(); // Save updated schedules
            this.render(); // Re-render schedules count, calendar, list, etc.
        } else {
            // Add new series
            if (!this.series) this.series = [];
            this.series.push(seriesData);
        }

        // Save to server
        await this.saveSeriesToServer();

        // Close modal
        this.closeSeriesModal();

        // Update content type select dropdown
        this.populateSeriesDropdown();

        // Re-render series tab
        this.renderSeries();
    }

    updateModalLinksVisibility() {
        if (!this.modalLinksRow || !this.formStatus) return;
        if (this.formStatus.value === "Published") {
            this.modalLinksRow.style.display = "block";
            this.updateModalLinksInputs();
        } else {
            this.modalLinksRow.style.display = "none";
        }
    }

    updateModalLinksInputs(existingLinks = null) {
        if (!this.modalLinksContainer) return;
        
        // Capture what is currently typed in the input fields before redrawing
        const currentTyped = {};
        this.modalLinksContainer.querySelectorAll("input").forEach(input => {
            const platform = input.getAttribute("data-platform");
            currentTyped[platform] = input.value.trim();
        });
        
        this.modalLinksContainer.innerHTML = "";
        
        // Find checked platforms
        const platforms = [];
        if (document.getElementById("platform-linkedin").checked) platforms.push("LinkedIn");
        if (document.getElementById("platform-twitter").checked) platforms.push("X/Twitter");
        if (document.getElementById("platform-instagram").checked) platforms.push("Instagram");
        if (document.getElementById("platform-facebook").checked) platforms.push("Facebook");
        
        if (platforms.length === 0) {
            this.modalLinksContainer.innerHTML = `<span style="color: var(--text-muted); font-size: 0.8rem; grid-column: 1 / -1;">No platforms selected. Enable platforms above to add published URLs.</span>`;
            return;
        }
        
        platforms.forEach(platform => {
            let url = "";
            if (existingLinks && existingLinks[platform] !== undefined) {
                url = existingLinks[platform];
            } else if (currentTyped[platform] !== undefined) {
                url = currentTyped[platform];
            } else if (this.activeEventId) {
                const item = this.schedules.find(s => s.id === this.activeEventId);
                if (item && item.links && item.links[platform]) {
                    url = item.links[platform];
                }
            }
            
            const color = platform === "LinkedIn" ? "#0a66c2" : platform === "X/Twitter" ? "#ffffff" : platform === "Instagram" ? "#e1306c" : "#1877f2";
            
            this.modalLinksContainer.insertAdjacentHTML("beforeend", `
                <div class="link-input-group">
                    <label class="link-input-label" style="color: ${platform === 'X/Twitter' ? '#e2e8f0' : color};">
                        <span style="display:inline-block; width: 8px; height: 8px; border-radius:50%; background-color: ${platform === 'X/Twitter' ? '#ffffff' : color};"></span>
                        ${platform} Link
                    </label>
                    <input type="url" 
                           class="form-control modal-link-input" 
                           data-platform="${platform}" 
                           value="${escapeHtml(url)}" 
                           placeholder="https://..."
                           style="border-color: rgba(255,255,255,0.08);">
                </div>
            `);
        });
    }

    showToast(message, type = "success") {
        let container = document.getElementById("toast-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "toast-container";
            document.body.appendChild(container);
        }

        const toast = document.createElement("div");
        toast.className = `toast-notification ${type}`;

        const checkIcon = type === "success" 
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

        toast.innerHTML = `
            <span class="toast-icon">${checkIcon}</span>
            <span class="toast-message">${escapeHtml(message)}</span>
        `;

        container.appendChild(toast);

        // Force reflow
        toast.offsetHeight;

        // Animate in
        toast.classList.add("active");

        // Animate out and cleanup
        setTimeout(() => {
            toast.classList.remove("active");
            toast.classList.add("hide");
            
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 400);
        }, 3000);
    }
}

function formatDateString(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return `${months[monthIndex]} ${day}, ${year}`;
}

// Utility escape helpers
function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeCsvCell(text) {
    if (!text) return '""';
    // escape quotes
    let escaped = text.toString().replace(/"/g, '""');
    // wrap in double quotes
    return `"${escaped}"`;
}

// Instantiate App
document.addEventListener("DOMContentLoaded", () => {
    window.App = new ContentCalendarApp();
});
