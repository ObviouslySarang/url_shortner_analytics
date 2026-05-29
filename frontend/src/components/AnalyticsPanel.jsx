import { useEffect, useMemo, useRef } from "react";
import {
  Chart,
  CategoryScale,
  LineController,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

Chart.register(
  CategoryScale,
  LineController,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
);

const WINDOW_DAYS = 30;

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildChartData(clicksPerDay = []) {
  const clicksByDate = new Map(
    clicksPerDay.map((entry) => [entry.date, Number(entry.clicks)]),
  );
  const labels = [];
  const values = [];

  for (let offset = WINDOW_DAYS - 1; offset >= 0; offset -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - offset);

    labels.push(
      day.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    );
    values.push(clicksByDate.get(getDateKey(day)) || 0);
  }

  return { labels, values };
}

export default function AnalyticsPanel({
  urls,
  selectedShortCode,
  analytics,
  loading,
  error,
  onSelectAnalytics,
}) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const selectedUrl = useMemo(
    () => urls.find((url) => url.short_code === selectedShortCode) || null,
    [urls, selectedShortCode],
  );

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    if (!canvasRef.current || !analytics) {
      return;
    }

    const { labels, values } = buildChartData(
      analytics.analytics.clicks_per_day,
    );

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Clicks",
            data: values,
            borderColor: "#1d4ed8",
            backgroundColor: "rgba(29, 78, 216, 0.12)",
            fill: true,
            tension: 0.35,
            pointRadius: 2,
            pointHoverRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [analytics]);

  return (
    <section className="panel analytics-panel">
      <div className="analytics-header">
        <div>
          <h2>Analytics</h2>
          <p className="panel-copy">Clicks over the last 30 days.</p>
        </div>

        <label className="analytics-picker">
          <span>Choose URL</span>
          <select
            value={selectedShortCode}
            onChange={(event) => onSelectAnalytics(event.target.value)}
            disabled={!urls.length}
          >
            <option value="">Select one</option>
            {urls.map((url) => (
              <option key={url.id} value={url.short_code}>
                /{url.short_code}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      {!error && !selectedUrl ? (
        <p className="panel-copy">Pick a short link to see its chart.</p>
      ) : null}

      {loading ? <p className="panel-copy">Loading analytics...</p> : null}

      {!loading && analytics ? (
        <>
          <div className="analytics-summary">
            <div className="analytics-stat">
              <span className="analytics-label">Selected link</span>
              <strong>/{analytics.url.short_code}</strong>
            </div>
            <div className="analytics-stat">
              <span className="analytics-label">Total clicks</span>
              <strong>{analytics.analytics.total_clicks}</strong>
            </div>
          </div>

          <div className="analytics-chart">
            <canvas ref={canvasRef} />
          </div>
        </>
      ) : null}
    </section>
  );
}
