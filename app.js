if (typeof(PhusionPassenger) !== 'undefined') {
    PhusionPassenger.configure({ autoInstall: false });
}

require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport  = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const { SitemapStream, streamToPromise } = require('sitemap')
const { createGzip } = require('zlib')
const { Readable } = require('stream')

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



mongoose.connect(`mongodb+srv://lindholmadam:lindholmadam@cluster0.petbu.mongodb.net/artbittebrunDB`)
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


let sitemap

app.get('/sitemap.xml', function(req, res) {
    res.header('Content-Type', 'application/xml');
    res.header('Content-Encoding', 'gzip');
    // if we have a cached entry send it
    if (sitemap) {
      res.send(sitemap)
      return
    }
  
    try {
      const smStream = new SitemapStream({ hostname: 'https://artbittebrun.se/' })
      const pipeline = smStream.pipe(createGzip())
  
      // pipe your entries or directly write them.
      smStream.write({ url: '/galleri/',  changefreq: 'weekly', priority: 0.8 })
      smStream.write({ url: '/blogg/',  changefreq: 'daily', priority: 0.8 })
      smStream.write({ url: '/prints/',  changefreq: 'monthly',  priority: 0.6 })
      smStream.write({ url: '/kontakt/',  changefreq: 'monthly',  priority: 0.5 })
      smStream.write({ url: '/biografi/',  changefreq: 'monthly',  priority: 0.5 })
      smStream.write({ url: '/images/628e5b500693efa314bd31de/' })
      smStream.write({ url: '/images/628e5aae0693efa314bd31d9/' })
      smStream.write({ url: '/images/628e5a100693efa314bd31d4/' })
      smStream.write({ url: '/images/628e59820693efa314bd31cf/' })
      smStream.write({ url: '/images/628e55cd0693efa314bd31b9/' })
      smStream.write({ url: '/images/628e55640693efa314bd31b4/' })
      smStream.write({ url: '/images/628e54c00693efa314bd31af/' })
      smStream.write({ url: '/images/628e542a0693efa314bd31aa/' })
      smStream.write({ url: '/images/628e539c0693efa314bd31a5/' })
      smStream.write({ url: '/images/628e534f0693efa314bd31a0/' })
      smStream.write({ url: '/images/628e527e0693efa314bd319b/' })
      smStream.write({ url: '/images/628e51b90693efa314bd3196/' })
      smStream.write({ url: '/images/628e50870693efa314bd3191/' })
      smStream.write({ url: '/images/628e4ffd0693efa314bd318c/' })
      smStream.write({ url: '/images/628e4eb10693efa314bd3180/' })
      smStream.write({ url: '/images/628e4df20693efa314bd317b/' })
      smStream.write({ url: '/images/628e4d3c0693efa314bd3176/' })
      smStream.write({ url: '/images/628e4cc20693efa314bd3171/' })
      smStream.write({ url: '/images/628e4c120693efa314bd316c/' })
      smStream.write({ url: '/images/628e4b710693efa314bd3167/' })


      streamToPromise(pipeline).then(sm => sitemap = sm)
      smStream.end()
      pipeline.pipe(res).on('error', (e) => {throw e})
    } catch (e) {
      console.error(e)
      res.status(500).end()
    }
})


// if (typeof(PhusionPassenger) !== 'undefined') {
//     app.listen('passenger');
// } else {
//     app.listen(40420);
// }

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});