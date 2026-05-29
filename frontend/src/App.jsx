import { useEffect, useState } from "react";
import AuthPanel from "./components/AuthPanel";
import Dashboard from "./components/Dashboard";
import { apiFetch } from "./utils/api";

export default function App() {
  const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [shortenUrl, setShortenUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [shortenError, setShortenError] = useState("");
  const [shortenResult, setShortenResult] = useState("");
  const [shortenLoading, setShortenLoading] = useState(false);
  const [urls, setUrls] = useState([]);
  const [urlsLoading, setUrlsLoading] = useState(false);
  const [urlsError, setUrlsError] = useState("");
  const [selectedShortCode, setSelectedShortCode] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    const handleClerkSynced = () => {
      checkSession();
    };

    const handleClerkCleared = () => {
      resetLocalSessionState();
    };

    window.addEventListener("clerk-auth-synced", handleClerkSynced);
    window.addEventListener("clerk-auth-cleared", handleClerkCleared);

    return () => {
      window.removeEventListener("clerk-auth-synced", handleClerkSynced);
      window.removeEventListener("clerk-auth-cleared", handleClerkCleared);
    };
  }, []);

  function resetLocalSessionState() {
    setUser(null);
    setUrls([]);
    setShortenUrl("");
    setCustomCode("");
    setShortenResult("");
    setSelectedShortCode("");
    setAnalytics(null);
    setAnalyticsError("");
    setAuthError("");
    setCheckingSession(false);
  }

  async function checkSession() {
    try {
      const res = await apiFetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        await loadUrls();
      }
    } finally {
      setCheckingSession(false);
    }
  }

  async function loadUrls(preferredShortCode = "") {
    setUrlsLoading(true);
    setUrlsError("");

    try {
      const res = await apiFetch("/api/urls");
      const data = await res.json();

      if (!res.ok) {
        setUrls([]);
        setUrlsError(data.error || "Failed to load URLs");
        return;
      }

      const nextUrls = data.urls || [];
      setUrls(nextUrls);
      setSelectedShortCode((current) => {
        if (nextUrls.length === 0) {
          return "";
        }

        if (
          preferredShortCode &&
          nextUrls.some((url) => url.short_code === preferredShortCode)
        ) {
          return preferredShortCode;
        }

        if (current && nextUrls.some((url) => url.short_code === current)) {
          return current;
        }

        return nextUrls[0].short_code;
      });
    } catch {
      setUrlsError("Error loading URLs");
      setUrls([]);
      setSelectedShortCode("");
    } finally {
      setUrlsLoading(false);
    }
  }

  async function loadAnalytics(shortCode) {
    if (!shortCode) {
      setAnalytics(null);
      setAnalyticsError("");
      return;
    }

    setAnalyticsLoading(true);
    setAnalyticsError("");

    try {
      const res = await apiFetch(`/api/urls/${shortCode}/stats`);
      const data = await res.json();

      if (!res.ok) {
        setAnalytics(null);
        setAnalyticsError(data.error || "Failed to load analytics");
        return;
      }

      setAnalytics(data);
    } catch {
      setAnalytics(null);
      setAnalyticsError("Error loading analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  }

  useEffect(() => {
    if (!user || !selectedShortCode) {
      setAnalytics(null);
      setAnalyticsError("");
      return;
    }

    loadAnalytics(selectedShortCode);
  }, [user, selectedShortCode]);

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authForm),
      });
      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || "Something went wrong");
        return;
      }

      setUser(data.user);
      setAuthForm({ email: "", password: "" });
      setShortenUrl("");
      setCustomCode("");
      setShortenResult("");
      await loadUrls();
    } catch {
      setAuthError("Something went wrong");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    resetLocalSessionState();

    if (clerkEnabled) {
      window.dispatchEvent(new Event("clerk-sign-out-requested"));
    }
  }

  async function handleShortenSubmit(event) {
    event.preventDefault();
    setShortenLoading(true);
    setShortenError("");
    setShortenResult("");

    try {
      const trimmedCustomCode = customCode.trim();
      const payload = { url: shortenUrl };
      if (trimmedCustomCode) {
        payload.customCode = trimmedCustomCode;
      }

      const res = await apiFetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setShortenError(data.error || "Something went wrong");
        return;
      }

      setShortenUrl("");
      setCustomCode("");
      setShortenResult(
        data.short_url || `${window.location.origin}/${data.short_code}`,
      );
      await loadUrls(data.short_code);
    } catch {
      setShortenError("Something went wrong");
    } finally {
      setShortenLoading(false);
    }
  }

  function handleAuthFieldChange(field, value) {
    setAuthForm((current) => ({ ...current, [field]: value }));
  }

  if (checkingSession) {
    return (
      <div className="app-shell">
        <p className="status-text">Checking session...</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="app-card">
        <header className="app-header">
          <div>
            <p className="eyebrow">URL Shortener</p>
            <h1>Simple links, clean dashboard</h1>
          </div>
        </header>

        {!user ? (
          <AuthPanel
            isLogin={isLogin}
            form={authForm}
            error={authError}
            loading={authLoading}
            enableClerk={clerkEnabled}
            onFieldChange={handleAuthFieldChange}
            onSubmit={handleAuthSubmit}
            onToggleMode={() => {
              setIsLogin((current) => !current);
              setAuthError("");
            }}
          />
        ) : (
          <Dashboard
            user={user}
            onLogout={handleLogout}
            shortenUrl={shortenUrl}
            customCode={customCode}
            shortenError={shortenError}
            shortenResult={shortenResult}
            shortenLoading={shortenLoading}
            urls={urls}
            urlsLoading={urlsLoading}
            urlsError={urlsError}
            selectedShortCode={selectedShortCode}
            analytics={analytics}
            analyticsLoading={analyticsLoading}
            analyticsError={analyticsError}
            onShortenChange={setShortenUrl}
            onCustomCodeChange={setCustomCode}
            onShortenSubmit={handleShortenSubmit}
            onSelectAnalytics={setSelectedShortCode}
          />
        )}
      </main>
    </div>
  );
}
