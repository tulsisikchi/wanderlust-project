if(process.env.NODE_ENV != "production") {
    require("dotenv").config();
}

const Review = require("./models/review");
const session = require("express-session");
const flash = require("connect-flash");

const passport = require("passport");
const LocalStrategy = require("passport-local");

const User = require("./models/user");

const express = require("express");
const app = express();

const mongoose = require("mongoose");
const Listing = require("./models/listing.js");

const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");

const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");

const { listingSchema } = require("./schema.js");
const {
    isLoggedIn,
    isOwner,
    isReviewAuthor,
} = require("./middleware.js");

const multer = require("multer");

const { storage } = require("./cloudConfig");

const upload = multer({ storage });

const MONGO_URL = process.env.ATLASDB_URL;

main()
.then(() => {
    console.log("connected to DB");
})
.catch((err) => {
    console.log(err);
});

async function main() {
    await mongoose.connect(MONGO_URL);
}

// VIEW ENGINE
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.engine("ejs", ejsMate);

// MIDDLEWARE
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "/public")));

// SESSION CONFIG
const sessionOptions = {
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
};

app.use(session(sessionOptions));
app.use(flash());

// PASSPORT CONFIG
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// CURRENT USER MIDDLEWARE
app.use((req, res, next) => {

    res.locals.success = req.flash("success");

    res.locals.error = req.flash("error");

    res.locals.currUser = req.user;

    next();
});

// ROOT ROUTE
app.get("/", (req, res) => {
    res.redirect("/listings");
});

// ======================
// AUTH ROUTES
// ======================

// SIGNUP PAGE
app.get("/signup", (req, res) => {
    res.render("users/signup.ejs");
});

// SIGNUP ROUTE
app.post("/signup", async (req, res) => {
    try {
        let { username, password } = req.body;

        const newUser = new User({ username });

        const registeredUser = await User.register(newUser, password);

        console.log(registeredUser);

        res.redirect("/listings");

    } catch(err) {
        console.log(err);
        res.send(err);
    }
});

// LOGIN PAGE
app.get("/login", (req, res) => {
    res.render("users/login.ejs");
});

// LOGIN ROUTE
app.post("/login",
    passport.authenticate("local", {
        failureRedirect: "/login",
        failureFlash: true,
    }),
    async (req, res) => {
        req.flash("success", "Welcome back!");
        res.redirect("/listings");
    }
);

// LOGOUT ROUTE
app.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if(err) {
            return next(err);
        }

        res.redirect("/listings");
    });
});

// ======================
// JOI VALIDATION
// ======================

const validateListing = (req, res, next) => {

    let { error } = listingSchema.validate(req.body);

    if(error) {
        let errMsg = error.details.map((el) => el.message).join(",");

        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};

// ======================
// LISTING ROUTES
// ======================

// INDEX ROUTE
app.get("/listings",
    wrapAsync(async (req, res) => {

    let { search } = req.query;

    let allListings;

    if(search && search.trim() !== "") {

        allListings = await Listing.find({

            $or: [

                {
                    title: {
                        $regex: search,
                        $options: "i",
                    },
                },

                {
                    location: {
                        $regex: search,
                        $options: "i",
                    },
                },

                {
                    country: {
                        $regex: search,
                        $options: "i",
                    },
                },

            ],

        });

    } else {

        allListings = await Listing.find({});
    }

    res.render("listings/index", {
        allListings,
    });
}));

// NEW ROUTE
app.get("/listings/new",
    isLoggedIn,
    (req, res) => {

    res.render("listings/new.ejs");
});

// SHOW ROUTE
app.get("/listings/:id",
    wrapAsync(async (req, res) => {

    let { id } = req.params;

    const listing = await Listing.findById(id)
    .populate({
        path: "reviews",
            populate: {
                path: "author",
            }
    });

    res.render("listings/show", { listing });
}));

app.post("/listings/:id/reviews",
    isLoggedIn,

    async (req, res) => {

    let listing = await Listing.findById(req.params.id);

    let newReview = new Review(req.body.review);

    newReview.author = req.user._id;

    listing.reviews.push(newReview);

    await newReview.save();

    await listing.save();

    res.redirect(`/listings/${listing._id}`);
});

app.delete(
    "/listings/:id/reviews/:reviewId",

    isLoggedIn,
    isReviewAuthor,

    async (req, res) => {

    let { id, reviewId } = req.params;

    await Listing.findByIdAndUpdate(id, {
        $pull: { reviews: reviewId },
    });

    await Review.findByIdAndDelete(reviewId);

    res.redirect(`/listings/${id}`);
});

// CREATE ROUTE
app.post("/listings",
    isLoggedIn,
    upload.single("listing[image]"),
    validateListing,

    wrapAsync(async (req, res) => {

    const newListing = new Listing(req.body.listing);
    newListing.image = {
    url: req.file.path,
    filename: req.file.filename,
};

    // SAVE CURRENT USER AS OWNER
    newListing.owner = req.user._id;

    await newListing.save();

    res.redirect("/listings");
}));

// EDIT ROUTE
app.get("/listings/:id/edit",
    isLoggedIn,
    isOwner,

    wrapAsync(async (req, res) => {

    let { id } = req.params;

    const listing = await Listing.findById(id);

    if(!listing) {
        return res.status(404).send("Listing not found");
    }

    res.render("listings/edit", { listing });
}));

// UPDATE ROUTE
app.put("/listings/:id",
    isLoggedIn,
    isOwner,
    validateListing,

    wrapAsync(async (req, res) => {

    if(!req.body.listing) {
        throw new ExpressError(400, "Send valid data");
    }

    let { id } = req.params;

    await Listing.findByIdAndUpdate(id, {
        ...req.body.listing
    });

    res.redirect(`/listings/${id}`);
}));

// DELETE ROUTE
app.delete("/listings/:id",
    isLoggedIn,
    isOwner,

    wrapAsync(async (req, res) => {

    let { id } = req.params;

    await Listing.findByIdAndDelete(id);

    res.redirect("/listings");
}));

// ERROR HANDLER
app.use((err, req, res, next) => {

    let {
        statusCode = 500,
        message = "Something went wrong!"
    } = err;

    res.status(statusCode).render("error.ejs", { message });
});

// SERVER
const port = process.env.PORT || 8080;

app.listen(port, () => {
    console.log(`server is listening to port ${port}`);
});