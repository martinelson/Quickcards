require('dotenv').config({
  path: "../.env"
});
const tokenSecret = process.env.TOKEN_SECRET;
const router = require("express").Router();
const passport = require("passport");
const updateQuery = require("../config/getqueries.js").updateQuery;
const updateEmailQuery = require("../config/getqueries.js").updateEmailQuery;
const mySetsQuery = require("../config/getqueries.js").mySetsQuery;
const setCheck = require("../config/getqueries.js").setCheck;
const userCards = require("../config/getqueries.js").userCards;
const studyQuery = require("../config/getqueries.js").studyQuery;
const testQuery = require("../config/getqueries.js").testQuery;
const auth = require("../auth/auth.js");
const jwt = require("jsonwebtoken");
const xss = require("xss");
const isAuth = auth.isAuth;
const inList = auth.inList;
const isConfirmed = auth.isConfirmed;
const notConfirmed = auth.notConfirmed;
const joiSchema = auth.joiSchema;

//////////REGISTER ROUTE//////////////
router.get('/register', (req, res, next) => {
  res.render("../views/register.ejs", {
    message: ''
  });
});


////////////LOGIN ROUTE////////////
router.get('/login', (req, res) => {
  //if user already logged in, redirect back home
  if(req.user){
    return res.redirect("/");
  }
  //displaying passport flash error message, if there is an error message, nothing if not
  const errorCheck = req.session.hasOwnProperty('flash');
  if (errorCheck) {
    var message = req.session.flash.error[0];
  } else {
    var message = '';
  }
  if (!message) {
    var message = '';
  }
  res.render("../views/login.ejs", {
    message: message
  });
});


//////////////////CONFIRM EMAIL ROUTE //////////////////////
router.get('/confirm/:token', notConfirmed, async (req, res, next) => {
  try {
    //verifying token user received
    const {user} = jwt.verify(req.params.token, tokenSecret);
    updateEmailQuery(res,"UPDATE users SET confirmed = true WHERE user = ?",[user], '../views/confirm.ejs', next);
  } catch(e){
    next(e);
  }
});
// isAuth, notConfirmed,

/////////////////CONFIRM EMAIL PAGE///////////////////
router.get('/confirm',  (req, res) =>{
  const message = "Please confirm your email";
  return res.render('../views/confirm.ejs',{message: message});
});


/////////////////UPDATE PASSWORD PAGES//////////////
router.get('/update', (req, res) =>{
  return res.render('../views/update.ejs',{message:''});
});

router.get('/reset/:token', async (req, res, next) => {
  try {
    //verifying token user received
    const {user} = jwt.verify(req.params.token, tokenSecret);
    updateQuery(res,"SELECT user FROM users WHERE user = ?",[user],'../views/reset.ejs',next);
  } catch(e){
    next(e);
  }
});

///////////HOME ROUTE////////////
router.get('/', isAuth, isConfirmed, (req, res) => {
  //if the user has an error from logging in,
  const errorCheck = req.session.hasOwnProperty('flash');
  if (errorCheck) {
    //remove error if they are now logged in,
    if (req.session.flash.error[0] !== []) {
      //remove error
      req.session.flash.error = [];
      var message = '';
    } else {
      //if not, then keep the error and present the message
      var message = req.session.flash.error[0];
    }
  } else {
    //if no flash error, clear message
    var message = '';
  }
  res.render("../views/home.ejs", {
    message: message
  });
});


////////MY SETS ROUTE///////////
router.get('/mysets', isAuth, isConfirmed, (req, res, next) => {
  //grab sets that match logged in user
  mySetsQuery(res, "SELECT * FROM sets WHERE user = ?", [req.user], "../views/mysets.ejs");
});


///////////PROFILE ROUTE//////////////////
router.get('/profile', isAuth, isConfirmed, async (req, res, next) => {
  //grab user that matches logged in user
  res.render("../views/profile.ejs", {
    user: req.user,
    message: ''
  });
});


///////////////////EDIT CARDS ROUTE//////////////////////
router.get('/cards/:setId', isAuth, isConfirmed, (req, res, next) => {
  //setting set route id
  const route_id = xss(req.params.setId);
  setCheck(res, "SELECT * FROM sets WHERE idsets = ? AND user = ?", [route_id, req.user],"../mysets")
  //if user has access to set, find user cards under set
  userCards(res, "SELECT * FROM cards WHERE setid = ? AND user = ?", [route_id, req.user], "cards")
});


/////////////////STUDY ROUTE/////////////////
router.get('/study/:cardId/:setId', isAuth, isConfirmed, (req, res, next) => {
  //getting values for study navigation
  const set_id = xss(req.params.setId);
  const card_id = xss(req.params.cardId);
  const nextCard = parseInt(xss(card_id)) + 1;
  const previous = parseInt(xss(card_id)) - 1;
  //grabbing all cards with matching set id and user
  studyQuery(res, "SELECT * FROM cards WHERE setid = ? AND user = ?",
  [set_id, req.user],
  "../views/study.ejs",
  card_id,
  nextCard,
  previous);
});


/////////////TEST ROUTE ///////////////
router.get('/test/:cardId/:setId', isAuth, isConfirmed, (req, res, next) => {
  //getting values and prompting for an answer response
  const set_id = xss(req.params.setId);
  const card_id = xss(req.params.cardId);
  const nextCard = parseInt(xss(card_id)) + 1;
  const previous = parseInt(xss(card_id)) - 1;
  const tempAnswer = '';
  const userAnswer = '';
  const correctAnswer = '';
  //grabbing all cards with matching set id and user
  testQuery(res, "SELECT * FROM cards WHERE setid = ? AND user = ?",
  [set_id, req.user],
  "../views/test.ejs",
  card_id,
  nextCard,
  previous,
  tempAnswer);

});

///////////LOGOUT ROUTE/////////////////
router.get('/logout', (req, res, next) => {
  req.logout();
  res.redirect('/login');
});

module.exports = router;
