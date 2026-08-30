const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/expressError.js");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const helmet = require("helmet");
const hpp = require("hpp");
const rateLimit = require("express-rate-limit");
const User = require("./models/user.js");
const Admin = require("./models/admin.js");
const Message = require("./models/message.js");

// Routers
const listingRouter = require("./routes/listings.js");
const reviewRouter = require("./routes/reviews.js");
const userRouter = require("./routes/users.js");
const adminRouter = require("./routes/admin.js");

const dbUrl = process.env.ATLASDB_URL;

async function main() {
  await mongoose.connect(dbUrl);
}
main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));
app.use(cookieParser());

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
app.use(hpp());

// Custom NoSQL Injection Sanitization (Safe for Express getters)
const sanitizeValue = (val) => {
  if (val && typeof val === "object") {
    for (let key in val) {
      if (key.startsWith("$") || key.includes(".")) {
        delete val[key];
      } else {
        sanitizeValue(val[key]);
      }
    }
  }
  return val;
};

app.use((req, res, next) => {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.params) req.params = sanitizeValue(req.params);
  if (req.query) {
    for (let key in req.query) {
      if (key.startsWith("$") || key.includes(".")) {
        delete req.query[key];
      } else {
        sanitizeValue(req.query[key]);
      }
    }
  }
  next();
});

// Rate Limiting to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // Max 10 attempts per 10 mins
  message: "Too many login/auth attempts from this IP, please try again later.",
});
app.use("/login", authLimiter);
app.use("/admin/login", authLimiter);

const store = new MongoStore({
  mongoUrl: dbUrl,
  crypto: {
    secret: process.env.SECRET,
  },
  touchAfter: 24 * 3600,
});

store.on("error", (err) => {
  console.log("ERROR in MONGO SESSION STORE", err);
});

const sessionOption = {
  store: store,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

app.use(session(sessionOption));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

// Configure Passport Strategies for User and Admin
passport.use(new LocalStrategy(User.authenticate()));
passport.use("local-admin", new LocalStrategy(Admin.authenticate()));

// Dual Model Serialization
passport.serializeUser((user, done) => {
  const type = user instanceof Admin ? "Admin" : "User";
  done(null, { id: user.id, type });
});

passport.deserializeUser(async (obj, done) => {
  try {
    if (obj.type === "Admin") {
      let admin = await Admin.findById(obj.id);
      done(null, admin);
    } else {
      let user = await User.findById(obj.id);
      done(null, user);
    }
  } catch (err) {
    done(err);
  }
});

app.use(async (req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  res.locals.crrUser = req.user;

  res.locals.unreadNotifCount = 0;
  res.locals.msgCount = 0;

  if (req.user && !(req.user instanceof Admin)) {
    try {
      const admins = await Admin.find({}, "_id");
      const adminIds = admins.map((a) => a._id);

      // Strict Unread Notices Count (Excluding deleted ones by this user)
      res.locals.unreadNotifCount = await Message.countDocuments({
        receiver: req.user._id,
        isSeen: false,
        deletedBy: { $ne: req.user._id },
        $or: [{ isBroadcast: true }, { sender: { $in: adminIds } }],
      });

      // Strict Unread Messages Count (Only regular user-to-user messages)
      const count = await Message.countDocuments({
        receiver: req.user._id,
        isSeen: false,
        deletedBy: { $ne: req.user._id },
        isBroadcast: { $ne: true },
        sender: { $nin: adminIds },
      });
      res.locals.msgCount = count > 99 ? "99+" : count;
    } catch (err) {
      res.locals.unreadNotifCount = 0;
      res.locals.msgCount = 0;
    }
  }
  next();
});

// Route Mounts
app.use("/listings", listingRouter);
app.use("/listings", reviewRouter);
app.use("/", userRouter);
app.use("/admin", adminRouter);

app.use((req, res, next) => {
  next(new ExpressError(404, "Page Not Found"));
});

app.use((err, req, res, next) => {
  let { statusCode = 500, message = "Something went wrong" } = err;

  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid Resource ID format.";
  }

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((el) => el.message)
      .join(", ");
  }

  if (req.xhr || req.headers.accept?.includes("json")) {
    return res.status(statusCode).json({ success: false, error: message });
  }

  // Ensure all layout locals are fully populated during error rendering
  res.locals.success = [];
  res.locals.error = [];
  res.locals.crrUser = req.user || null;
  res.locals.currUser = req.user || null;
  res.locals.unreadNotifCount = 0;
  res.locals.msgCount = 0;

  res.status(statusCode).render("error.ejs", { message });
});

const server = app.listen("8080", () => {
  console.log("server is listening to port 8080");
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! Shutting down gracefully...");
  console.error(err.name, err.message);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! Shutting down gracefully...");
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
