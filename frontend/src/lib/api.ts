import { useAuthStore } from '../store/authStore';

export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL.includes('localhost')) {
      const host = window.location.hostname;
      if (host && host !== 'localhost' && host !== '127.0.0.1' && !host.endsWith('.vercel.app')) {
        return `${window.location.protocol}//${host}:5001/api`;
      }
    }
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host && host !== 'localhost' && host !== '127.0.0.1' && !host.endsWith('.vercel.app')) {
      return `${window.location.protocol}//${host}:5001/api`;
    }
  }
  return 'http://localhost:5001/api';
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiFetch(endpoint: string, options: FetchOptions = {}) {
  const { skipAuth, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers || {});

  // Add JSON content type by default unless uploading files (which browser handles with boundary)
  if (!(fetchOptions.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Bind Authorization header if available
  if (!skipAuth) {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const baseUrl = getApiBaseUrl();

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  // Handle automatic refresh token on 401 Unauthorized
  if (response.status === 401 && !skipAuth) {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: refreshToken }),
        });

        if (refreshResponse.ok) {
          const credentials = await refreshResponse.json();
          // Save new credentials
          const currentUser = useAuthStore.getState().user;
          if (currentUser) {
            useAuthStore.getState().setAuth(currentUser, credentials.accessToken, credentials.refreshToken);
          }

          // Retry original request with new token
          headers.set('Authorization', `Bearer ${credentials.accessToken}`);
          const retryResponse = await fetch(`${baseUrl}${endpoint}`, {
            ...fetchOptions,
            headers,
          });
          return retryResponse;
        } else {
          // Refresh failed - log out
          useAuthStore.getState().logout();
        }
      } catch (err) {
        console.error('Failed to rotate refresh token:', err);
        useAuthStore.getState().logout();
      }
    }
  }

  return response;
}
