import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const isPlaceholderUrl =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  supabaseUrl.includes('placeholder') ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  supabaseAnonKey === 'placeholder';

// Circuit breaker state
let isBackendReachable = !isPlaceholderUrl;
let lastTripTimestamp = 0;
const CIRCUIT_BREAKER_COOLDOWN_MS = 15000; // 15 seconds cooldown before retrying
const REQUEST_TIMEOUT_MS = 8000; // 8 seconds timeout to accommodate mobile networks

export function isSupabaseOnline(): boolean {
  if (isPlaceholderUrl) return false;
  if (!isBackendReachable) {
    // If cooldown passed, allow a probe request
    if (Date.now() - lastTripTimestamp > CIRCUIT_BREAKER_COOLDOWN_MS) {
      return true;
    }
    return false;
  }
  return true;
}

export function tripCircuitBreaker() {
  isBackendReachable = false;
  lastTripTimestamp = Date.now();
}

export function resetCircuitBreaker() {
  isBackendReachable = true;
  lastTripTimestamp = 0;
}

/**
 * Resilient custom fetch wrapper with timeout & circuit breaker
 */
async function resilientSupabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  if (!isSupabaseOnline()) {
    throw new Error('Supabase backend is currently offline or unreachable');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  const userSignal = init?.signal;
  if (userSignal) {
    userSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });

    if (response.ok || response.status < 500) {
      resetCircuitBreaker();
    }
    return response;
  } catch (error: unknown) {
    tripCircuitBreaker();
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Browser client for client-side usage with persisted session
export const supabaseBrowser = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'flowstate-supabase-auth',
  },
  global: {
    fetch: resilientSupabaseFetch,
  },
});
