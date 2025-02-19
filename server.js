import bodyParser from "body-parser";
import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import bodyParser from "body-parser";
// import { Sequelize, DataTypes } from "sequelize"; // Commented out

dotenv.config();
const app = express();
const port = 3000;

/*
// Initialize Sequelize to connect to PostgreSQL
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  protocol: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

// Test the database connection
sequelize.authenticate()
  .then(() => console.log('Database connected successfully'))
  .catch(err => console.log('Error connecting to the database: ', err));

// Define User model to store Google profile data
const User = sequelize.define('User', {
  googleId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  displayName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  imageUrl: {
    type: DataTypes.STRING,
  },
}, {
  timestamps: true,
});

// Sync the model with the database
sequelize.sync();
*/

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(express.static('public'));
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
        /*
        // Check if the user already exists in the database
        let user = await User.findOne({ where: { googleId: profile.id } });

        if (!user) {
          // If the user doesn't exist, create a new user
          user = await User.create({
            googleId: profile.id,
            displayName: profile.displayName,
            email: profile.emails[0].value,
            imageUrl: profile.photos[0].value,
          });
        }

        return done(null, user);
        */
        return done(null, profile); // Temporary placeholder
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    // const user = await User.findByPk(id); // Commented out
    done(null, id); // Temporary placeholder
  } catch (err) {
    done(err);
  }
});

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

app.get("/logout", (req, res) => {
  req.logout((err) => {
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
