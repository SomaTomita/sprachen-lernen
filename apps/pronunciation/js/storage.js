const KEY = 'deutsch-aussprache-v1';
function defaults() { return { rate: 1, showMeaning: false }; }

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    return { ...defaults(), ...JSON.parse(raw) };
  } catch { return defaults(); }
}

export function saveSettings(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
