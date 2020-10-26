require('dotenv').config();
const sessionSecret = process.env.SESSION_SECRET;
const express = require("express");
const ejs = require("ejs");
const flash = require("connect-flash");
const session = require("express-session");
const passport = require("passport");
const getRoutes = require("./routes/get.js");
const postRoutes = require("./routes/post.js");
const app = express();

app.disable('x-powered-by');
app.set("view engine", "ejs");

const dbConnection = require("./config/database.js");
const db = dbConnection.db;
const sessionStore = dbConnection.sessionStore;

//middleware
app.use(express.static("public"));
app.use(express.urlencoded({
  extended: false
}));
app.use(express.json());

app.set('trust proxy', 1);
//Session middleware
const sess = {
  name: 'sessionId',
  key: 'user',
  secret: sessionSecret,
  store: sessionStore,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: 60 * 60 * 1000 * 24,
    secure: true
  }
}


app.use(session(sess));
//Flash error message middleware
app.use(flash());

//Notifying app about passport file
require("./config/passport.js");
//initialize passport and session
app.use(passport.initialize());
app.use(passport.session());
//test middleware - Remove for production
// app.use((req, res, next) => {
//   console.log(req.session);
//   next();
// });


//get routes
app.use(getRoutes);
//post routes
app.use(postRoutes);

//Error handling
app.use(function(req, res, next) {
  const error = new Error("Not found");
  error.status = 404;
  next(error);
});

app.use(function(error, req, res, next) {
  console.log(error);
  res.render(__dirname+"/views/error.ejs")
});

//Port
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server started successfully");
});
