const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/:shortCode', async (req, res) => {
  const { shortCode } = req.params;

  try {
    // Find the original URL
    const result = await db.query(
      'SELECT id, original_url FROM urls WHERE short_code = $1',
      [shortCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    const urlRecord = result.rows[0];

    // Log the click (don't await — fire and forget so redirect is fast)
    db.query(
      'INSERT INTO clicks (url_id, ip_address, user_agent, referrer) VALUES ($1, $2, $3, $4)',
      [
        urlRecord.id,
        req.ip,
        req.get('User-Agent') || null,
        req.get('Referrer') || null,
      ]
    ).catch(err => console.error('Failed to log click:', err));

    // 302 redirect
    res.redirect(302, urlRecord.original_url);
  } catch (err) {
    console.error('Redirect error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
