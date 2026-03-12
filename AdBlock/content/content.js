(function () {
  'use strict';

  let autoTypeActive = false;
  let draftText = '';
  let typingIndex = 0;
  let featureEnabled = true;

  // Detect Google Docs early — needs CDP path via background
  const isGoogleDocs = window.location.hostname === 'docs.google.com';

  // --- Storage init ---
  chrome.storage.local.get(['adwrite_text', 'adwrite_enabled'], (result) => {
    if (result.adwrite_text) {
      draftText = result.adwrite_text;
    }
    if (result.adwrite_enabled === false) {
      featureEnabled = false;
    }
  });

  // --- Toast helper ---
  let activeToast = null;
  function showToast(message, duration) {
    duration = duration || 2000;
    if (activeToast && activeToast.parentNode) {
      activeToast.parentNode.removeChild(activeToast);
    }
    const toast = document.createElement('div');
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '14px',
      right: '16px',
      background: 'transparent',
      color: 'rgba(120,120,120,0.75)',
      padding: '0',
      borderRadius: '0',
      fontSize: '11px',
      fontFamily: 'monospace',
      zIndex: '2147483647',
      boxShadow: 'none',
      pointerEvents: 'none',
      letterSpacing: '0.03em',
    });
    document.body.appendChild(toast);
    activeToast = toast;
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
      if (activeToast === toast) activeToast = null;
    }, duration);
  }

  // --- Activate / pause / cancel ---
  function activate() {
    if (!draftText) {
      showToast('aw: no text');
      return;
    }
    autoTypeActive = true;
    const remaining = draftText.length - typingIndex;
    showToast('aw: on [' + remaining + ']');
  }

  function pause() {
    autoTypeActive = false;
    const remaining = draftText.length - typingIndex;
    showToast('aw: pause [' + remaining + ']', 1500);
  }

  function cancel() {
    autoTypeActive = false;
    typingIndex = 0;
    if (isGoogleDocs) {
      chrome.runtime.sendMessage({ type: 'CDP_DETACH' });
    }
    showToast('aw: cancelled', 1200);
  }

  function finish() {
    autoTypeActive = false;
    typingIndex = 0;
    if (isGoogleDocs) {
      chrome.runtime.sendMessage({ type: 'CDP_DETACH' });
    }
    showToast('aw: done', 1500);
  }

  // --- Message listener (from background / popup) ---
  chrome.runtime.onMessage.addListener(function (message) {
    if (message.type === 'UPDATE_TEXT') {
      draftText = message.text;
      typingIndex = 0;
      autoTypeActive = false;
    } else if (message.type === 'TOGGLE_AUTOTYPE') {
      if (autoTypeActive) {
        pause();
      } else {
        activate();
      }
    } else if (message.type === 'CANCEL_AUTOTYPE') {
      cancel();
    } else if (message.type === 'WORD_AUTOTYPE') {
      if (!draftText) {
        showToast('aw: no text');
        return;
      }
      typeNextWord();
    }
  });

  // --- Check if focused element accepts keyboard input ---
  function isTypableElement(el) {
    if (!el) return false;
    const tag = el.tagName;
    if (tag === 'TEXTAREA') return true;
    if (tag === 'INPUT') {
      const type = (el.type || 'text').toLowerCase();
      return ['text', 'search', 'email', 'url', 'tel', 'number', 'password', ''].indexOf(type) !== -1;
    }
    if (el.isContentEditable) return true;
    return false;
  }

  // --- Insert text into the currently focused element ---
  function insertText(text) {
    if (isGoogleDocs) {
      // Send char-by-char for Google Docs via CDP
      // (CDP_INSERT_CHAR accepts multi-char strings too via Input.insertText)
      chrome.runtime.sendMessage({ type: 'CDP_INSERT_CHAR', char: text });
      return;
    }

    const el = document.activeElement;

    // Modern approach: use DataTransfer + insertFromPaste for contenteditable
    if (el && el.isContentEditable) {
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      el.dispatchEvent(new InputEvent('beforeinput', {
        bubbles: true, cancelable: true,
        inputType: 'insertText', data: text
      }));
      el.dispatchEvent(new InputEvent('input', {
        bubbles: true, inputType: 'insertText', data: text
      }));
      // Fall back to selection-based insertion for contenteditable
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      return;
    }

    // For <input> and <textarea>: splice directly
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const before = el.value.substring(0, start);
      const after = el.value.substring(end);
      el.value = before + text + after;
      el.selectionStart = el.selectionEnd = start + text.length;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    // Last-resort fallback (deprecated but still works in some browsers)
    document.execCommand('insertText', false, text); // eslint-disable-line no-restricted-globals
  }

  // --- Advance one character ---
  function typeNextChar() {
    if (typingIndex >= draftText.length) {
      finish();
      return;
    }
    const char = draftText[typingIndex];
    typingIndex++;
    insertText(char);

    // Show progress every 10 chars
    if (typingIndex % 10 === 0) {
      const remaining = draftText.length - typingIndex;
      showToast('aw: ' + remaining, 1200);
    }

    if (typingIndex >= draftText.length) {
      finish();
    }
  }

  // --- Advance one word (up to and including the trailing space/punctuation) ---
  function typeNextWord() {
    if (typingIndex >= draftText.length) {
      finish();
      return;
    }

    // Find the end of the current word: advance until we hit whitespace,
    // then consume all the whitespace after it too (so cursor lands at
    // the start of the next word, matching normal word-by-word paste behaviour).
    let end = typingIndex;

    // Skip any leading whitespace at current position first
    while (end < draftText.length && /\s/.test(draftText[end])) {
      end++;
    }
    // Now consume the word characters
    while (end < draftText.length && !/\s/.test(draftText[end])) {
      end++;
    }
    // Consume the trailing whitespace so next call starts clean
    while (end < draftText.length && /\s/.test(draftText[end])) {
      end++;
    }

    const word = draftText.slice(typingIndex, end);
    typingIndex = end;
    insertText(word);

    const remaining = draftText.length - typingIndex;
    if (remaining === 0) {
      finish();
    } else {
      showToast('aw: ' + remaining, 1200);
    }
  }

  // --- Main keydown interceptor ---
  // Runs in capture phase so it fires before the page's own listeners.
  document.addEventListener('keydown', function (event) {
    if (!featureEnabled) return;

    const alt = event.altKey;
    const key = event.key;

    // ── Alt+R: toggle start / pause ──────────────────────────────────────
    if (alt && (key === 'r' || key === 'R')) {
      event.preventDefault();
      event.stopPropagation();
      if (autoTypeActive) {
        pause();
      } else {
        activate();
      }
      return;
    }

    // ── Alt+Q: cancel and reset ───────────────────────────────────────────
    if (alt && (key === 'q' || key === 'Q')) {
      event.preventDefault();
      event.stopPropagation();
      cancel();
      return;
    }

    // ── Alt+O: insert next word ───────────────────────────────────────────
    if (alt && (key === 'o' || key === 'O')) {
      event.preventDefault();
      event.stopPropagation();
      if (!draftText) {
        showToast('aw: no text');
        return;
      }
      // Alt+O works regardless of autoTypeActive state
      // (useful for manual word-by-word control even when char mode is off)
      typeNextWord();
      return;
    }

    // ── Esc: pause if active ──────────────────────────────────────────────
    if (key === 'Escape' && autoTypeActive) {
      // Don't preventDefault on Escape — let the page handle it too
      pause();
      return;
    }

    if (!autoTypeActive) return;

    // Only intercept when focus is on a typable element
    // (or on Google Docs which manages focus internally)
    const active = document.activeElement;
    if (!isGoogleDocs && !isTypableElement(active)) return;

    // Let Ctrl/Meta combos pass through (Ctrl+C, Ctrl+Z, etc.)
    if (event.ctrlKey || event.metaKey) return;

    // Skip non-printable keys
    const skip = [
      'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End', 'PageUp', 'PageDown',
      'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
      'Insert', 'Delete', 'Backspace',
      'ContextMenu', 'PrintScreen', 'ScrollLock', 'Pause', 'NumLock',
    ];
    if (skip.indexOf(key) !== -1) return;

    // Suppress the real keystroke and substitute the next draft character
    event.preventDefault();
    event.stopPropagation();

    typeNextChar();
  }, true); // capture = true → runs before page handlers

})();
