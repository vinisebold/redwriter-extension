const STORAGE_KEY = "redwriter_draft";

const draftTextarea = document.getElementById("draft");
const wordCountDisplay = document.getElementById("wordCountDisplay");
const wordCountCheckbox = document.getElementById("wordcount");
const clearBtn = document.getElementById("clearBtn");
const copyBtn = document.getElementById("copyBtn");

// Load saved draft from storage
chrome.storage.local.get(STORAGE_KEY, (result) => {
  if (result[STORAGE_KEY]) {
    draftTextarea.value = result[STORAGE_KEY];
    updateWordCount(result[STORAGE_KEY]);
  }
});

// Save draft and update word count on input
draftTextarea.addEventListener("input", () => {
  const text = draftTextarea.value;
  chrome.storage.local.set({ [STORAGE_KEY]: text });
  updateWordCount(text);
});

// Toggle spell check on the textarea
document.getElementById("spellcheck").addEventListener("change", (event) => {
  draftTextarea.spellcheck = event.target.checked;
});

// Toggle word count visibility
wordCountCheckbox.addEventListener("change", () => {
  wordCountDisplay.style.display = wordCountCheckbox.checked ? "block" : "none";
});

// Clear the draft
clearBtn.addEventListener("click", () => {
  draftTextarea.value = "";
  chrome.storage.local.remove(STORAGE_KEY);
  updateWordCount("");
});

// Copy draft to clipboard
copyBtn.addEventListener("click", () => {
  const text = draftTextarea.value;
  if (!text.trim()) return;

  navigator.clipboard.writeText(text).then(() => {
    const originalLabel = copyBtn.textContent;
    copyBtn.textContent = "Copied!";
    setTimeout(() => {
      copyBtn.textContent = originalLabel;
    }, 1500);
  });
});

/**
 * Updates the word count display.
 * @param {string} text
 */
function updateWordCount(text) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  wordCountDisplay.textContent = `${words} word${words !== 1 ? "s" : ""}`;
}
