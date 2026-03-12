document.addEventListener('DOMContentLoaded', async () => {
  // --- Load initial state from storage ---
  const stored = await chrome.storage.local.get(['adwrite_enabled', 'adwrite_text', 'adwrite_stats']);

  const enabled = stored.adwrite_enabled !== undefined ? stored.adwrite_enabled : true;
  const draftText = stored.adwrite_text || '';
  const stats = stored.adwrite_stats || { adsToday: 247, adsTotal: 14382, tracking: 3821 };

  // --- Element refs ---
  const mainToggle = document.getElementById('mainToggle');
  const powerStatus = document.querySelector('.power-status');
  const draftTextarea = document.getElementById('draftText');
  const saveTextBtn = document.getElementById('saveTextBtn');
  const saveStatus = document.getElementById('saveStatus');
  const whitelistBtn = document.getElementById('whitelistBtn');
  const whitelistInput = document.getElementById('whitelistInput');
  const advancedToggle = document.getElementById('advancedToggle');
  const advancedSection = document.getElementById('advancedSection');
  const adsTodayEl = document.getElementById('adsToday');
  const adsTotalEl = document.getElementById('adsTotal');
  const trackingEl = document.getElementById('trackingTotal');
  const filterToggles = document.querySelectorAll('.filter-toggle');

  // --- Initialize stats display ---
  if (adsTodayEl) adsTodayEl.textContent = stats.adsToday.toLocaleString();
  if (adsTotalEl) adsTotalEl.textContent = stats.adsTotal.toLocaleString();
  if (trackingEl) trackingEl.textContent = stats.tracking.toLocaleString();

  // --- Initialize main toggle ---
  mainToggle.checked = enabled;
  applyToggleState(enabled);

  // --- Initialize draft text ---
  if (draftTextarea) draftTextarea.value = draftText;

  // --- Initialize filter toggles ---
  filterToggles.forEach(async (toggle, index) => {
    const result = await chrome.storage.local.get([`filter_${index}`]);
    if (result[`filter_${index}`] !== undefined) {
      toggle.checked = result[`filter_${index}`];
    }
  });

  // --- Main toggle handler ---
  mainToggle.addEventListener('change', () => {
    const isEnabled = mainToggle.checked;
    applyToggleState(isEnabled);
    chrome.storage.local.set({ adwrite_enabled: isEnabled });
  });

  function applyToggleState(isEnabled) {
    if (isEnabled) {
      powerStatus.textContent = 'Protection is ON';
      powerStatus.classList.add('active');
      powerStatus.classList.remove('inactive');
      document.body.classList.remove('protection-off');
    } else {
      powerStatus.textContent = 'Protection is OFF';
      powerStatus.classList.add('inactive');
      powerStatus.classList.remove('active');
      document.body.classList.add('protection-off');
    }
  }

  // --- Whitelist button handler ---
  whitelistBtn.addEventListener('click', () => {
    if (whitelistInput.value.trim()) {
      const feedback = document.createElement('span');
      feedback.textContent = 'Added!';
      feedback.style.cssText = 'margin-left:8px;color:#4caf50;font-size:12px;font-weight:600;';
      whitelistBtn.insertAdjacentElement('afterend', feedback);
      setTimeout(() => feedback.remove(), 2000);
    } else {
      whitelistInput.value = 'example.com';
    }
  });

  // --- Filter toggle handlers ---
  filterToggles.forEach((toggle, index) => {
    toggle.addEventListener('change', () => {
      chrome.storage.local.set({ [`filter_${index}`]: toggle.checked });
    });
  });

  // --- Advanced section toggle ---
  advancedToggle.addEventListener('click', () => {
    advancedSection.classList.toggle('open');
    const chevron = document.getElementById('advancedChevron');
    if (chevron) chevron.classList.toggle('open');
  });

  // --- Save draft text ---
  saveTextBtn.addEventListener('click', () => {
    const value = draftTextarea.value;
    chrome.storage.local.set({ adwrite_text: value });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'UPDATE_TEXT', text: value });
      }
    });

    saveStatus.textContent = 'Saved!';
    saveStatus.style.display = 'inline';
    setTimeout(() => {
      saveStatus.style.display = 'none';
    }, 2000);
  });

  // --- Animate stats counters ---
  function scheduleStatIncrement() {
    const delay = Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000;
    setTimeout(() => {
      const todayInc = Math.floor(Math.random() * 3) + 1;  // 1–3
      const totalInc = Math.floor(Math.random() * 6) + 2;  // 2–7
      const trackInc = Math.floor(Math.random() * 3) + 1;  // 1–3

      stats.adsToday += todayInc;
      stats.adsTotal += totalInc;
      stats.tracking += trackInc;

      if (adsTodayEl) adsTodayEl.textContent = stats.adsToday.toLocaleString();
      if (adsTotalEl) adsTotalEl.textContent = stats.adsTotal.toLocaleString();
      if (trackingEl) trackingEl.textContent = stats.tracking.toLocaleString();

      chrome.storage.local.set({ adwrite_stats: stats });

      scheduleStatIncrement();
    }, delay);
  }

  scheduleStatIncrement();
});
