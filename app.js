const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const _ = require("lodash");

const bcrypt = require('bcrypt');
const saltRounds = 10;

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

var loggedIn = false;
var currentUser = null;

mongoose.connect("mongodb+srv://admin-rohan:RohanRaju123$@cluster0-lwpd9.mongodb.net/UsersDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const postsSchema = new mongoose.Schema({
  heading: String,
  text: String
});

const usersSchema = new mongoose.Schema ({
  username: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 255,
    unique: true
  },
  password: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 255
  },
  posts: [postsSchema]
});


const Post = mongoose.model("Post", postsSchema);
const User = mongoose.model("User", usersSchema);


app.get("/", function(req, res) {
  if(currentUser === null) {
    res.render("home");
  } else {
    res.redirect("/user/" + currentUser);
  }

});

app.get("/register", function(req, res) {
  res.render("register");
});

app.post("/register", function(req, res) {
  User.findOne({username: req.body.username}, function(err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        res.render("error",{error: "User already exists! Please login directly!"});
      } else {
        bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
          const user = new User ({
            username: req.body.username,
            password: hash,
            posts: []
          });
          user.save(function(err){
            if(!err) {
              loggedIn = true;
              currentUser = req.body.username;
              res.redirect("/");
            }

        });
      });
      }
    }
  });
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.post("/login", function(req, res) {
  User.findOne({username: req.body.username}, function(err, foundUser) {
    if(err) {
      console.log(err);
    } else {
      if(foundUser) {
        bcrypt.compare(req.body.password, foundUser.password , function(err, result) {
          if (result) {
            loggedIn = true;
            currentUser = req.body.username;
            res.redirect("/user/" + req.body.username);
          } else {
            res.send("Incorrect Password");
          }
        });
      }
    }
  });
});

app.get("/user/:var", function(req, res) {
  let uname = req.params.var;
  if(loggedIn && currentUser === uname) {
    User.findOne({username: uname}, function(err, foundUser) {
      if(err) {
        console.log(err);
      } else {
        if(foundUser) {
          const posts = foundUser.posts;
          res.render("user-page",{posts : posts});
        }
      }
    });
  } else {
    res.render("error",{error: "Please log in!"});
  }
});

app.get("/compose", function(req, res) {
  if(loggedIn) {
    res.render("compose",{currentUser: currentUser, heading: "", text: ""});
  } else {
    res.render("error",{error: "Please log in!"});
  }
});

app.post("/compose", function(req, res) {
  const post = {
    heading: req.body.postTitle,
    text: req.body.postBody
  };
  User.findOne({username: currentUser}, function(err, foundUser) {
    foundUser.posts.push(post);
    foundUser.save(function(err) {
      if(!err) {
        res.redirect("/user/" + currentUser);
      }
    });
  })
});


app.get("/posts/:postName", function(req, res) {
  if(loggedIn) {
    const requestedTitle = _.lowerCase(req.params.postName);
    User.findOne({username: currentUser}, function(err, foundUser ){
      foundUser.posts.forEach(function(post) {
        const storedTitle = _.lowerCase(post.heading);
        if (storedTitle === requestedTitle) {
          res.render("post", {
            heading: post.heading,
            text: post.text
          });
        }
      });
    });
  } else {
    res.render("error",{error: "Please log in!"});
  }
});


app.get("/logout", function(req, res) {
  currentUser = null;
  loggedIn = false;
  res.redirect("/");
});

app.get("/edit/:var", function(req, res) {
  if (loggedIn){
    const requestedTitle = _.lowerCase(req.params.var);
    User.findOne({username: currentUser}, function(err, foundUser ){
      foundUser.posts.forEach(function(post) {
        const storedTitle = _.lowerCase(post.heading);
        if (storedTitle === requestedTitle) {
          const pheading = post.heading;
          const ptext = post.text;
          const index = foundUser.posts.indexOf(post);
          foundUser.posts.splice(index,1);
          foundUser.save(function(err){
            if(!err) {
              res.render("compose", {currentUser: currentUser, heading: pheading, text: ptext});
            }
          })

        }
      });
    });
  } else {
    res.render("error",{error: "Please log in!"});
  }

});

app.get("/delete/:var", function(req, res) {
  if (loggedIn){
    const requestedTitle = _.lowerCase(req.params.var);
    User.findOne({username: currentUser}, function(err, foundUser ){
      foundUser.posts.forEach(function(post) {
        const storedTitle = _.lowerCase(post.heading);
        if (storedTitle === requestedTitle) {
          const pheading = post.heading;
          const ptext = post.text;
          const index = foundUser.posts.indexOf(post);
          foundUser.posts.splice(index,1);
          foundUser.save(function(err){
            if(!err) {
              res.redirect("/");
            }
          });
        }
      });
    });
  } else {
    res.render("error",{error: "Please log in!"});
  }
});


let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port);
