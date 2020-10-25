const router = require("express").Router();
const passport = require("passport");
const dbConnection = require("../config/database.js");
const _ = require("lodash");
const bcrypt = require("bcrypt");
const xss = require("xss");
const db = dbConnection.db;
const auth = require("../auth/auth.js");
const confirmEmail = require("../auth/authemail.js").confirmEmail;
const resetEmail =  require("../auth/authemail.js").resetEmail;
const confirmResetEmail =  require("../auth/authemail.js").confirmResetEmail;
const isAuth = auth.isAuth;
const inList = auth.inList;
const isConfirmed = auth.isConfirmed;
const notConfirmed = auth.notConfirmed;
const emailExists = auth.emailExists;
const joiSchema = auth.joiSchema;
const verifyReset = auth.verifyReset;


///////REGISTERING USERS///////////
router.post('/register', async (req, res) => {
  //getting values from form
  const email = xss(req.body.email);
  const password = xss(req.body.password);
  const cpassword = xss(req.body.cpassword);
  //checking if user already registeresd
  db.query("SELECT user FROM users WHERE user = ?", [email], async (error, result) => {
    if (error) {
      throw error;
    }
    if (result.length > 0) {
      return res.status(400).render("../views/register.ejs", {
        message: "email already registered"
      });
    } else {
      //checking if passwords match
      if (password !== cpassword) {
        return res.status(400).render("../views/register.ejs", {
          message: "passwords don't match please try again"
        });
      } else {
        //other form validation with joi
        const {
          error
        } = joiSchema.validate(req.body);
        if (error) {
          return res.status(400).render("../views/register.ejs", {
            message: error.details[0].message
          });
        } else {
          //if all validation passes:
          //hash password
          const hash = await bcrypt.hash(password, 10);
          //insert user into db
          db.query("INSERT INTO users (user, password) VALUES (?,?)",
          [email, hash],
          (err, results) => {
            if (err) {
              throw err;
            } else {
              confirmEmail(email);
              return res.redirect('/login');
            }
          });
        }
      }
    }
  });
});

/////////////RESENDING CONFIRM EMAIL/////////////
router.post('/resend', isAuth, notConfirmed, (req, res) =>{
  confirmEmail(req.user);
  return res.render('../views/confirm',{message:"Email sent, please check your inbox."})
});

///////////UPDATE PASSWORD CHECK///////////////
router.post('/update', emailExists, (req, res) =>{
  resetEmail(xss(req.body.email));
  return res.render('../views/update.ejs', {message:"Reset email sent, please check your inbox."})
});

router.post('/reset', async (req, res, next)=>{
  const user = xss(req.body.resetbtn);
  const password = xss(req.body.password);
  const cpassword = xss(req.body.cpassword);
  try{
    //checking if pws match
    if(password !== cpassword) {
      return res.status(400).render("../views/reset.ejs", {
        message: "passwords don't match please try again", user: user
      });
    }
    //checking joi validation
    const { error } = verifyReset.validate(req.body);
    if(error) {
      return res.status(400).render("../views/reset.ejs", {
        message: error.details[0].message, user: user
      });
    }
    //hashing pw, checking if pw is already in the system
    const hash = await bcrypt.hash(password, 10);
    db.query("SELECT password FROM users WHERE user = ?",[user],function(pwSelectErr, pwSelectResp){
      if(pwSelectErr){
        throw pwSelectErr;
      }
      if(pwSelectResp[0].password === hash){
        return res.status(400).render("../views/reset.ejs", {
          message: "must be a different password you currently have in the system", user: user
        });
      }
    });
    //updating pw
    db.query("UPDATE users SET password = ? WHERE user = ?", [hash, user], function(err, response){
      if(err){
        throw err;
      }
      if (response.changedRows === 1){
        confirmResetEmail(user);
        return res.redirect('/login');
      } else{
        next();
      }
    })
  } catch(e){
    next(e);
  }

})


/////LOGGING IN A USER/////////
router.post('/login', passport.authenticate('local', {
  failureRedirect: '/login',
  successRedirect: '/',
  failureFlash: true
}));


//////////ADDING A NEW SET/////////
router.post('/mysets', isAuth, isConfirmed, inList, (req, res, next) => {
  //get values from form
  const category = xss(req.body.category);
  const title = xss(req.body.title);
  const frontSide = xss(req.body.frontSide);
  const backSide = xss(req.body.backSide);
  //insert category, title, and user into set table
  db.query("INSERT INTO sets (category, title, user) VALUES (?,?,?)",
  [category, title, req.user],
  function(err, resp) {
    if (err) throw err;
    if (resp) {
      //insert setid, front, back, and user into card table
      db.query("INSERT INTO cards (setid, front, back, user) VALUES (?,?,?,?)",
      [resp.insertId, frontSide, backSide, req.user],
      function(err, cardresp) {
        if (err) throw err;
        //if no error, then redirect to mysets
        if(cardresp){
          return res.redirect('/mysets');
        }
      });
    } else{
      //if something doesn't work, prompt user to try again
      return res.redirect('/', {message: "Please try again"});
    }
  });
});


///////UPDATING, ADDING, DELETING CARDS IN A SET/////////
router.post('/cards/:setId', isAuth, isConfirmed, (req, res, next) => {
  //if the save button is pressed:
  if (xss(req.body.saveButton)) {
    //update the card that matches the cardid and the user logged in
    db.query("UPDATE cards SET front = ?, back = ? WHERE idcards = ? AND user = ?",
    [xss(req.body.frontSide), xss(req.body.backSide), xss(req.body.saveButton), req.user],
    function(err, response) {
      if (err) throw err;
      if (response) {
        //if no errors, redirect to the card page with updated card
        //if user changes
        return res.redirect('/cards/'+xss(req.params.setId));
      }
    });
  }
  //if the add button is clicked:
  if (xss(req.body.addButton)) {
    //add a new card to the set
    db.query("INSERT INTO cards (setid, front, back, user) VALUES (?,?,?,?)",
    [xss(req.params.setId), xss(req.body.frontSide), xss(req.body.backSide), req.user],
    function(addCardError, addCardResponse) {
      if (addCardError) {
        throw addCardError;
      }
      if (addCardResponse) {
        //if card added, redirect to set cards
        return res.redirect('/cards/' + xss(req.params.setId));
      }
    });
  }
  //if delete button is clicked
  if (xss(req.body.deleteButton)) {
    //delete card that matches card id and user in db
    db.query("DELETE FROM cards WHERE idcards = ? AND user = ?",
    [xss(req.body.deleteButton), xss(req.user)],
    function(deleteErr, deleteResponse) {
      if (deleteErr) {
        throw deleteErr;
      }
      if (deleteResponse) {
        //if no errors, redirect to set cards
        res.redirect('/cards/' + xss(req.params.setId));
      }
    });
  }
});

//
////////DELETING SETS //////////////
router.post('/deleteset', isAuth, isConfirmed, (req, res, next) => {
  db.query("DELETE FROM cards WHERE setid = ?", [xss(req.body.deletebutton)], function(err, deleteCardResponse) {
    if (err) {
      throw err;
    }
    if (deleteCardResponse) {
      db.query("DELETE FROM sets WHERE idsets = ?", [xss(req.body.deletebutton)], function(setErr, deleteSetResponse) {
        if (setErr) {
          throw setErr;
        }
        if (deleteSetResponse) {
          return res.redirect('/mysets');
        }
      });
    }
  });
});


///////////CHECKING SUBMITTED ANSWER////////////////
router.post('/answer/:cardOrder/:setId', isAuth, isConfirmed, (req, res, next) => {
  const set_id = xss(req.params.setId);
  const nextCard = parseInt(xss(req.params.cardOrder)) + 1;
  const previous = parseInt(xss(req.params.cardOrder)) - 1;
  const userAnswer = xss(req.body.backSide);
  const cardId = xss(req.body.answerButton);
  let answer = '';
  db.query("SELECT * FROM cards WHERE idcards = ? AND user = ?", [cardId, req.user], function(err, response) {
    if (err) {
      throw err;
    }
    if (response.length > 0) {
      //checking answer
      const userTest = _.words(_.toLower(userAnswer)).join("") === _.words(_.toLower(response[0].back)).join("")
      if (userTest) {
        answer += "Correct"
      } else {
        answer += "Incorrect"
      }
      db.query("SELECT * FROM cards WHERE setid = ? AND user = ?", [set_id, req.user], function(error, setResponse) {
        if (error) {
          throw error;
        }
        const setLength = setResponse.length;
        return res.render("../views/test.ejs", {
          card: response[0],
          nextCard: nextCard,
          previous: previous,
          setLength: setLength,
          answer: answer,
          userAnswer: userAnswer,
          correctAnswer: response[0].back
        });
      });
    } else{
      next();
    }
  });
});


////////////UPDATING USER PASSWORD///////////////////////
router.post('/update', isAuth, isConfirmed, async (req, res, next) => {
  const email = xss(req.body.email);
  const password = xss(req.body.password);
  const cpassword = xss(req.body.cpassword);
  //checking if passwords match
  if (password !== cpassword) {
    return res.status(400).render("../views/profile.ejs", {
      user: req.user,
      message: "passwords don't match"
    });
  } else {
    //other form validation with joi
    const {
      error
    } = joiSchema.validate(req.body);
    if (error) {
      return res.status(400).render("../views/profile.ejs", {
        user: req.user,
        message: error.details[0].message
      });
    } else {
      //if all validation passes:
      //hash password
      const hash = await bcrypt.hash(password, 10);
      //insert user into db
      db.query("UPDATE users SET password = ? WHERE user = ?", [hash, req.user], function(err, response) {
        if (err) {
          throw err;
        }
        if (response) {
          req.logout();
          res.render('../views/login.ejs', {
            message: "Update successful - login"
          });
        }
      });
    }
  }
});

module.exports = router;
