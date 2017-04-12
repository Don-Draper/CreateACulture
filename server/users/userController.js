var jwt = require('jwt-simple');
var User = require('./userModel.js');
var UserCategory = require('./userCategoriesModel.js');
var mongoose = require('mongoose');
var Q = require('q');

var findUser = Q.nbind(User.findOne, User);
var createUser = Q.nbind(User.create, User);
var createUserCategory = Q.nbind(UserCategory.create, UserCategory);
var findOneAndChange = Q.nbind(UserCategory.findOneAndUpdate, UserCategory);
var findUserAndChange = Q.nbind(User.findOneAndUpdate, User);

var categories = ['Faith', 'Hope', 'Kindness', 'Fortitude', 'Diligence', 
                  'Prudence', 'Temperance'];

module.exports = {
  signin: function (req, res, next) {
    console.log("this should be a user " + req.body.username)
    var username = req.body.username;
    var password = req.body.password;

    findUser({username: username})
      .then(function (user) {
        if (!user) {
          next(new Error('User does not exist'));
        } else {
          return user.comparePassword(password)
            .then(function (foundUser) {
              if (foundUser) {
                var token = jwt.encode(user, 'secret');
                console.log("this is the users token " + token);
                res.json({token: token, username: username});
              } else {
                return next(new Error('No user'));
              }
            });
        }
      })
      .fail(function (error) {
        next(error);
      });
  },

  signup: function (req, res, next) {
    console.log("this is the username we want " + req.body.username)
    var username = req.body.username;
    var password = req.body.password;
    // check to see if user already exists
    findUser({username: username})
      .then(function (user) {
        if (user) {
          next(new Error('user already exists!'));
          console.log('user already exists!');
        } else {
          // make a new user
          return createUser({
            username: username,
            password: password
          });
        }
      })
      .then(function (user) {
        // create token to send back for auth
        var token = jwt.encode(user, 'secret');
        res.send(JSON.stringify({token: token, user: username}));
        console.log("this is the new user token " + token)
      })
      .then(function (user) {
        if (user) {
          next(new Error('user already exists!'));
          console.log('user already exists!');
        } else {
          categories.forEach(function(cat){
            return createUserCategory({
              username: username,
              category: cat
            });      
          });
        }
      })
      .fail(function (error) {
        next(error);
      });
  },

  checkAuth: function (req, res, next) {
    console.log('Request in CheckAuth: ', req);
    var token = req.headers['x-access-token'];
    if (!token) {
      next(new Error('No token'));
    } else {
      var user = jwt.decode(token, 'secret');
      findUser({username: user.username})
        .then(function (foundUser) {
          if (foundUser) {
            res.send(200);
          } else {
            res.send(401);
          }
        })
        .fail(function (error) {
          next(error);
        });
    }
  }, 

  // The two functions below look very similar. The first 
  // is for the initial push of ARRAY of beliefs into the 
  // user's mainBeliefs field

  addMainBeliefs: function(req, res) {
    console.log("Request.body: ", req.body);
    findUserAndChange(
      {username: req.body.username},
      {$pushAll: {mainBeliefs: req.body.beliefs}},
      {safe: true, upsert: true}
    ).catch(function(err){
      console.log(err);
    });
  },

  // The one below is for adding a SINGLE belief to the 
  // user's mainBeliefs field

  addMainBelief: function(req, res) {
    console.log("Request.body: ", req.body);
    findUserAndChange(
      {username: req.body.username},
      {$push: {mainBeliefs: req.body.belief}},
      {safe: true, upsert: true}
    ).catch(function(err){
      console.log(err);
    });
  },

  addUserBelief: function(req, res) {
    findOneAndChange(
      {username: req.body.username, name: req.body.category}, 
      {$push: {beliefs: req.body.belief}},
      {safe: true, upsert: true}
    ).catch(function(err){
      console.log(err);
    });
  },

  addUserCategory: function(req, res) {
    console.log("reached addUserCategory function");
    console.log('req.body: ', req.body);
    createUserCategory({
      username: req.body.username,
      name: req.body.category
    }).catch(function(err){
      console.log(err);
    });
  }

};

