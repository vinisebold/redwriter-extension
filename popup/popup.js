document.addEventListener('DOMContentLoaded', async () => {
  const defaults = {
    adwrite_enabled: true,
    adwrite_text: '',
    adwrite_stats: { adsToday: 0, adsTotal: 13 }
  };

  const stored = await chrome.storage.local.get([
    'adwrite_enabled',
    'adwrite_text',
    'adwrite_stats'
  ]);

  const state = {
    enabled: stored.adwrite_enabled !== undefined ? stored.adwrite_enabled : defaults.adwrite_enabled,
    text: stored.adwrite_text || defaults.adwrite_text,
    stats: stored.adwrite_stats || defaults.adwrite_stats,
  };

  const mainToggle = document.getElementById('mainToggle');
  const powerStatus = document.querySelector('.pause-label');
  const adsTodayEl = document.querySelector('.left-stat .stat-number');
  const adsTotalEl = document.querySelector('.right-stat .stat-number');
  const advancedToggle = document.getElementById('advancedToggle');
  const advancedSection = document.getElementById('advancedSection');
  const draftText = document.getElementById('draftText');
  const saveTextBtn = document.getElementById('saveTextBtn');
  const saveStatus = document.getElementById('saveStatus');

  if (draftText) {
    draftText.value = state.text;
  }

  if (adsTodayEl) {
    adsTodayEl.textContent = formatNumber(state.stats.adsToday);
  }

  if (adsTotalEl) {
    adsTotalEl.textContent = formatNumber(state.stats.adsTotal);
  }

  applyPauseState(state.enabled);

  mainToggle.addEventListener('click', async () => {
    state.enabled = !state.enabled;
    applyPauseState(state.enabled);
    await chrome.storage.local.set({ adwrite_enabled: state.enabled });
  });

  advancedToggle.addEventListener('click', () => {
    const open = advancedSection.classList.toggle('open');
  });

  saveTextBtn.addEventListener('click', async () => {
    const value = draftText.value;
    await chrome.storage.local.set({ adwrite_text: value });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs.length) return;
      chrome.tabs.sendMessage(tabs[0].id, { type: 'UPDATE_TEXT', text: value });
    });

    saveStatus.textContent = 'Saved';
    setTimeout(() => {
      saveStatus.textContent = '';
    }, 1600);
  });

  scheduleStatIncrement(state, adsTodayEl, adsTotalEl);

  function applyPauseState(enabled) {
    document.body.classList.toggle('protection-off', !enabled);
    if (powerStatus) {
      powerStatus.textContent = enabled ? 'Pause on this site' : 'Resume on this site';
    }
  }
});

function scheduleStatIncrement(state, adsTodayEl, adsTotalEl) {
  const tick = () => {
    const delay = Math.floor(Math.random() * 5000) + 3000;
    setTimeout(async () => {
      state.stats.adsToday += Math.floor(Math.random() * 2) + 1;
      state.stats.adsTotal += Math.floor(Math.random() * 5) + 1;

      if (adsTodayEl) {
        adsTodayEl.textContent = formatNumber(state.stats.adsToday);
      }

      if (adsTotalEl) {
        adsTotalEl.textContent = formatNumber(state.stats.adsTotal);
      }

      await chrome.storage.local.set({ adwrite_stats: state.stats });
      tick();
    }, delay);
  };

  tick();
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US');
}
