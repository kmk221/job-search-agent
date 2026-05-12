export function formatTimeAgo(isoString) {
  if (!isoString) return '';
  const ms = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

export function isNewJob(fetchedAt) {
  if (!fetchedAt) return false;
  return Date.now() - new Date(fetchedAt).getTime() < 24 * 60 * 60 * 1000;
}

export function isStaleRefresh(scannedAt) {
  if (!scannedAt) return false;
  return Date.now() - new Date(scannedAt).getTime() > 24 * 60 * 60 * 1000;
}
