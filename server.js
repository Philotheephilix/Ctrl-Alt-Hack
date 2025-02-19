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
    try {
      const existingUser = await db.query("SELECT * FROM students WHERE email = $1", [req.user.emails[0].value]);
      if (existingUser.rows.length === 0) {
        await db.query("INSERT INTO students (username, email) VALUES ($1, $2)", [req.user.displayName, req.user.emails[0].value]);
      }
    } catch (err) {
      console.error("Database Error:", err);
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

// Project Submission
app.post("/submit", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { teamName, projectTitle, projectDescription, demoLink, repoLink } = req.body;
  try {
    // Check if the team already submitted
    const result = await db.query(
      "SELECT * FROM submission WHERE team_name = $1 OR repo_url = $2 OR demo_url = $3",
      [teamName, repoLink, demoLink]
    );
    if (result.rows.length > 0) {
      return res.status(400).json({ error: "Submission already exists for this team!" });
    }
    // Insert new submission if no duplicate found
    await db.query(
      "INSERT INTO submission (team_name, project_title, project_description, demo_url, repo_url) VALUES ($1, $2, $3, $4, $5)",
      [teamName, projectTitle, projectDescription, demoLink, repoLink]
    );
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