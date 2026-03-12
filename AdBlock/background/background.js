// Background Service Worker
// Handles extension lifecycle, storage, cross-tab messaging, and CDP for Google Docs.

// Track which tabs have the debugger attached
const attachedTabs = new Set();

// --- On install: set defaults ---
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.storage.local.set({
      adwrite_enabled: true,
      adwrite_text: '',
      adwrite_stats: { adsToday: 0, adsTotal: 0 },
      filter_0: true,
      filter_1: true,
      filter_2: true,
      filter_3: false,
    });
  }
});

// --- Attach debugger to a tab (idempotent) ---
async function ensureAttached(tabId) {
  if (attachedTabs.has(tabId)) return;
  try {
    await chrome.debugger.attach({ tabId }, '1.3');
    attachedTabs.add(tabId);
  } catch (e) {
    // Already attached or tab is gone — not an error we need to surface
    if (e.message && e.message.includes('already attached')) {
      attachedTabs.add(tabId);
    } else {
      console.warn('debugger attach failed', e.message);
    }
  }
}

// --- Detach debugger from a tab ---
async function ensureDetached(tabId) {
  if (!attachedTabs.has(tabId)) return;
  try {
    await chrome.debugger.detach({ tabId });
  } catch (_) {
    // Tab may already be gone
  }
  attachedTabs.delete(tabId);
}

// --- Clean up when a tab closes ---
chrome.tabs.onRemoved.addListener((tabId) => {
  attachedTabs.delete(tabId);
});

// --- Clean up if user manually closes the debugger ---
chrome.debugger.onDetach.addListener(({ tabId }) => {
  if (tabId !== undefined) attachedTabs.delete(tabId);
});

// --- Message handler ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab ? sender.tab.id : null;

  // Popup saving text
  if (message.type === 'GET_TEXT') {
    chrome.storage.local.get('adwrite_text', (result) => {
      sendResponse({ text: result.adwrite_text });
    });
    return true;
  }

  if (message.type === 'UPDATE_TEXT') {
    chrome.storage.local.set({ adwrite_text: message.text }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  // Content script on Google Docs requests a character insertion via CDP
  if (message.type === 'CDP_INSERT_CHAR' && tabId) {
    ensureAttached(tabId).then(() => {
      chrome.debugger.sendCommand(
        { tabId },
        'Input.insertText',
        { text: message.char },
        () => {
          if (chrome.runtime.lastError) {
            console.warn('CDP insertText failed', chrome.runtime.lastError.message);
          }
        }
      );
    });
    return false;
  }

  // Content script signals auto-type mode was turned off — detach debugger
  if (message.type === 'CDP_DETACH' && tabId) {
    ensureDetached(tabId);
    return false;
  }
});

// --- Commands (keyboard shortcuts via manifest) ---
chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    for (const tab of tabs) {
      if (command === 'toggle-autotype') {
        chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_AUTOTYPE' });
      } else if (command === 'cancel-autotype') {
        chrome.tabs.sendMessage(tab.id, { type: 'CANCEL_AUTOTYPE' });
      } else if (command === 'word-autotype') {
        chrome.tabs.sendMessage(tab.id, { type: 'WORD_AUTOTYPE' });
      }
    }
  });
});
