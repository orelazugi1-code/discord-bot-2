function fmtTime(ms, lang) {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (lang === 'he') {
    if (h) parts.push(`${h} שעות`);
    if (m) parts.push(`${m} דקות`);
    if (sec && !h) parts.push(`${sec} שניות`);
  } else {
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    if (sec && !h) parts.push(`${sec}s`);
  }
  return parts.join(' ') || (lang === 'he' ? '0 שניות' : '0s');
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = { fmtTime, rand, pick };
