export function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  if (isNaN(diffMs) || diffMs < 0) {
    return 'agora mesmo';
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return 'agora mesmo';
  }

  if (diffHours < 1) {
    return `ha ${diffMinutes}min`;
  }

  if (diffDays < 1) {
    return `ha ${diffHours}h`;
  }

  return `ha ${diffDays} dias`;
}
