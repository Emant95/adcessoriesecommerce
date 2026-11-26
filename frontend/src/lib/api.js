export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(method, url, body, opts = {}) {
  const isForm = body instanceof FormData;
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    signal: opts.signal,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data.error || {};
    throw new ApiError(res.status, err.message || `Request failed (${res.status})`, err.details);
  }
  return data;
}

export const api = {
  get: (url, opts) => request('GET', url, null, opts),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  del: (url) => request('DELETE', url),
};

export const qs = (params) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || v === false) return;
    s.set(k, Array.isArray(v) ? v.join(',') : String(v));
  });
  const str = s.toString();
  return str ? `?${str}` : '';
};
