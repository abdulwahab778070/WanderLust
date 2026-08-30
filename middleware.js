const Listing = require("./models/listing.js");
const { listingSchema } = require("./schema.js");
const { reviewSchema } = require("./schema.js");
const ExpressError = require("./utils/expressError.js");
const Review = require("./models/review.js");

module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    if (req.originalUrl.includes("/reviews")) {
      req.session.redirectUrl = req.originalUrl.split("/reviews")[0];
    } else {
      req.session.redirectUrl = req.originalUrl;
    }

    req.flash("error", "You must be logged in first!");
    return res.redirect("/login");
  }

  // Check if user account is suspended or deactivated
  if (req.user && req.user.status && req.user.status !== "active") {
    const statusMsg =
      req.user.status === "suspended"
        ? "Your account has been suspended by the administrator."
        : "Your account has been deactivated.";

    return req.logout((err) => {
      if (err) {
        return next(err);
      }
      req.flash("error", statusMsg);
      return res.redirect("/login");
    });
  }

  next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = req.session.redirectUrl;
  }
  next();
};

module.exports.isOwner = async (req, res, next) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing not found!");
    return res.redirect("/listings");
  }
  if (!listing.owner.equals(res.locals.crrUser._id)) {
    req.flash("error", "You don't have permission for this task");
    return res.redirect(`/listings/${id}`);
  }
  next();
};

module.exports.validateListing = (req, res, next) => {
  let { error } = listingSchema.validate(req.body);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

module.exports.validateReview = (req, res, next) => {
  let { error } = reviewSchema.validate(req.body);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

module.exports.isReviewAuthor = async (req, res, next) => {
  let { id, reviewId } = req.params;
  const review = await Review.findById(reviewId);
  if (!review) {
    req.flash("error", "Review not found!");
    return res.redirect(`/listings/${id}`);
  }
  if (!review.author.equals(res.locals.crrUser._id)) {
    req.flash("error", "You don't have permission for this task");
    return res.redirect(`/listings/${id}`);
  }
  next();
};

module.exports.isLoggedInAdmin = (req, res, next) => {
  if (
    req.isAuthenticated() &&
    req.user &&
    req.user.constructor.modelName === "Admin"
  ) {
    return next();
  }
  req.flash("error", "You must be logged in as an Admin to access this page!");
  res.redirect("/admin/login");
};
