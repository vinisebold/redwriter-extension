// RedWriter - Content Script
// Runs on Reddit pages and enables interaction between the page and the extension.

(function () {
  "use strict";

  // Send selected text to the background service worker when the user
  // presses Ctrl+Shift+R (or Cmd+Shift+R on Mac) so it can be opened
  // in the RedWriter popup.
  document.addEventListener("keydown", (event) => {
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    const modifier = isMac ? event.metaKey : event.ctrlKey;

    if (modifier && event.shiftKey && event.key === "R") {
      const selectedText = window.getSelection()?.toString().trim();
      if (selectedText) {
        chrome.runtime.sendMessage({ type: "GET_SELECTION", text: selectedText });
      }
    }
  });
})();
