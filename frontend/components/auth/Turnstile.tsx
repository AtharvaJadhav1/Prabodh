"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

interface TurnstileProps {
  /** Action name for analytics (e.g., 'login', 'register', 'forgot_password') */
  action?: string;
  /** Callback when token is ready */
  onTokenReady?: (token: string) => void;
  /** Callback when token expires */
  onTokenExpired?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Theme for the widget (not visible in invisible mode) */
  theme?: "light" | "dark" | "auto";
  /** Custom tab index */
  tabIndex?: number;
  /** Timeout in milliseconds before considering token expired */
  tokenTimeoutMs?: number;
}

interface TurnstileInstance {
  getToken: () => string | null;
  reset: () => void;
  execute: (action?: string) => Promise<string>;
  remove: () => void;
}

declare global {
  interface Window {
    turnstile: {
      render: (container: HTMLElement, options: {
        sitekey: string;
        mode?: "managed" | "invisible";
        theme?: "light" | "dark" | "auto";
        action?: string;
        callback?: (token: string) => void;
        "expired-callback"?: () => void;
        "error-callback"?: (error: Error) => void;
        "timeout-callback"?: () => void;
        "tab-index"?: number;
        "retry"?: "auto" | "never";
        "retry-interval"?: number;
        "size"?: "normal" | "compact";
        "language"?: "auto" | string;
      }) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      execute: (widgetId: string, action?: string) => Promise<string>;
      ready: (callback: () => void) => void;
    };
  }
}

/**
 * Invisible Cloudflare Turnstile CAPTCHA component.
 * 
 * Usage:
 * ```tsx
 * const turnstileRef = useRef<TurnstileInstance>(null);
 * 
 * async function handleSubmit() {
 *   const token = await turnstileRef.current?.execute('login');
 *   if (!token) throw new Error('CAPTCHA not ready');
 *   await apiPost('/auth/login', { email, password, captchaToken: token });
 * }
 * 
 * return <Turnstile ref={turnstileRef} action="login" />;
 * ```
 */
export const Turnstile = forwardRef<TurnstileInstance, TurnstileProps>(
  ({
    action = "default",
    onTokenReady,
    onTokenExpired,
    onError,
    theme = "auto",
    tabIndex = 0,
    tokenTimeoutMs = 120_000, // Turnstile tokens expire after ~2 minutes
  },
  ref,
) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const tokenExpiryRef = useRef<number>(0);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Expose imperative methods
  useImperativeHandle(ref, () => ({
    getToken: () => {
      if (tokenRef.current && Date.now() < tokenExpiryRef.current) {
        return tokenRef.current;
      }
      return null;
    },
    reset: () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
      tokenRef.current = null;
      tokenExpiryRef.current = 0;
    },
    execute: async (customAction?: string) => {
      if (!widgetIdRef.current || !window.turnstile) {
        throw new Error("Turnstile not initialized");
      }
      try {
        const token = await window.turnstile.execute(widgetIdRef.current, customAction ?? action);
        tokenRef.current = token;
        tokenExpiryRef.current = Date.now() + tokenTimeoutMs;
        onTokenReady?.(token);
        return token;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        onError?.(error);
        throw error;
      }
    },
    remove: () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    },
  }));

  // Load Turnstile script
  useEffect(() => {
    if (!siteKey) {
      const error = new Error("NEXT_PUBLIC_TURNSTILE_SITE_KEY not configured");
      setLoadError(error);
      onError?.(error);
      return;
    }

    if (typeof window === "undefined") return;

    // Check if already loaded
    if (window.turnstile) {
      initWidget();
      return;
    }

    // Wait for turnstile to be ready
    const handleReady = () => {
      initWidget();
    };

    (window as any).turnstile?.ready?.(handleReady);

    // Also listen for script load
    const script = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]');
    if (script) {
      script.addEventListener("load", handleReady);
      return () => script.removeEventListener("load", handleReady);
    }

    return () => {
      (window as any).turnstile?.ready?.(handleReady);
    };
  }, [siteKey, action, theme, tabIndex]);

  const initWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey!,
        mode: "invisible",
        theme,
        action,
        "tab-index": tabIndex,
        callback: (token: string) => {
          tokenRef.current = token;
          tokenExpiryRef.current = Date.now() + tokenTimeoutMs;
          onTokenReady?.(token);
        },
        "expired-callback": () => {
          tokenRef.current = null;
          tokenExpiryRef.current = 0;
          onTokenExpired?.();
        },
        "error-callback": (error: Error) => {
          tokenRef.current = null;
          tokenExpiryRef.current = 0;
          onError?.(error);
        },
        "timeout-callback": () => {
          tokenRef.current = null;
          tokenExpiryRef.current = 0;
          onTokenExpired?.();
        },
        retry: "auto",
        "retry-interval": 8000,
      });
      setIsReady(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setLoadError(error);
      onError?.(error);
    }
  }, [siteKey, action, theme, tabIndex, tokenTimeoutMs, onTokenReady, onTokenExpired, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  if (loadError) {
    return (
      <div
        ref={containerRef}
        className="text-xs text-red-600 dark:text-red-400"
        role="alert"
      >
        CAPTCHA failed to load. Please refresh the page.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ display: "none" }}
      aria-hidden="true"
    />
  );
});

Turnstile.displayName = "Turnstile";

export default Turnstile;