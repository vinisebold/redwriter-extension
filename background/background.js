// RedWriter - Background Service Worker
// Handles extension lifecycle events and cross-tab messaging.

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    console.log("RedWriter installed. Happy writing on Reddit!");
  }
});

// Listen for messages from content scripts or the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_SELECTION") {
    // Forward selected text from content script to popup
    sendResponse({ text: message.text });
  }
});
