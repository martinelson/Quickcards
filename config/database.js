require('dotenv').config({
  path: "../.env"
});
const mysql = require("mysql");
const session = require("express-session");
const MySQLStore = require('express-mysql-session')(session);
const user = process.env.DB_USER;
const host = process.env.DB_HOST;
const password = process.env.DB_PW;
const name = process.env.DB_NAME;
// sets up the database connection to sql database
const db = mysql.createConnection({
  user: user,
  host: host,
  password: password,
  database: name
});

//creates the session store table in the sql database
const sessionStore = new MySQLStore({
  createDatabaseTable: true,
  expiration: 60 * 60 * 1000 * 24,
  endConnectionOnClose: false,
}, db);

//general check to see if connection worked
db.connect(err => {
  if (err) {
    console.log(err);
  }
  console.log('mysql connected');
});


//export both db and sessionStore
module.exports = {
  db,
  sessionStore
}
