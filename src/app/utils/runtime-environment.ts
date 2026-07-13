import { environment } from '../../environments/environment';

const localHostnames = new Set(['localhost', '127.0.0.1', '::1']);

export function isLocalRuntime(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return localHostnames.has(window.location.hostname);
}

export function isImportExportAvailable(): boolean {
  return !environment.production || isLocalRuntime();
}
