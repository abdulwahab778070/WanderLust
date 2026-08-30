const Listing = require("../models/listing");
const Message = require("../models/message");
const { cloudinary } = require("../cloudConfig.js");

const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapToken = process.env.MAP_TOKEN;
const geoCodingClient = mbxGeocoding({ accessToken: mapToken });

module.exports.index = async (req, res) => {
  const { category } = req.query;
  let filter = {};

  if (category) {
    filter.category = category;
  }

  const allListings = await Listing.find(filter).sort({ date: -1 });
  res.render("listings/index.ejs", { allListings, selectedCategory: category });
};

module.exports.searchListings = async (req, res) => {
  let { q, category, location, country, minPrice, maxPrice, sort } = req.query;

  let filter = {};

  if (q && q.trim() !== "") {
    let regex = new RegExp(q.trim(), "i");
    filter.$or = [
      { title: regex },
      { location: regex },
      { country: regex },
      { description: regex },
      { category: regex },
    ];
  }

  if (category && category !== "All") {
    filter.category = category;
  }

  if (location && location.trim() !== "") {
    filter.location = new RegExp(location.trim(), "i");
  }

  if (country && country.trim() !== "") {
    filter.country = new RegExp(country.trim(), "i");
  }

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  let sortOption = { date: -1 };
  if (sort === "price_asc") sortOption = { price: 1 };
  if (sort === "price_desc") sortOption = { price: -1 };
  if (sort === "date_asc") sortOption = { date: 1 };

  const listings = await Listing.find(filter).sort(sortOption);

  res.render("listings/search.ejs", {
    listings,
    query: { q, category, location, country, minPrice, maxPrice, sort },
  });
};

module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

module.exports.createListing = async (req, res, next) => {
  let response = await geoCodingClient
    .forwardGeocode({
      query: req.body.listing.location,
      limit: 1,
    })
    .send();

  let url = req.file.path;
  let filename = req.file.filename;
  const newListing = new Listing(req.body.listing);
  newListing.owner = req.user._id;
  newListing.image = { url, filename };
  newListing.geometry = response.body.features[0].geometry;
  await newListing.save();
  req.flash("success", "New listing created");
  res.redirect("/listings");
};

module.exports.showListing = async (req, res) => {
  let { id } = req.params;
  let listing = await Listing.findById(id)
    .populate({
      path: "reviews",
      options: { sort: { createdAt: -1 } },
      populate: {
        path: "author",
      },
    })
    .populate("owner");

  if (!listing) {
    req.flash("error", "Listing doesn't exist");
    return res.redirect("/listings");
  }

  if (req.user) {
    listing.reviews.sort((a, b) => {
      const isAUser = a.author && a.author._id.equals(req.user._id);
      const isBUser = b.author && b.author._id.equals(req.user._id);

      if (isAUser && !isBUser) return -1;
      if (!isAUser && isBUser) return 1;
      return 0;
    });
  }
  res.render("listings/show.ejs", { listing, mapToken: process.env.MAP_TOKEN });
};

module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  let listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing doesn't exist");
    return res.redirect("/listings");
  }

  let orignalImageUrl = listing.image.url;
  orignalImageUrl = orignalImageUrl.replace("/upload", "/upload/w_250");
  res.render("listings/edit.ejs", { listing, orignalImageUrl });
};

module.exports.updateListing = async (req, res) => {
  let { id } = req.params;
  const editListing = req.body.listing;

  if (editListing.location) {
    let response = await geoCodingClient
      .forwardGeocode({
        query: editListing.location,
        limit: 1,
      })
      .send();
    editListing.geometry = response.body.features[0].geometry;
  }

  let listing = await Listing.findByIdAndUpdate(id, editListing, {
    runValidators: true,
  });

  if (typeof req.file !== "undefined") {
    if (listing.image && listing.image.filename) {
      await cloudinary.uploader.destroy(listing.image.filename);
    }

    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = { url, filename };
    await listing.save();
  }

  req.flash("success", "Listing Updated");
  res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  if (deletedListing && deletedListing.image && deletedListing.image.filename) {
    await cloudinary.uploader.destroy(deletedListing.image.filename);
  }

  req.flash("success", "Listing Deleted");

  // Check for redirectUrl parameter (e.g. from user profile listings page)
  let redirectUrl = req.query.redirectUrl || "/listings";
  res.redirect(redirectUrl);
};

// Direct Message Initiator (Redirects straight to chat thread without popup)
module.exports.initiateDirectMessage = async (req, res) => {
  let { id } = req.params;
  let listing = await Listing.findById(id);

  if (!listing) {
    req.flash("error", "Listing doesn't exist");
    return res.redirect("/listings");
  }

  if (listing.owner.equals(req.user._id)) {
    req.flash("error", "You cannot send a message to your own listing!");
    return res.redirect(`/listings/${id}`);
  }

  // Check if conversation thread already exists
  let existingMsg = await Message.findOne({
    listing: id,
    $or: [
      { sender: req.user._id, receiver: listing.owner },
      { sender: listing.owner, receiver: req.user._id },
    ],
  });

  if (existingMsg) {
    return res.redirect(`/profile/messages/${existingMsg._id}`);
  }

  // If no conversation exists, create an initial starter message thread
  const newMsg = new Message({
    sender: req.user._id,
    receiver: listing.owner,
    listing: id,
    message: "Hi! I am interested in this property.",
    senderContact: req.user.contact,
  });

  await newMsg.save();
  res.redirect(`/profile/messages/${newMsg._id}`);
};
