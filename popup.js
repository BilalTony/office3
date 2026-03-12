/**
 * popup.js
 * Handles log retrieval, CSV export, and storage clearing.
 */

document.addEventListener('DOMContentLoaded', () => {
    updateLogCount();

    document.getElementById('dashboardBtn').addEventListener('click', openDashboard);
});

function openDashboard() {
    chrome.tabs.create({ url: 'dashboard.html' });
}

function updateLogCount() {
    chrome.storage.local.get({ ticketLogs: [] }, (result) => {
        const count = result.ticketLogs.length;
        document.getElementById('logCountText').textContent = `Total logs saved: ${count}`;
    });
}
