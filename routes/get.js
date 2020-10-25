require('dotenv').config({
  path: "../.env"
});
const tokenSecret = process.env.TOKEN_SECRET;
const router = require("express").Router();
const passport = require("passport");
const dbConnection = require("../config/database.js");
const db = dbConnection.db;
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
    db.query("UPDATE users SET confirmed = true WHERE user = ?",
    [user],
    function(err, response) {
      if (err){
        throw err;
      }
      //if user in db is updated, send to confirm success page
      if (response.changedRows === 1){
        return res.render('../views/confirm.ejs',{message:''});
      } else{
        //if not then send error page
        const error = new Error("Not found");
        error.status = 404;
        next(error);
      }
    });
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
    db.query("SELECT user FROM users WHERE user = ?",
    [user],
    function(err, response) {
      if (err){
        throw err;
      }
      //if user in db is updated, send to reset page
      if (response.length > 0){
        return res.render('../views/reset.ejs',{message:'', user: user});
      } else{
        //if not then send error page
        const error = new Error("Not found");
        error.status = 404;
        next(error);
      }
    });
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
  db.query("SELECT * FROM sets WHERE user = ?", [req.user], function(error, found) {
    if (error) {
      throw error
    }
    //if the user has sets, return sets
    if (found.length > 0) {
      return res.render("../views/mysets.ejs", {
        sets: found
      });
      //else notify the user to make a set
    } else {
      return res.render("../views/mysets.ejs", {
        sets: "No sets"
      });
    }
  })
});


///////////PROFILE ROUTE//////////////////
router.get('/profile', isAuth, isConfirmed, (req, res, next) => {
  let setCount = 0;
  let cardCount = 0;
  db.query("SELECT COUNT(title) from sets WHERE user = ?", [req.user], function(countSetErr, countSetResp){
    if(countSetErr){
      throw countSetErr;
    }
    setCount += countSetResp[0]['COUNT(title)'];
  });

  db.query("SELECT COUNT(front) from cards WHERE user = ?", [req.user], function(countCardsErr, countCardsResp){
    if(countCardsErr){
      throw countCardsErr;
    }
    cardCount += countCardsResp[0]['COUNT(front)'];
  });
  //grab user that matches logged in user
  db.query("SELECT user FROM users WHERE user = ?", [req.user], function(err, response) {
    if (err) {
      throw err;
    }
    //if no errors, and one is grabbed,
    if (response.length > 0) {
      return res.render("../views/profile.ejs", {
        user: req.user,
        message: '',
        setCount: setCount,
        cardCount: cardCount
      });
    } else {
      res.status(404);
      next();
    }
  })
});


///////////////////EDIT CARDS ROUTE//////////////////////
router.get('/cards/:setId', isAuth, isConfirmed, (req, res, next) => {
  //setting set route id
  const route_id = xss(req.params.setId);
  //checking to see if user created the set id
  db.query("SELECT * FROM sets WHERE idsets = ? AND user = ?",
  [route_id, req.user],
  function(err, setResponse) {
    if (err) {
      throw err;
    }
    //if not redirect to mysets
    if (setResponse.length === 0) {
      console.log("no sets")
      return res.redirect("../mysets");
    }
  });
  //if user has access to set, find user cards under set
  db.query("SELECT * FROM cards WHERE setid = ? AND user = ?",
  [route_id, req.user],
  function(error, response) {
    if(error){
      throw error;
    }
    //if no cards yet in the set, render cards with no cards yet to display
    if (response.length === 0) {
      return res.render("cards", {
        cards: "No set",
        set: route_id
      })
    }
    //if there are cards, render cards already created
    return res.render("cards", {
      cards: response,
      set: route_id
    });
  })
});


/////////////////STUDY ROUTE/////////////////
router.get('/study/:cardId/:setId', isAuth, isConfirmed, (req, res, next) => {
  //getting values for study navigation
  const set_id = xss(req.params.setId);
  const card_id = xss(req.params.cardId);
  const nextCard = parseInt(xss(card_id)) + 1;
  const previous = parseInt(xss(card_id)) - 1;
  //grabbing all cards with matching set id and user
  db.query("SELECT * FROM cards WHERE setid = ? AND user = ?", [set_id, req.user], function(err, response) {
    if (err) {
      throw err;
    }
    // if user has created the cards, return the test page
    console.log(response)
    if(response.length > 0){
      const setLength = response.length;
      return res.render("../views/study.ejs", {
        card: response[card_id],
        nextCard: nextCard,
        previous: previous,
        setLength: setLength
      });
    } else{
      next();
    }
  });
});


/////////////TEST ROUTE ///////////////
router.get('/test/:cardId/:setId', isAuth, isConfirmed, (req, res, next) => {
  //getting values and prompting for an answer response
  const set_id = xss(req.params.setId);
  const card_id = xss(req.params.cardId);
  const nextCard = parseInt(xss(card_id)) + 1;
  const previous = parseInt(xss(card_id)) - 1;
  const answer = '';
  const userAnswer = '';
  const correctAnswer = '';
  //grabbing all cards with matching set id and user
  db.query("SELECT * FROM cards WHERE setid = ? AND user = ?",
  [set_id, req.user],
  function(err, response) {
    if (err) {
      throw err;
    }
    // if user has created the cards, return the test page
    if(response.length > 0){
      const setLength = response.length;
      return res.render("../views/test.ejs", {
        card: response[card_id],
        nextCard: nextCard,
        previous: previous,
        setLength: setLength,
        answer: answer,
        userAnswer: userAnswer,
        correctAnswer: correctAnswer
      });
    } else{
      next();
    }
  });
});

///////////LOGOUT ROUTE/////////////////
router.get('/logout', (req, res, next) => {
  req.logout();
  res.redirect('/login');
});

module.exports = router;
