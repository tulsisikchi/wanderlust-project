const Listing = require("./models/listing");

module.exports.isLoggedIn = (req, res, next) => {
    if(!req.isAuthenticated()) {
        req.flash("error", "You must be logged in!");
        return res.redirect("/login");
    }
    next();
};

module.exports.isOwner = async (req, res, next) => {
    let { id } = req.params;

    const listing = await Listing.findById(id);

    if(!listing.owner.equals(req.user._id)) {
        req.flash("error", "You are not the owner of this listing!");
        return res.redirect(`/listings/${id}`);
    }

    next();
};

const Review = require("./models/review");

module.exports.isReviewAuthor = async (req, res, next) => {

    let { reviewId, id } = req.params;

    let review = await Review.findById(reviewId);

    if(!review.author.equals(req.user._id)) {

        req.flash("error", "You are not the author of this review!");

        return res.redirect(`/listings/${id}`);
    }

    next();
};