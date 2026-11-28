const TOKEN_KEY = 'chinebadam_token';

export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function removeToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}
