const dbConnection = require("./database.js");
const db = dbConnection.db;

//UPDATE PASSWORD query
function updateQuery(res, query, params, path, next){
  db.getConnection((err, connection) =>{
    if(err){
      throw err;
    }
    connection.query(query, params, function(error, results){
      connection.release();
      if(error){
        throw error;
      }
      //if user in db, send to reset page
      if (results.length > 0){
        return res.render(path, {
          message: '',
          user: params[0]
        });
      //if not then send error page
      } else{
        const error = new Error("Not found");
        error.status = 404;
        next(error);
      }
    });
  });
}
///////

//CONFIRM EMAIL query
function updateEmailQuery(res,query,params,path,next){
  db.getConnection((err, connection) =>{
    if(err){
      throw err;
    }
    connection.query(query, params, function(error, results){
      connection.release();
      if(error){
        throw error;
      }
      //if user in db, send to reset page
      if (results.changedRows === 1){
        return res.render(path, {
          message: ''
        });
      //if not then send error page
      } else{
        const error = new Error("Not found");
        error.status = 404;
        next(error);
      }
    });
  });
}
///////

//MY SETS query
function mySetsQuery(res, query, params, path){
  db.getConnection((err, connection) =>{
    if(err){
      throw err;
    }
    connection.query(query, params, function(error, results){
      connection.release();
      if(error){
        throw error;
      }
      //if the user has sets, return sets
      if (results.length > 0){
        return res.render(path, {
          sets: results
        });
      //else notify the user to make a set
      } else{
        return res.render(path, {
          sets: "No sets"
        });
      }
    });
  });
}
//////

//EDIT Cards query
function setCheck(res, query, params, path){
  db.getConnection((err, connection) =>{
    if(err){
      throw err;
    }
    //checking to see if user created the set id
    connection.query(query, params, function(error, results){
      connection.release();
      if(error){
        throw error;
      }
      //if the user has no sets, redirect to sets
      if (results.length === 0){
        return res.redirect(path);
      }
    });
  });
}
function userCards(res, query, params, path){
  db.getConnection((err, connection) =>{
    if(err){
      throw err;
    }
    //checking to see if user created the set id
    connection.query(query, params, function(error, results){
      connection.release();
      if(error){
        throw error;
      }
      //if no cards yet in the set, render cards with no cards yet to display
      if(results.length === 0){
        return res.render(path, {
          cards: "No set",
          set: params[0]
        });
      }
      //if there are cards, render cards already created
      return res.render(path, {
        cards: results,
        set: params[0]
      });
    });
  });
}
///////

//STUDY query
function studyQuery(res, query, params, path, card_id, nextCard, prevCard){
  db.getConnection((err, connection) =>{
    if(err){
      throw err;
    }
    connection.query(query, params, function(error, results){
      connection.release();
      if(error){
        throw error;
      }
    // if user has created the cards, return the study page
      if(results.length > 0){
        const setLength = results.length;
        return res.render(path, {
          card: results[card_id],
          nextCard: nextCard,
          previous: prevCard,
          setLength: setLength
        });
      }
    });
  });
}
///////

//TEST query
function testQuery(res, query, params, path, card_id, nextCard, prevCard, tempAnswer){
  db.getConnection((err, connection) =>{
    if(err){
      throw err;
    }
    connection.query(query, params, function(error, results){
      connection.release();
      if(error){
        throw error;
      }
    // if user has created the cards, return the test page
      if(results.length > 0){
        const setLength = results.length;
        return res.render(path, {
          card: results[card_id],
          nextCard: nextCard,
          previous: prevCard,
          setLength: setLength,
          answer: tempAnswer,
          userAnswer: tempAnswer,
          correctAnswer: tempAnswer
        });
      }
    });
  });
}
///////

///////
module.exports = {
  updateQuery,
  updateEmailQuery,
  mySetsQuery,
  setCheck,
  userCards,
  studyQuery,
  testQuery,
}
