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
  const pendingResolverRef = useRef<{
    resolve: (token: string) => void;
    reject: (err: Error) => void;
  } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Expose imperative methods
  useImperativeHandle(ref, () => ({
    getToken: () => {
      if (tokenRef.current && Date.now() < tokenExpiryRef.current) {
        const token = tokenRef.current;
        tokenRef.current = null;
        tokenExpiryRef.current = 0;
        return token;
      }
      return null;
    },
    reset: () => {
      if (widgetIdRef.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.reset(widgetIdRef.current);
        } catch {
          // ignore
        }
      }
      tokenRef.current = null;
      tokenExpiryRef.current = 0;
      if (pendingResolverRef.current) {
        pendingResolverRef.current.reject(new Error("Turnstile was reset"));
        pendingResolverRef.current = null;
      }
    },
    execute: async (customAction?: string): Promise<string> => {
      // 1. If we already have a valid token from automatic render execution:
      if (tokenRef.current && Date.now() < tokenExpiryRef.current) {
        const token = tokenRef.current;
        tokenRef.current = null;
        tokenExpiryRef.current = 0;
        return token;
      }

      // 2. Check getResponse if available on widget
      if (widgetIdRef.current && (window as any).turnstile?.getResponse) {
        try {
          const existing = (window as any).turnstile.getResponse(widgetIdRef.current);
          if (existing) {
            tokenRef.current = null;
            tokenExpiryRef.current = 0;
            return existing;
          }
        } catch {
          // ignore
        }
      }

      // 3. Wait briefly if widget is still initializing
      if (!widgetIdRef.current || !(window as any).turnstile) {
        await new Promise<void>((resolve, reject) => {
          const start = Date.now();
          const timer = setInterval(() => {
            if (widgetIdRef.current && (window as any).turnstile) {
              clearInterval(timer);
              resolve();
            } else if (Date.now() - start > 4000) {
              clearInterval(timer);
              reject(new Error("Turnstile not initialized"));
            }
          }, 100);
        });
      }

      // 4. Trigger execute and return a Promise resolving on callback
      return new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (pendingResolverRef.current) {
            pendingResolverRef.current = null;
            reject(new Error("Security check timed out. Please try again."));
          }
        }, 15000);

        pendingResolverRef.current = {
          resolve: (t) => {
            clearTimeout(timeout);
            // Clear tokenRef upon consumption so it can never be sent twice
            tokenRef.current = null;
            tokenExpiryRef.current = 0;
            resolve(t);
          },
          reject: (err) => {
            clearTimeout(timeout);
            reject(err);
          },
        };

        try {
          (window as any).turnstile.execute(widgetIdRef.current, customAction ?? action);
        } catch (err) {
          clearTimeout(timeout);
          pendingResolverRef.current = null;
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      });
    },
    remove: () => {
      if (widgetIdRef.current && (window as any).turnstile) {
        (window as any).turnstile.remove(widgetIdRef.current);
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
    if (!containerRef.current || !(window as any).turnstile || widgetIdRef.current) return;

    try {
      widgetIdRef.current = (window as any).turnstile.render(containerRef.current, {
        sitekey: siteKey!,
        theme,
        action,
        "tab-index": tabIndex,
        callback: (token: string) => {
          tokenRef.current = token;
          tokenExpiryRef.current = Date.now() + tokenTimeoutMs;
          onTokenReady?.(token);
          if (pendingResolverRef.current) {
            pendingResolverRef.current.resolve(token);
            pendingResolverRef.current = null;
          }
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
          if (pendingResolverRef.current) {
            pendingResolverRef.current.reject(error instanceof Error ? error : new Error(String(error || "CAPTCHA verification failed")));
            pendingResolverRef.current = null;
          }
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
      if (widgetIdRef.current && (window as any).turnstile) {
        (window as any).turnstile.remove(widgetIdRef.current);
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
      className="flex justify-center my-1"
    />
  );
});

Turnstile.displayName = "Turnstile";

export default Turnstile;