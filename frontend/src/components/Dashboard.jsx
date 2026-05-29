import ShortenForm from "./ShortenForm";
import AnalyticsPanel from "./AnalyticsPanel";
import UrlList from "./UrlList";

export default function Dashboard({
  user,
  onLogout,
  shortenUrl,
  customCode,
  shortenError,
  shortenResult,
  shortenLoading,
  urls,
  urlsLoading,
  urlsError,
  selectedShortCode,
  analytics,
  analyticsLoading,
  analyticsError,
  onShortenChange,
  onCustomCodeChange,
  onShortenSubmit,
  onSelectAnalytics,
}) {
  return (
    <section className="dashboard">
      <nav className="topbar">
        <span className="user-email">{user.email}</span>
        <button type="button" className="secondary-button" onClick={onLogout}>
          Logout
        </button>
      </nav>

      <ShortenForm
        value={shortenUrl}
        customCode={customCode}
        error={shortenError}
        result={shortenResult}
        loading={shortenLoading}
        onChange={onShortenChange}
        onCustomCodeChange={onCustomCodeChange}
        onSubmit={onShortenSubmit}
      />

      <UrlList
        urls={urls}
        loading={urlsLoading}
        error={urlsError}
        selectedShortCode={selectedShortCode}
        onSelectAnalytics={onSelectAnalytics}
      />

      <AnalyticsPanel
        urls={urls}
        selectedShortCode={selectedShortCode}
        analytics={analytics}
        loading={analyticsLoading}
        error={analyticsError}
        onSelectAnalytics={onSelectAnalytics}
      />
    </section>
  );
}
