import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import pkg from 'pg';
const { Client } = pkg;

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Database Connection (Supabase/PostgreSQL) - COMMENTED OUT
const db = new Client({
  connectionString: process.env.SUPABASE_URL,
  ssl: { rejectUnauthorized: false },
});
db.connect();

// Session Setup
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set("view engine", "ejs");

app.use(passport.initialize());
app.use(passport.session());

// Passport Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        return done(null, profile);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  try {
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Routes
app.get("/", (req, res) => {
  const eventTime = new Date("2025-02-22T00:00:00").getTime();
  const now = new Date().getTime();
  const difference = eventTime - now;

  const countdown = {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((difference % (1000 * 60)) / 1000),
  };

  res.render("index.ejs", { countdown });
});

// Google Authentication Routes
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  async (req, res) => {
    // Successful authentication, redirect to dashboard.
    try {
      await db.query("INSERT INTO students (username, email) VALUES ($1, $2)", [req.user.displayName, req.user.emails[0].value]);
    } catch (err) {
        console.log(err);
    }
    res.redirect("/dashboard");
  }
);

// Dashboard Route
app.get("/dashboard", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/");
  }
  res.render("dashboard.ejs", { user: req.user });
});

// Logout Route
app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => res.redirect("/"));
  });
});

// Project Submission Route - Database Code Commented Out
app.post("/submit", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { teamName, projectLink, projectDescription } = req.body;
  const email = req.user.emails[0].value;

  try {
    /*
    await db.query(
      "INSERT INTO projects (team_name, project_link, project_description, submitted_by) VALUES ($1, $2, $3, $4)",
      [teamName, projectLink, projectDescription, email]
    );
    */
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Submission Error:", err);
    res.status(500).json({ error: "Failed to submit project" });
  }
});

// Feedback Submission Route - Database Code Commented Out
app.post("/feedback", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { feedback } = req.body;
  const email = req.user.emails[0].value;

  try {
    /*
    await db.query("INSERT INTO feedback (email, feedback_text) VALUES ($1, $2)", [email, feedback]);
    */
    res.redirect("/dashboard");
  } catch (err) {
    console.error("Feedback Error:", err);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});