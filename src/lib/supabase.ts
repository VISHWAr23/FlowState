import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

const isPlaceholderUrl =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  supabaseUrl.includes('placeholder') ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  supabaseAnonKey === 'placeholder';

// Circuit breaker state
let isBackendReachable = !isPlaceholderUrl;
let lastTripTimestamp = 0;
const CIRCUIT_BREAKER_COOLDOWN_MS = 30000; // 30 seconds cooldown before retrying
const REQUEST_TIMEOUT_MS = 2000; // Max 2 seconds per Supabase request to prevent UI blocking

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
 * Resilient, fast custom fetch wrapper with timeout & circuit breaker
 * Eliminates multi-second hangs on dead or offline Supabase endpoints.
 */
async function resilientSupabaseFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // If circuit breaker is tripped, fail instantly (0ms) rather than waiting for TCP/DNS timeouts
  if (!isSupabaseOnline()) {
    throw new Error('Supabase backend is currently offline or unreachable');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  // Combine user signal with timeout signal if provided
  const userSignal = init?.signal;
  if (userSignal) {
    userSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });

    // Successfully responded
    resetCircuitBreaker();
    return response;
  } catch (error: any) {
    // Check if network failed, aborted, or connection refused
    tripCircuitBreaker();
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Browser client for client-side usage with resilient timeout
export const supabaseBrowser = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    fetch: resilientSupabaseFetch,
  },
});
