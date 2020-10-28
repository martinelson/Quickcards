const Joi = require("joi");
const dbConnection = require("../config/database.js");
const db = dbConnection.db;
const xss = require("xss");

const isAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    return res.status(401).redirect('/login');
  }
}

const inList = (req, res, next) => {
  const categoryList = ["Art", "Social Studies", "Language", "Literature", "Mathematics", "Science", "Technology", "Business", "Other"];
  if (categoryList.includes(req.body.category)) {
    next();
  } else {
    return res.redirect('/');
  }
}

const isConfirmed = (req, res, next) => {
  db.query("SELECT confirmed FROM users WHERE user = ?", [req.user], function(err, response){
    if(err){
      throw err;
    }
    if(response[0].confirmed === 1){
      next();
    } else{
      res.redirect('/confirm');
    }
  });
}

const notConfirmed = (req, res, next) => {
  if(req.user){
    db.query("SELECT confirmed FROM users WHERE user = ?", [req.user], function(err, response){
      if(err){
        throw err;
      }
      if(response[0].confirmed === 0){
        next();
      } else{
        return res.redirect('/');
      }
    });
  } else{
    next();
  }

}

const emailExists = (req, res, next) =>{
  db.query("SELECT user FROM users WHERE user = ?", [xss(req.body.email)], function(err, response){
    if(err){
      throw err;
    }
    if(response.length > 0){
      next();
    } else{
      return  res.render('../views/update.ejs', {message:"Email not registered."})
    }
});
}

const joiSchema = Joi.object({
  email: Joi.string().email().required().min(6),
  password: Joi.string()
  .min(8)
  .pattern(new RegExp('^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,30}$'))
  .rule({message: "Password must have one captial and lower letter, one number, and one special character (#,?,!,@,$,%,^,&,*,-)"})
  .max(30)
  .required(),
  cpassword: Joi.string().min(8).max(30).required()
});


const verifyReset = Joi.object({
  resetbtn: Joi.string().email(),
  password: Joi.string()
  .min(8)
  .pattern(new RegExp('^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,30}$'))
  .rule({message: "Password must have one captial and lower letter, one number, and one special character (#,?,!,@,$,%,^,&,*,-)"})
  .max(30)
  .required(),
  cpassword: Joi.string().min(8).max(30).required()
});


module.exports = {
  isAuth,
  inList,
  isConfirmed,
  notConfirmed,
  emailExists,
  joiSchema,
  verifyReset
}
