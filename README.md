# RedWriter Extension

A Chrome extension that acts as a writing assistant for Reddit.

## Features

- **Draft editor** – write and save Reddit posts or comments directly in the extension popup.
- **Word count** – optional live word count as you type.
- **Clipboard copy** – one-click copy of your draft to the clipboard.
- **Persistent storage** – your draft is saved automatically with `chrome.storage.local` so it survives browser restarts.
- **Quick selection capture** – on any Reddit page, select text and press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> (<kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> on Mac) to send it to the background worker (hook point for future features).

## Project structure

```
redwriter-extension/
├── manifest.json          # Extension manifest (Manifest V3)
├── popup/
│   ├── popup.html         # Popup UI
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup logic
├── background/
│   └── background.js      # Service worker
├── content/
│   └── content.js         # Content script (runs on reddit.com)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Getting started

### Load the extension in Chrome

1. Open **chrome://extensions** in Chrome.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this repository folder.
4. The RedWriter icon will appear in your toolbar.

### Development workflow

No build step is required – all source files are plain HTML, CSS, and JavaScript.

After editing any file, click the **reload** button (↺) next to the extension in `chrome://extensions` to pick up your changes.

## Permissions

| Permission    | Reason |
|---------------|--------|
| `storage`     | Persist the user's draft across sessions |
| `activeTab`   | Reserved for future features that inspect the current tab |