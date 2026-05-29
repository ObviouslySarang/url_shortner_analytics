export default function ShortenForm({
  value,
  customCode,
  error,
  result,
  loading,
  onChange,
  onCustomCodeChange,
  onSubmit,
}) {
  return (
    <section className="panel">
      <h2>Shorten a URL</h2>
      <form className="form" onSubmit={onSubmit}>
        <label>
          <span>Long URL</span>
          <input
            type="url"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="https://example.com/very-long-url"
          />
        </label>

        <label>
          <span>Custom alias (optional)</span>
          <input
            type="text"
            value={customCode}
            onChange={(event) => onCustomCodeChange(event.target.value)}
            placeholder="my-link"
            pattern="[A-Za-z0-9_-]{3,10}"
            title="3-10 characters using letters, numbers, hyphens, or underscores."
          />
          <span className="input-hint">
            3-10 characters using letters, numbers, hyphens, or underscores.
          </span>
        </label>

        {error ? <p className="error-text">{error}</p> : null}

        <button type="submit" disabled={loading}>
          {loading ? "Shortening..." : "Shorten"}
        </button>
      </form>

      {result ? (
        <p className="result-text">
          Short URL:{" "}
          <a href={result} target="_blank" rel="noreferrer">
            {result}
          </a>
        </p>
      ) : null}
    </section>
  );
}
