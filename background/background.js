// AdWrite Pro - Background Service Worker
// Handles extension lifecycle events, storage, and cross-tab messaging.

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    console.log("AdWrite Pro installed");
    chrome.storage.local.set({
      adwrite_enabled: true,
      adwrite_text: '',
      adwrite_stats: { adsToday: 247, adsTotal: 14382, tracking: 3821 },
      filter_0: true,
      filter_1: true,
      filter_2: true,
      filter_3: false
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_TEXT") {
    chrome.storage.local.get('adwrite_text', (result) => {
      sendResponse({ text: result.adwrite_text });
    });
    return true; // Keep message channel open for async response
  }

  if (message.type === "UPDATE_TEXT") {
    chrome.storage.local.set({ adwrite_text: message.text }, () => {
      sendResponse({ success: true });
    });
    return true; // Keep message channel open for async response
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-autotype") {
    chrome.tabs.query({ active: true }, (tabs) => {
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_AUTOTYPE" });
      }
    });
  }
});
