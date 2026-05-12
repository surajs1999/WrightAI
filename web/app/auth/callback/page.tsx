"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

/**
 * Handles OAuth callback by extracting authorization code and state from URL parameters, then redirects to the API callback endpoint or login page with an error.
 *
 * This React component processes OAuth authentication callbacks by reading the 'code' and 'state' query parameters from the URL. If a code is present, it constructs a redirect URI and forwards the user to the API authentication endpoint with the necessary parameters. If no code is found, it redirects to the login page with an error indicator. The component displays a loading message while processing the redirect.
 * @returns {JSX.Element} A React element displaying a centered loading message with 'Completing sign-in...' text.
 * @example
 * <CallbackContent />
 */
function CallbackContent() {
  const params = useSearchParams();

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state") ?? "/dashboard";
    if (code) {
      const redirectUri = `${window.location.origin}/auth/callback`;
      window.location.href = `/api/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    } else {
      window.location.href = "/login?error=missing_code";
    }
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontSize: 14 }}>
        Completing sign-in...
      </div>
    </div>
  );
}

/**
 * Renders the authentication callback page component wrapped in a Suspense boundary.
 *
 * This component serves as the main page component for the authentication callback route, providing a Suspense boundary to handle asynchronous loading states of the CallbackContent component.
 * @returns {JSX.Element} A React element containing the CallbackContent component wrapped in a Suspense boundary.
 * @example
 * <AuthCallbackPage />
 */
export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackContent />
    </Suspense>
  );
}
