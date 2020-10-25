require('dotenv').config({
  path: "../.env"
});
const clientId = process.env.OAUTH_CLIENT_ID;
const clientSecret = process.env.OAUTH_SECRET;
const refreshToken = process.env.OAUTH_REFRESH;
const tokenSecret = process.env.TOKEN_SECRET;
const userEmail = process.env.EMAIL;
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(clientId, clientSecret, "https://developers.google.com/oauthplayground");

oauth2Client.setCredentials({
  refresh_token: refreshToken
});

const accessToken = oauth2Client.getAccessToken();

const transport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: "OAuth2",
    user: userEmail,
    clientId: clientId,
    clientSecret: clientSecret,
    refreshToken: refreshToken,
    accessToken: accessToken
  }
});

function confirmEmail(email){
  jwt.sign({
    user: email
  },
  tokenSecret, {
    expiresIn: "1d"
  },
  (err, emailToken) => {
    if(err){
      console.log(err)
    }
    const url = `http://localhost:3000/confirm/${emailToken}`;
    transport.sendMail({
      from: userEmail,
      to: email,
      subject: "Confirm Email",
      html: `
      <body>
      <h1 style="color:#0077c0;text-align:center;">Hey there, welcome to Quickcards.</h1>
      <h3>Please confirm your email so you can get to studying: <a href="${url}">Confirm</a></h3>
      </body>`
    }, function(mailError, result) {
      if (mailError) {
        console.log(mailError);
      } else{
        transport.close();
      }
    });
  }
);
}



function resetEmail(email){
  jwt.sign({
    user: email
  },
  tokenSecret, {
    expiresIn: "10m"
  },
  (err, emailToken) => {
    if(err){
      console.log(err)
    }
    const url = `http://localhost:3000/reset/${emailToken}`;
    transport.sendMail({
      from: userEmail,
      to: email,
      subject: "Reset Password",
      html: `
      <body>
      <h1 style="color:#0077c0;text-align:center;">Reset Password</h1>
      <h3>You recently requested to reset your password.</h3>
      <h3>Click here to reset your password: <a href="${url}">Reset</a></h3>
      <h3>This link will expire in ten minutes.</h3>
      <h6 style="text-align:center">If you did not request this, please ignore this message.</h6>
      </body>`
    }, function(mailError, result) {
      if (mailError) {
        console.log(mailError);
      } else{
        transport.close();
      }
    });
  }
);
}

function confirmResetEmail(email){
    transport.sendMail({
      from: userEmail,
      to: email,
      subject: "Password Reset",
      html: `
      <body>
      <h1 style="color:#0077c0;text-align:center;">Your Password is Reset</h1>
      <h3>Your password to Quickcards has been reset successfully.<h3>
      </body>`
    }, function(mailError, result) {
      if (mailError) {
        console.log(mailError);
      } else{
        transport.close();
      }
    });
  }

module.exports = {
  confirmEmail,
  resetEmail,
  confirmResetEmail
};
