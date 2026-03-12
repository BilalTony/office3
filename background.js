/**
 * Background Service Worker for Warden Intent Classifier
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log("Warden Extension: Installed successfully.");
  // Setup daily cleanup alarm
  chrome.alarms.create('WARDEN_DAILY_CLEANUP', { periodInMinutes: 1440 }); 
});

// Periodic cleanup listener
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'WARDEN_DAILY_CLEANUP') {
    cleanupOldLogs();
  }
});

// Listener for ticket logs
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'WARDEN_LOG_TICKET') {
    const newLog = request.payload;
    newLog.timestamp = new Date().toLocaleString();

    chrome.storage.local.get({ ticketLogs: [] }, (result) => {
      // Filter out logs older than 7 days before adding the new one
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const cleanedLogs = result.ticketLogs.filter(log => {
        const logDate = new Date(log.timestamp).getTime();
        return logDate > sevenDaysAgo;
      });

      cleanedLogs.push(newLog);
      
      chrome.storage.local.set({ ticketLogs: cleanedLogs }, () => {
        console.log("Warden: Log saved and old data cleaned.");
        sendResponse({ success: true });
      });
    });
    return true; 
  }
});

function cleanupOldLogs() {
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  chrome.storage.local.get({ ticketLogs: [] }, (result) => {
    const cleanedLogs = result.ticketLogs.filter(log => {
      const logDate = new Date(log.timestamp).getTime();
      return logDate > sevenDaysAgo;
    });
    chrome.storage.local.set({ ticketLogs: cleanedLogs }, () => {
      console.log("Warden: Periodic 7-day cleanup completed.");
    });
  });
}
