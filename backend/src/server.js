require("dotenv").config();

const fs = require("fs");
const https = require("https");
const cors = require("cors");
const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const path = require("path");
const { clerkMiddleware } = require("@clerk/express");

const db = require("./db/index.js");
const urlRoutes = require("./routes/urls");
const redirectRoutes = require("./routes/redirect");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 3000;
const frontendDistPath = path.join(__dirname, "..", "..", "frontend", "dist");
const legacyPublicPath = path.join(__dirname, "..", "public");

app.set("trust proxy", 1);

const rawCorsOrigins =
  process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "";
const corsOrigins = rawCorsOrigins
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (corsOrigins.length > 0) {
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  );
}

if (process.env.CLERK_SECRET_KEY) {
  app.use(clerkMiddleware());
}

const sessionPool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

app.use(express.json());

app.use(express.static(frontendDistPath));
app.use(express.static(legacyPublicPath));

app.use(
  session({
    store: new pgSession({
      pool: sessionPool,
      tableName: process.env.SESSION_TABLE || "session",
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true, // JavaScript can't access the cookie
      secure:
        corsOrigins.length > 0 ? true : process.env.NODE_ENV === "production",
      sameSite: corsOrigins.length > 0 ? "none" : "lax",
    },
  }),
);

app.get("/health", async (req, res) => {
  try {
    const result = await db.query("SELECT NOW()");
    res.json({ status: "ok", db_time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api", urlRoutes);
app.use("/", redirectRoutes);

const httpsKeyPath =
  process.env.HTTPS_KEY_PATH ||
  path.join(__dirname, "..", "..", "certs", "localhost-key.pem");
const httpsCertPath =
  process.env.HTTPS_CERT_PATH ||
  path.join(__dirname, "..", "..", "certs", "localhost-cert.pem");

function startServer() {
  const useHttps =
    process.env.USE_HTTPS === "true" &&
    fs.existsSync(httpsKeyPath) &&
    fs.existsSync(httpsCertPath);

  if (useHttps) {
    const credentials = {
      key: fs.readFileSync(httpsKeyPath),
      cert: fs.readFileSync(httpsCertPath),
    };

    https.createServer(credentials, app).listen(PORT, () => {
      console.log(`HTTPS server running on port ${PORT}`);
    });
    return;
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
