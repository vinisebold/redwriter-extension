(function () {
  'use strict';

  let autoTypeActive = false;
  let draftText = '';
  let isTyping = false;
  let typingIndex = 0;
  let featureEnabled = true;

  // --- Storage init ---
  chrome.storage.local.get(['adwrite_text', 'adwrite_enabled'], (result) => {
    if (result.adwrite_text !== undefined) {
      draftText = result.adwrite_text;
    }
    if (result.adwrite_enabled === false) {
      featureEnabled = false;
    }
  });

  // --- Toast helper ---
  function showToast(message, duration = 2000) {
    const toast = document.createElement('div');
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: '#cc2222',
      color: 'white',
      padding: '10px 16px',
      borderRadius: '6px',
      fontSize: '13px',
      fontFamily: 'sans-serif',
      zIndex: '999999',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      pointerEvents: 'none',
    });
    document.body.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, duration);
  }

  // --- Stop any active typing session ---
  function stopTyping() {
    isTyping = false;
    typingIndex = 0;
  }

  // --- Toggle autoTypeActive and show indicator ---
  function toggleAutoType() {
    autoTypeActive = !autoTypeActive;
    if (!autoTypeActive) {
      stopTyping();
      showToast('AdWrite Pro: Auto-type OFF');
    } else {
      showToast('AdWrite Pro: Auto-type ON');
    }
  }

  // --- Message listener ---
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'UPDATE_TEXT') {
      draftText = message.text;
      isTyping = false;
      typingIndex = 0;
    } else if (message.type === 'TOGGLE_AUTOTYPE') {
      toggleAutoType();
    }
  });

  // --- Alt+R keyboard shortcut ---
  document.addEventListener('keydown', (event) => {
    if (!featureEnabled) return;
    if (event.altKey && (event.key === 'r' || event.key === 'R')) {
      toggleAutoType();
    }
  });

  // --- Input element selector ---
  const INPUT_SELECTOR = [
    'input[type="text"]',
    'input[type="search"]',
    'input[type="email"]',
    'input:not([type])',
    'textarea',
    '[contenteditable]',
  ].join(', ');

  function matchesInputSelector(el) {
    if (!el || typeof el.matches !== 'function') return false;
    return el.matches(INPUT_SELECTOR);
  }

  // --- Auto-type logic ---
  function startTyping(element) {
    if (isTyping) return;

    if (!draftText) {
      showToast('AdWrite Pro: No text saved! Open extension to set text.');
      return;
    }

    autoTypeActive = false;
    isTyping = true;
    typingIndex = 0;

    const isContentEditable =
      element.hasAttribute('contenteditable') &&
      element.getAttribute('contenteditable') !== 'false';

    // Clear current content
    if (isContentEditable) {
      element.textContent = '';
    } else {
      element.value = '';
    }

    showToast('AdWrite Pro: Typing...', 2000);

    const interval = setInterval(() => {
      if (!isTyping) {
        clearInterval(interval);
        return;
      }

      if (typingIndex >= draftText.length) {
        clearInterval(interval);
        isTyping = false;
        typingIndex = 0;
        showToast('AdWrite Pro: Done!', 1500);
        return;
      }

      const char = draftText[typingIndex];
      typingIndex++;

      if (isContentEditable) {
        element.textContent += char;
        element.dispatchEvent(
          new InputEvent('input', {
            bubbles: true,
            data: char,
            inputType: 'insertText',
          })
        );
      } else {
        element.value += char;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, 40);
  }

  // --- Event delegation for focus/click ---
  function handleActivation(event) {
    if (!featureEnabled || !autoTypeActive) return;
    if (!matchesInputSelector(event.target)) return;
    startTyping(event.target);
  }

  document.addEventListener('focus', handleActivation, true);
  document.addEventListener('click', handleActivation, true);
})();
