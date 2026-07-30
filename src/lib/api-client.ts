import { clientConfig } from './client-config';

export function apiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (clientConfig.apiSecretKey) {
    headers['x-api-key'] = clientConfig.apiSecretKey;
  }
  return headers;
}

export function jsonHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...apiHeaders(),
  };
}
