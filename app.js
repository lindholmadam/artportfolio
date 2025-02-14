require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport  = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(express.urlencoded({extended:true}));




app.use(session({
    secret: "secret",
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize());
app.use(passport.session());



mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => console.log("Connected to DB"))
.catch (console.error);


const userSchema = new mongoose.Schema ({
    username: String,
    password: String
});
userSchema.plugin(passportLocalMongoose);
const User = new mongoose.model("User", userSchema);


passport.use(User.createStrategy());
passport.serializeUser(function(user, done){
    done(null, user.id);
});
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user){
        done(err, user);
    });
});






const imageSchema = new mongoose.Schema({
    title: { type: String, required: true },
    dimensions: String,
    imageUrls: [String],
    description: String,
    tags: String
});
const Image = mongoose.model("Image", imageSchema);

const blogSchema = new mongoose.Schema({
    title: { type: String, required: true },
    text: { type: String, required: true },
    image: String,
    date: { type: Date, default: Date}
});
const Post = mongoose.model("Post", blogSchema);

const printSchema = new mongoose.Schema({
    title: { type: String, required: true },
    printUrl: { type: String, required: true },
    tags: String
});
const Print = mongoose.model("Print", printSchema);

const newsSchema = new mongoose.Schema({
    newdate: String,
    title: String,
    text: String,
    date: {
        type: Date,
        default: Date.now
    }
});
const News = mongoose.model("News", newsSchema);  


app.get("/", async function(req, res){
    const allPosts = await Post.find({}).sort({date:-1}).limit(3);
    const allNews = await News.find({}).sort({date:-1}).limit(3);
    res.render("hem", { allPosts:allPosts, allNews:allNews });
})

app.get("/galleri", function(req, res){

    Image.find({}, function(err, images){
        try {
            res.render("galleri", {allImages: images});
        } catch (err) {
            console.log(err);
        }
    })
})
app.get('/images/:imageId', (req, res) => {
    const requestedImageId = req.params.imageId;

    Image.findById(requestedImageId, function(err, image) {
        res.render("image", {fullImage:image})
    })
})
app.post("/galleri", async function(req, res){
    let imageUrlsArray = await req.body.imageUrl;
    let cleanArray = imageUrlsArray.filter(function(clean) { return clean; });

    const newImage = await new Image ({
        imageUrls: cleanArray,
        title: req.body.imageTitle,
        dimensions: req.body.imageDimensions,
        description: req.body.imageDescription,
        tags: req.body.imageTags
    });
    await newImage.save(function (err) {
        if(!err) {
            res.redirect("/success")
        } else {
            console.log(err);
        }
    })
});

app.get("/blogg", function(req, res){

        Post.find({}, function(error, posts) {
        try {
            res.render ("blogg", {allPosts:posts})
        } catch (error) {
            console.log(error);
        }
    })

})
app.post("/blogg", async function(req, res){
    
    const newPost = await new Post ({
        title: req.body.blogTitle,
        text: req.body.blogText,
        image: req.body.blogImage
    })
    await newPost.save(function (err) {
        if(!err) {
            res.redirect("/success")
        }
    })

});

app.get("/kontakt", function(req, res){
    res.render("kontakt")
})

app.get("/biografi", function(req, res){
    res.render("biografi")
});

app.get("/prints", async function(req, res){

    const allPrints = await Print.find({});
    res.render("prints", { allPrints:allPrints });
    
});
app.get('/prints/:printId', (req, res) => {
    const requestedPrintId = req.params.printId;

    Print.findById(requestedPrintId, function(err, print) {
        res.render("print", {fullPrint:print})
    })
})
app.post("/prints", async function(req, res){
    const newPrint = await new Print ({
        title: req.body.printTitle,
        printUrl: req.body.printUrl,
        tags: req.body.printTags
    });
    await newPrint.save(function (err) {
        if(!err) {
            res.redirect("/success")
        } else {
            console.log(err);
        }
    })
});


app.get('/upload', (req, res) => {
    res.set('Cache-Control', 'no-store');
    
    if(req.isAuthenticated()) {
      res.render('upload');
    } else {
      res.redirect('/login');
    }
}); 

app.post("/upload", async function(req, res){
    const newNews = await new News ({
        newdate: req.body.newsDate,
        title: req.body.newsTitle,
        text: req.body.newsText
    })
    await newNews.save(function (err) {
        if(!err) {
            res.redirect("/success")
        }
    })
});

app.get("/login",function(req,res) {
    res.render("login");
});

app.post("/login", passport.authenticate("local"), function(req, res) {
    const user = new User({
      username: req.body.username,
      password: req.body.password
    });
  
    req.login(user, function(err){
  
      if (err) {
        console.log("There was a login error: " + err);
      } else {
        passport.authenticate("local")(req, res, function(){
          res.redirect("/upload");
        });
      }
    });
});

app.get("/success", function(req,res) {
    res.render('success');
});

app.get("/logout", function(req,res) {
    req.logout();
    res.redirect("/");
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});