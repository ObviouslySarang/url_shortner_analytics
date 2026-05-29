const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../db");
const { getAuth } = require("@clerk/express");

const SALT_ROUNDS = 10;

function normalizeEmail(email) {
  if (typeof email !== "string") {
    return "";
  }

  return email.trim().toLowerCase();
}

async function setSessionForUser(req, user) {
  req.session.userId = user.id;
  req.session.email = user.email;
}

router.post("/clerk/sync", async (req, res) => {
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const email = normalizeEmail(req.body.email);

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const clerkUserResult = await db.query(
      "SELECT id, email, clerk_user_id FROM users WHERE clerk_user_id = $1",
      [userId],
    );

    let user = null;

    if (clerkUserResult.rows.length > 0) {
      const currentUser = clerkUserResult.rows[0];

      if (currentUser.email !== email) {
        const emailConflict = await db.query(
          "SELECT id FROM users WHERE email = $1 AND id <> $2",
          [email, currentUser.id],
        );

        if (emailConflict.rows.length > 0) {
          return res.status(409).json({ error: "Email already registered" });
        }
      }

      const updated = await db.query(
        "UPDATE users SET email = $1 WHERE id = $2 RETURNING id, email",
        [email, currentUser.id],
      );
      user = updated.rows[0];
    } else {
      const emailMatch = await db.query(
        "SELECT id, email, clerk_user_id FROM users WHERE email = $1",
        [email],
      );

      if (emailMatch.rows.length > 0) {
        const existingUser = emailMatch.rows[0];

        if (
          existingUser.clerk_user_id &&
          existingUser.clerk_user_id !== userId
        ) {
          return res
            .status(409)
            .json({ error: "Email already linked to another account" });
        }

        const updated = await db.query(
          "UPDATE users SET clerk_user_id = $1, password_hash = NULL WHERE id = $2 RETURNING id, email",
          [userId, existingUser.id],
        );
        user = updated.rows[0];
      } else {
        const inserted = await db.query(
          "INSERT INTO users (email, password_hash, clerk_user_id) VALUES ($1, NULL, $2) RETURNING id, email",
          [email, userId],
        );
        user = inserted.rows[0];
      }
    }

    await setSessionForUser(req, user);

    res.json({
      message: "Clerk session synced",
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    console.error("Clerk sync error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Register
router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters" });
  }

  try {
    // Check if email already exists
    const existing = await db.query("SELECT id FROM users WHERE email = $1", [
      email.toLowerCase(),
    ]);

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create the user
    const result = await db.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
      [email.toLowerCase(), passwordHash],
    );

    const user = result.rows[0];

    // Create session (log them in immediately)
    req.session.userId = user.id;
    req.session.email = user.email;

    res.status(201).json({
      message: "Registration successful",
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const result = await db.query(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [email.toLowerCase()],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];

    // Compare password with hash
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Create session
    req.session.userId = user.id;
    req.session.email = user.email;

    res.json({
      message: "Login successful",
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Logout
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Could not log out" });
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully" });
  });
});

// Get current user
router.get("/me", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json({ user: { id: req.session.userId, email: req.session.email } });
});

module.exports = router;
