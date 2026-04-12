const API = process.env.NEXT_PUBLIC_API_URL || 'https://squarespell-api.onrender.com';

let started = false;

export function startKeepAlive() {
  if (started) return;
  started = true;
  const ping = () => fetch(`${API}/api/health`).catch(() => {});
  ping();
  setInterval(ping, 10 * 60 * 1000);
}
