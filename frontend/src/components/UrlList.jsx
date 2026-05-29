export default function UrlList({
  urls,
  loading,
  error,
  selectedShortCode,
  onSelectAnalytics,
}) {
  return (
    <section className="panel">
      <h2>Your URLs</h2>

      {error ? <p className="error-text">{error}</p> : null}

      <ul className="url-list">
        {loading ? <li>Loading...</li> : null}
        {!loading && urls.length === 0 && !error ? (
          <li>No URLs yet. Create your first one above!</li>
        ) : null}

        {!loading &&
          urls.map((url) => {
            const displayUrl =
              url.original_url.length > 50
                ? `${url.original_url.slice(0, 50)}...`
                : url.original_url;

            return (
              <li
                key={url.id}
                className={
                  selectedShortCode === url.short_code
                    ? "url-item url-item-active"
                    : "url-item"
                }
              >
                <div className="url-item-main">
                  <a
                    href={`/${url.short_code}`}
                    target="_blank"
                    rel="noreferrer"
                    className="short-url"
                  >
                    /{url.short_code}
                  </a>
                  <span className="url-original">{displayUrl}</span>
                  <span className="clicks">({url.total_clicks} clicks)</span>
                </div>

                <button
                  type="button"
                  className="analytics-button"
                  onClick={() => onSelectAnalytics(url.short_code)}
                >
                  View analytics
                </button>
              </li>
            );
          })}
      </ul>
    </section>
  );
}
