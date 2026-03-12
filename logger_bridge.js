/**
 * logger_bridge.js
 * Runs in ISOLATED world (default content script world).
 * Listens for messages from the MAIN world (content.js) and forwards them to background.js.
 */

window.addEventListener('message', (event) => {
  // Only handle messages from our same window
  if (event.source !== window) return;

  if (event.data && event.data.type === 'WARDEN_SAVE_LOG') {
    chrome.runtime.sendMessage({
      type: 'WARDEN_LOG_TICKET',
      payload: event.data.payload
    });
  }
});
