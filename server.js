import bodyParser from "body-parser";
import dotenv from "dotenv";
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
const port = 3000 || process.env.PORT;

const db = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
      rejectUnauthorized: false,
  }
});

// render pg
// const db = new Client({
//   connectionString: process.env.DATABASE_URL1,
//   ssl: {
//       rejectUnauthorized: false,
//   }
// });

// const db = new Client({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
//   port: process.env.DB_PORT,
// });
db.connect();

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set("view engine", "ejs");

app.use(passport.initialize());
app.use(passport.session());

// Passport Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        return done(null, profile); // Temporary placeholder
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Serialize and Deserialize User
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser(async (user, done) => {
  try {
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Hackathon Start Date (Adjust this date & time)
const hackathonStart = new Date("2025-03-01T00:00:00Z"); // Change to your event start date

// Function to calculate countdown
const getCountdown = () => {
  const now = new Date();
  const timeDiff = hackathonStart - now;

  if (timeDiff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
};

// Routes
app.get("/", (req, res) => {
  const countdown = getCountdown();
  res.render("index", { countdown });
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  async (req, res) => {
    // Successful authentication, redirect to dashboard.
    // try {
    //   await db.query("INSERT INTO students (username, email) VALUES ($1, $2)", [req.user.displayName, req.user.emails[0].value]);
    // } catch (err) {
    //     console.log(err);
    // }
    res.redirect("/dashboard");
  }
);

app.get("/dashboard", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/");
  }
  res.render("dashboard", { user: req.user });
});

app.get("/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    req.session.destroy(() => {
      res.redirect("/");
    });
  });
});

app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
