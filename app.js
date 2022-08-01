//jshint esversion:6
require('dotenv').config()
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const flash = require('connect-flash');

const PORT = process.env.PORT || 3000;

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('<mongoDB Atlas DB Url>', {useNewUrlParser : true});


// SCHEMA DEFINATIONS -----------------------------
const blogSchema = new mongoose.Schema({
  title: String,
  content: String,
  id: String,
  username: String
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String
})
userSchema.plugin(passportLocalMongoose);

//-------------------------------------------------

// MODALS -----------------------------------------
const Blog = new mongoose.model('Blog', blogSchema);
const User = new mongoose.model('User', userSchema);

//-------------------------------------------------

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get('/', function(req, res){
  if(req.isAuthenticated()){
    console.log(req.user);
    res.redirect('/home');
  }
  else{
    res.render('landing');
  }
})

app.get('/home', function(req,res){
  if(req.isAuthenticated()){
    Blog.find({username: req.user.username}, function(err, result){
      if(err){
        console.log('Failed to get the results, because '+ err);
      } else{
        const posts = result;
        res.render('home', {postsArray: posts, username: req.user.username});
      }
    });
  }
  else{
    res.redirect('/login');
  }
})

// LOGIN ROUTE --------------------------------
app.get('/login', function(req, res){
  res.render('loginPage');
})

app.post('/login', function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err){
    if(err){
      console.log(err);
    }
    else{
      passport.authenticate("local")(req, res, function(){
        res.redirect('/home');
      })
    }
  })
})

//---------------------------------------------

// REGISTER ROUTE ------------------------------
app.get('/register', function(req, res){
  const errMessage = req.flash('registerError');
  console.log(errMessage);
  res.render('register',{errMessage});
})

app.post('/register', function(req, res){
  User.register({username:req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      req.flash('registerError', err);
      res.redirect('/register');
    }
    else {
      passport.authenticate("local")(req, res, function(){
        res.redirect('/home');
      })
    }
  })
});

//---------------------------------------------

// LOGOUT ROUTE -------------------------------
app.get('/logout', function(req, res){
  req.logout(function(err){
    if(err){
      console.log(err);
    }
    else{
      res.redirect('/login');
    }
  });
})

//---------------------------------------------

// COMPOSE ROUTE ------------------------------
app.get('/compose', function(req, res){
  if(req.isAuthenticated()){
    res.render('compose', {username: req.user.username});
  }
  else{
    res.render('/login');
  }
})

app.post('/compose', function(req, res){
  if(req.isAuthenticated()){
    const title = req.body.postTitle;
    let id = _.lowerCase(title);
    let timeStamp = new Date().getTime();
    id = id.trim().split(" ").join("-") + timeStamp;
    let blogObj = new Blog({
      title: req.body.postTitle,
      content: req.body.postBody,
      id: id,
      username: req.user.username
    });
    blogObj.save(function(err, blog){
      if(err){
        console.log('Failed to save data:- '+err);
      } else{
        console.log('Saved the blog '+blog.title+ ' successfully');
      }
    });
    res.redirect('/home');
  }
  else{
    res.redirect('/login');
  }
})

//---------------------------------------------


// POSTS ROUTE ------------------------------
app.get('/posts/:postId', function(req, res){
  let postId = req.params.postId;
  let obj;
  let flag = false;
  Blog.findOne({_id: postId}, function(err, result){
    if(err){
      console.log('error retrieving the blog:- '+err);
    } else{
        res.render('post', {postObj: result, username: req.user.username});
    }
  })
})

app.get('/posts/:postId/edit', function(req, res){
  if(req.isAuthenticated()){
    let postId = req.params.postId;
    let obj;
    let flag = false;
    Blog.findOne({_id: postId}, function(err, result){
      if(err){
        console.log('error retrieving the blog:- '+err);
      } else{
          res.render('postEdit', {postObj: result, username: req.user.username});
      }
    })
  }
})

app.post('/posts/:postId/edit', function(req, res){
  if(req.isAuthenticated()){
    let updateObj = {title: req.body.postTitle, content: req.body.postBody};
    Blog.findByIdAndUpdate(req.params.postId, updateObj, function(err, docs){
      if(err){
        cosnole.log('some error:- '+err);
      }
      else{
          res.redirect('/home');
      }
    });
  }
  else{
    res.redirect('/login');
  }
})

app.get('/posts/:postId/delete', function(req, res){
  let postId = req.params.postId;
  Blog.remove({_id: postId}, function(err, result){
    if(err){
      console.log('error while deleting the blog:- '+err);
    } else{
        res.redirect('/home');
    }
  })
})

//---------------------------------------------

app.get('/about', function(req, res){
  res.render('about',{aboutContent: aboutContent});
})

app.get('/contact', function(req, res){
  res.render('contact', {contactContent: contactContent})
})

app.listen(PORT, function() {
  console.log("Server started on port "+PORT);
});
