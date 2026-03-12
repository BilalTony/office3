/**
 * dashboard.js
 * Logic for the local Warden Intelligence Dashboard (Premium UI).
 */

let allLogs = [];
let filteredLogs = [];
let currentPage = 1;
const rowsPerPage = 10;
let currentFeedbackId = null;
let currentRating = 0;

// Filters State
let filters = {
    ticketId: [],
    intent: [],
    reason: [],
    status: []
};

document.addEventListener('DOMContentLoaded', () => {
    loadData();

    document.getElementById('refreshBtn').addEventListener('click', () => {
        currentPage = 1;
        loadData();
    });
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('submitFeedback').addEventListener('click', handleFeedbackSubmit);
    
    // Programmatic Filter Listeners (CSP Compliance)
    document.querySelectorAll('.filter-header').forEach(header => {
        header.addEventListener('click', (e) => {
            const columnId = header.getAttribute('data-column');
            toggleFilterDropdown(columnId);
            e.stopPropagation();
        });
    });

    document.querySelectorAll('.filter-search-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const columnId = input.getAttribute('data-column');
            searchFilterOptions(columnId, e.target.value);
        });
        // Prevent click in search box from closing menu
        input.addEventListener('click', (e) => e.stopPropagation());
    });

    document.querySelectorAll('.btn-filter-clear').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const columnId = btn.getAttribute('data-column');
            clearFilter(columnId);
            e.stopPropagation();
        });
    });

    document.querySelectorAll('.btn-filter-apply').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const columnId = btn.getAttribute('data-column');
            applyFilter(columnId);
            e.stopPropagation();
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        // Safety check for closest
        if (typeof e.target.closest !== 'function') return;

        if (!e.target.closest('.filter-header') && !e.target.closest('.filter-menu')) {
            closeAllFilterDropdowns();
        }
    });

    // Expose for console use as requested
    window.clearWardenLogs = clearLogs;
    
    // Star interaction
    const starContainer = document.getElementById('starGroup');
    if (starContainer) {
        starContainer.addEventListener('click', (e) => {
            const star = e.target.closest('.survey-star');
            if (star) {
                currentRating = parseInt(star.getAttribute('data-value'));
                updateStars(currentRating);
            }
        });
    }

    // Update current date range display
    updateDateRange();
});

// --- Filter Logic ---

function toggleFilterDropdown(columnId) {
    const menu = document.getElementById(`menu-${columnId}`);
    if (!menu) return;
    const isShowing = menu.classList.contains('show');
    
    closeAllFilterDropdowns();
    
    if (!isShowing) {
        populateFilterDropdown(columnId);
        menu.classList.add('show');
    }
}

function closeAllFilterDropdowns() {
    document.querySelectorAll('.filter-menu').forEach(m => m.classList.remove('show'));
}

function populateFilterDropdown(columnId) {
    const list = document.getElementById(`list-${columnId}`);
    if (!list) return;
    list.innerHTML = '';
    
    // Extract unique values
    let values = [...new Set(allLogs.map(log => {
        if (columnId === 'status') return log.action || log.result || 'UNKNOWN';
        if (columnId === 'reason') return log.reason || log.extractedVoc || 'None';
        return log[columnId] || 'None';
    }))].sort((a, b) => String(a).localeCompare(String(b)));

    // Add "Select All" option
    const selectAllDiv = document.createElement('div');
    selectAllDiv.className = 'filter-option';
    selectAllDiv.innerHTML = `
        <input type="checkbox" id="all-${columnId}" ${filters[columnId].length === 0 ? 'checked' : ''}>
        <label class="filter-option-label" for="all-${columnId}">SELECT ALL</label>
    `;
    selectAllDiv.onclick = (e) => {
        if (e.target.tagName !== 'INPUT') {
            const cb = selectAllDiv.querySelector('input');
            cb.checked = !cb.checked;
        }
        const isChecked = selectAllDiv.querySelector('input').checked;
        const column = selectAllDiv.querySelector('input').id.replace('all-', '');
        
        list.querySelectorAll('input:not(#all-' + columnId + ')').forEach(cb => cb.checked = false);
        if (isChecked) filters[columnId] = [];
    };
    list.appendChild(selectAllDiv);

    values.forEach(val => {
        const div = document.createElement('div');
        div.className = 'filter-option';
        const isChecked = filters[columnId].includes(val);
        div.innerHTML = `
            <input type="checkbox" value="${val}" ${isChecked ? 'checked' : ''}>
            <label class="filter-option-label" title="${val}">${val}</label>
        `;
        div.onclick = (e) => {
            if (e.target.tagName !== 'INPUT') {
                const cb = div.querySelector('input');
                cb.checked = !cb.checked;
            }
            document.getElementById(`all-${columnId}`).checked = false;
        };
        list.appendChild(div);
    });
}

function searchFilterOptions(columnId, text) {
    const list = document.getElementById(`list-${columnId}`);
    if (!list) return;
    const options = list.querySelectorAll('.filter-option:not(:first-child)');
    const searchTerm = text.toLowerCase();
    
    options.forEach(opt => {
        const val = opt.querySelector('.filter-option-label').textContent.toLowerCase();
        opt.style.display = val.includes(searchTerm) ? 'flex' : 'none';
    });
}

function clearFilter(columnId) {
    filters[columnId] = [];
    const icon = document.getElementById(`icon-${columnId}`);
    if (icon) icon.classList.remove('active');
    closeAllFilterDropdowns();
    applyFilters();
}

function applyFilter(columnId) {
    const list = document.getElementById(`list-${columnId}`);
    if (!list) return;
    const selectAll = document.getElementById(`all-${columnId}`).checked;
    
    if (selectAll) {
        filters[columnId] = [];
        const icon = document.getElementById(`icon-${columnId}`);
        if (icon) icon.classList.remove('active');
    } else {
        const selected = Array.from(list.querySelectorAll('input:checked:not([id^="all-"])')).map(cb => cb.value);
        filters[columnId] = selected;
        const icon = document.getElementById(`icon-${columnId}`);
        if (icon) icon.classList.toggle('active', selected.length > 0);
    }
    
    currentPage = 1;
    closeAllFilterDropdowns();
    applyFilters();
}

function applyFilters() {
    filteredLogs = allLogs.filter(log => {
        const valTicketId = log.ticketId || 'None';
        const valIntent = log.intent || 'None';
        const valReason = log.reason || log.extractedVoc || 'None';
        const valStatus = log.action || log.result || 'UNKNOWN';

        const matchId = filters.ticketId.length === 0 || filters.ticketId.includes(valTicketId);
        const matchIntent = filters.intent.length === 0 || filters.intent.includes(valIntent);
        const matchReason = filters.reason.length === 0 || filters.reason.includes(valReason);
        const matchStatus = filters.status.length === 0 || filters.status.includes(valStatus);

        return matchId && matchIntent && matchReason && matchStatus;
    });

    renderTable();
    renderPagination();
}

// --- Display Logic ---

function updateDateRange() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    
    const formatDate = (date) => {
        try {
            const d = date.getDate().toString().padStart(2, '0');
            const m = date.toLocaleString('default', { month: 'short' }).toUpperCase();
            return `${d} ${m} ${date.getFullYear()}`;
        } catch (e) {
            return 'N/A';
        }
    };

    const dateElem = document.getElementById('dateRangeText');
    if (dateElem) {
        dateElem.textContent = `${formatDate(sevenDaysAgo)} - ${formatDate(now)}`;
    }
}

function loadData() {
    chrome.storage.local.get({ ticketLogs: [] }, (result) => {
        allLogs = result.ticketLogs || [];
        // Sort by date descending
        allLogs.sort((a, b) => {
            const dateA = new Date(a.timestamp || 0);
            const dateB = new Date(b.timestamp || 0);
            return dateB - dateA;
        });
        
        updateMetrics();
        applyFilters(); 
    });
}

function updateMetrics() {
    const total = allLogs.length;
    const resolved = allLogs.filter(l => l.result === 'RESOLVED').length;
    const correct = allLogs.filter(l => l.feedbackRating === 5).length;
    const incorrect = allLogs.filter(l => l.feedbackRating === 1).length;
    const attention = allLogs.filter(l => l.feedbackRating >= 2 && l.feedbackRating <= 4).length;
    
    document.getElementById('metricTotal').textContent = total;
    const metricSolved = document.getElementById('metricSolved');
    if (metricSolved) {
        metricSolved.innerHTML = (total > 0 ? `${Math.round((resolved / total) * 100)}%` : '0%') + ' <span style="font-size:0.6rem; vertical-align:middle; text-transform:uppercase; color:var(--slate-400);">SOLVED</span>';
    }
    const metricSolvedCount = document.getElementById('metricSolvedCount');
    if (metricSolvedCount) metricSolvedCount.textContent = resolved;
    
    const metricCorrect = document.getElementById('metricCorrect');
    if (metricCorrect) metricCorrect.textContent = correct;
    
    const metricIncorrect = document.getElementById('metricIncorrect');
    if (metricIncorrect) metricIncorrect.textContent = incorrect;
    
    const metricAttention = document.getElementById('metricAttention');
    if (metricAttention) metricAttention.textContent = attention;
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (filteredLogs.length === 0) {
        document.getElementById('noData').style.display = 'block';
        document.getElementById('paginationContainer').style.display = 'none';
        return;
    }
    document.getElementById('noData').style.display = 'none';
    document.getElementById('paginationContainer').style.display = 'flex';

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedLogs = filteredLogs.slice(start, end);

    paginatedLogs.forEach((log) => {
        const originalIndex = allLogs.findIndex(l => l.timestamp === log.timestamp && l.ticketId === log.ticketId);
        const tr = document.createElement('tr');
        
        const formattedDate = log.timestamp || 'N/A';
        const hasFeedback = log.feedbackRating > 0;
        
        const feedbackContent = hasFeedback ? `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span style="color: var(--warning); font-size: 1rem; letter-spacing: 2px;">${'★'.repeat(log.feedbackRating)}${'☆'.repeat(5 - log.feedbackRating)}</span>
                <button class="btn-chat-view" data-index="${originalIndex}" style="background: none; border: none; cursor: pointer; color: var(--slate-400); display: flex; align-items: center; padding: 4px; border-radius: 4px; border: 1px solid var(--slate-100);">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                </button>
            </div>
        ` : `
            <button class="btn-feedback" data-index="${originalIndex}">
                ☆ GIVE FEEDBACK
            </button>
        `;

        const rawStatus = log.action || log.result || 'UNKNOWN';
        let statusLabel = rawStatus;
        let statusClass = 'status-badge';

        if (rawStatus === 'TRAVERSE_DT') {
            statusLabel = 'PENDING FOR APPROVAL';
            statusClass = 'status-badge pending';
        }

        tr.innerHTML = `
            <td><span class="ticket-id">${log.ticketId}</span></td>
            <td><span style="font-weight: 700; color: var(--slate-400); font-size: 0.75rem;">${log.intent ? log.intent.replace(/_/g, ' ').toUpperCase() : '-'}</span></td>
            <td><span style="font-size: 0.75rem; color: var(--slate-600);">${log.reason || log.extractedVoc || '-'}</span></td>
            <td><span style="font-size: 0.75rem; color: var(--slate-400);">${formattedDate}</span></td>
            <td><span style="font-size: 0.75rem; color: var(--slate-600);">${log.decisionTree || 'None'}</span></td>
            <td><span class="${statusClass}">${statusLabel}</span></td>
            <td>${feedbackContent}</td>
        `;
        
        const giveBtn = tr.querySelector('.btn-feedback');
        if (giveBtn) giveBtn.onclick = () => openFeedbackModal(log.ticketId, originalIndex, false);

        const viewBtn = tr.querySelector('.btn-chat-view');
        if (viewBtn) viewBtn.onclick = () => openFeedbackModal(log.ticketId, originalIndex, true);
        
        tbody.appendChild(tr);
    });
}

function renderPagination() {
    const total = filteredLogs.length;
    const totalPages = Math.ceil(total / rowsPerPage);
    const start = total === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
    const end = Math.min(currentPage * rowsPerPage, total);

    const info = document.getElementById('paginationInfo');
    if (info) info.textContent = `SHOWING ${start} TO ${end} OF ${total} RESULTS`;

    const controls = document.getElementById('paginationControls');
    if (!controls) return;
    controls.innerHTML = '';
    if (totalPages <= 1) return;

    // Previous Arrow
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn nav-arrow';
    prevBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => { currentPage--; renderTable(); renderPagination(); };
    controls.appendChild(prevBtn);

    // Page Numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => { currentPage = i; renderTable(); renderPagination(); };
            controls.appendChild(pageBtn);
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.style.margin = '0 5px';
            dots.style.color = 'var(--slate-400)';
            controls.appendChild(dots);
        }
    }

    // Next Arrow
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn nav-arrow';
    nextBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => { currentPage++; renderTable(); renderPagination(); };
    controls.appendChild(nextBtn);
}

function openFeedbackModal(ticketId, logIndex, isReadOnly = false) {
    if (logIndex < 0 || logIndex >= allLogs.length) return;
    currentFeedbackId = logIndex;
    currentRating = allLogs[logIndex].feedbackRating || 0;
    
    document.getElementById('modalTicketId').textContent = ticketId;
    const remarksField = document.getElementById('feedbackRemarks');
    remarksField.value = allLogs[logIndex].feedbackRemarks || '';
    remarksField.disabled = isReadOnly;
    
    updateStars(currentRating);
    
    document.getElementById('submitFeedback').style.display = isReadOnly ? 'none' : 'block';
    document.getElementById('starGroup').style.pointerEvents = isReadOnly ? 'none' : 'auto';
    document.querySelector('.modal-title').textContent = isReadOnly ? 'Feedback Review' : 'Satisfaction Survey';
    document.getElementById('modalOverlay').style.display = 'flex';
}

function updateStars(rating) {
    const stars = document.querySelectorAll('.survey-star');
    stars.forEach((star, i) => star.classList.toggle('active', (i + 1) <= rating));
}

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
    currentFeedbackId = null;
    currentRating = 0;
}

function handleFeedbackSubmit() {
    if (currentFeedbackId === null) return;
    if (currentRating === 0) {
        alert("Please provide a star rating.");
        return;
    }
    const remarks = document.getElementById('feedbackRemarks').value;
    allLogs[currentFeedbackId].feedbackRating = currentRating;
    allLogs[currentFeedbackId].feedbackRemarks = remarks;

    chrome.storage.local.set({ ticketLogs: allLogs }, () => {
        closeModal();
        updateMetrics();
        applyFilters(); 
    });
}

function clearLogs() {
    if (!confirm('Are you sure you want to delete all stored logs? This cannot be undone.')) return;
    chrome.storage.local.set({ ticketLogs: [] }, () => {
        alert('✅ Logs cleared successfully.');
        loadData();
    });
}

function exportToCSV() {
    if (allLogs.length === 0) return;
    const headers = ['Timestamp', 'Ticket ID', 'Intent', 'Confidence', 'Action', 'Result', 'Rating', 'Remarks', 'VOC'];
    const csvRows = [headers.join(',')];

    allLogs.forEach(log => {
        const row = [
            `"${(log.timestamp || '').replace(/"/g, '""')}"`,
            `"${(log.ticketId || '').replace(/"/g, '""')}"`,
            `"${(log.intent || '').replace(/"/g, '""')}"`,
            `"${(log.confidence || 0).toFixed(4)}"`,
            `"${(log.action || '').replace(/"/g, '""')}"`,
            `"${(log.result || '').replace(/"/g, '""')}"`,
            `"${log.feedbackRating || 0}"`,
            `"${(log.feedbackRemarks || '').replace(/"/g, '""')}"`,
            `"${(log.extractedVoc || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
    });
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.style.display = 'none';
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `warden_all_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
