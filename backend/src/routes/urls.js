const express = require("express");
const router = express.Router();
const db = require("../db");
const requireAuth = require("../middleware/requireAuth");
const generateShortCode = require("../utils/generateCode");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const SHORT_CODE_MIN_LENGTH = 3;
const SHORT_CODE_MAX_LENGTH = 10;
const SHORT_CODE_PATTERN = /^[a-zA-Z0-9_-]+$/;
const RESERVED_SHORT_CODES = new Set(["api", "health", "assets"]);

function normalizeCustomCode(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function validateCustomCode(code) {
  if (
    code.length < SHORT_CODE_MIN_LENGTH ||
    code.length > SHORT_CODE_MAX_LENGTH
  ) {
    return `Custom code must be ${SHORT_CODE_MIN_LENGTH}-${SHORT_CODE_MAX_LENGTH} characters long.`;
  }

  if (!SHORT_CODE_PATTERN.test(code)) {
    return "Custom code can only use letters, numbers, hyphens, and underscores.";
  }

  if (RESERVED_SHORT_CODES.has(code.toLowerCase())) {
    return "That custom code is reserved. Please choose another.";
  }

  return "";
}

const shortenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    req.session?.userId ? `user:${req.session.userId}` : ipKeyGenerator(req.ip),
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many short links created. Please wait and try again.",
    });
  },
});

// Create a short URL
router.post("/shorten", requireAuth, shortenLimiter, async (req, res) => {
  const { url, customCode } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required." });
  }

  const requestedCode = normalizeCustomCode(customCode);
  const createUrl = async (shortCode) =>
    db.query(
      "INSERT INTO urls (short_code, original_url, user_id) VALUES ($1, $2, $3) RETURNING id, short_code, original_url, created_at",
      [shortCode, url, req.session.userId],
    );

  try {
    let createdUrl = null;

    if (requestedCode) {
      const validationError = validateCustomCode(requestedCode);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const existing = await db.query(
        "SELECT 1 FROM urls WHERE short_code = $1",
        [requestedCode],
      );

      if (existing.rows.length > 0) {
        return res
          .status(409)
          .json({ error: "That custom code is already taken." });
      }

      const result = await createUrl(requestedCode);
      createdUrl = result.rows[0];
    } else {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const generatedCode = generateShortCode();

        try {
          const result = await createUrl(generatedCode);
          createdUrl = result.rows[0];
          break;
        } catch (err) {
          if (err.code !== "23505") {
            throw err;
          }
        }
      }
    }

    if (!createdUrl) {
      return res.status(500).json({
        error: "Could not generate a unique short code. Please try again.",
      });
    }

    res.json({
      ...createdUrl,
      short_url: `${req.protocol}://${req.get("host")}/${createdUrl.short_code}`,
    });
  } catch (err) {
    console.error("Error creating short URL:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all URLs for the logged-in user
router.get("/urls", requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.short_code, u.original_url, u.created_at,
            COUNT(c.id)::int AS total_clicks
       FROM urls u
       LEFT JOIN clicks c ON c.url_id = u.id
       WHERE u.user_id = $1
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
      [req.session.userId],
    );

    res.json({ urls: result.rows });
  } catch (err) {
    console.error("Error fetching URLs:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a URL owned by the logged-in user
router.delete("/urls/:shortCode", requireAuth, async (req, res) => {
  const { shortCode } = req.params;

  try {
    const result = await db.query(
      "DELETE FROM urls WHERE short_code = $1 AND user_id = $2 RETURNING id, short_code",
      [shortCode, req.session.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "URL not found" });
    }

    res.json({ message: "URL deleted successfully", url: result.rows[0] });
  } catch (err) {
    console.error("Error deleting URL:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get detailed analytics for a specific URL
router.get("/urls/:shortCode/stats", requireAuth, async (req, res) => {
  const { shortCode } = req.params;

  try {
    // Verify ownership
    const urlResult = await db.query(
      "SELECT id, short_code, original_url, created_at FROM urls WHERE short_code = $1 AND user_id = $2",
      [shortCode, req.session.userId],
    );

    if (urlResult.rows.length === 0) {
      return res.status(404).json({ error: "URL not found" });
    }

    const urlRecord = urlResult.rows[0];

    // Total clicks
    const totalResult = await db.query(
      "SELECT COUNT(*)::int AS total FROM clicks WHERE url_id = $1",
      [urlRecord.id],
    );

    // Clicks per day (last 30 days)
    const dailyResult = await db.query(
      `SELECT DATE(clicked_at) AS date, COUNT(*) AS clicks
       FROM clicks
       WHERE url_id = $1 AND clicked_at > NOW() - INTERVAL '30 days'
       GROUP BY DATE(clicked_at)
       ORDER BY date`,
      [urlRecord.id],
    );

    // Top referrers
    const referrerResult = await db.query(
      `SELECT referrer, COUNT(*) AS count
       FROM clicks
       WHERE url_id = $1 AND referrer IS NOT NULL
       GROUP BY referrer
       ORDER BY count DESC
       LIMIT 10`,
      [urlRecord.id],
    );

    // Top user agents (browsers)
    const uaResult = await db.query(
      `SELECT user_agent, COUNT(*) AS count
       FROM clicks
       WHERE url_id = $1 AND user_agent IS NOT NULL
       GROUP BY user_agent
       ORDER BY count DESC
       LIMIT 10`,
      [urlRecord.id],
    );

    res.json({
      url: urlRecord,
      analytics: {
        total_clicks: parseInt(totalResult.rows[0].total),
        clicks_per_day: dailyResult.rows.map((row) => ({
          date: row.date,
          clicks: parseInt(row.clicks),
        })),
        top_referrers: referrerResult.rows,
        top_user_agents: uaResult.rows,
      },
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
