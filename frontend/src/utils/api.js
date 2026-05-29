const rawBase = import.meta.env.VITE_API_BASE_URL || "";
const API_BASE = rawBase.replace(/\/+$/, "");

export function buildApiUrl(path) {
  if (!API_BASE || path.startsWith("http")) {
    return path;
  }

  return `${API_BASE}${path}`;
}

export function apiFetch(path, options = {}) {
  const credentials =
    options.credentials ?? (API_BASE ? "include" : "same-origin");

  return fetch(buildApiUrl(path), {
    ...options,
    credentials,
    headers: {
      ...(options.headers || {}),
    },
  });
}
