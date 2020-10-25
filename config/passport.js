const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const dbConnection = require("./database.js");
const bcrypt = require("bcrypt");
const db = dbConnection.db;

//creating passport fields
const customFields = {
  usernameField: "email",
  passwordField: "password"
};

//varify user function
const verifyCallback = (username, password, done) => {
  db.query("SELECT * FROM users WHERE user = ?", [username], async (error, user) => {
    if (error) {
      return done(error);
    } else {
      if (user.length > 0) {
        //comparing password entry
        const isValid = await bcrypt.compare(password, user[0].password);
        if (isValid) {
          return done(null, user[0].user);
        } else {
          return done(null, false, {
            message: "Invalid username/password"
          });
        }
      } else {
        //return if no email in db
        return done(null, false, {
          message: "Invalid username/password"
        });
      }
    }
  });
}

//creating local strategy
const strategy = new LocalStrategy(customFields, verifyCallback);

//telling passport which strategy we're using
passport.use(strategy);

//serialize and deserialize user functions
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((userId, done) => {
  db.query("SELECT user FROM users WHERE user = ?", [userId], (error, result) => {
    if (result.length > 0) {
      done(null, result[0].user);
    } else {
      done(null, false);
    }
    if (error) {
      done(error);
    }
  });
});
