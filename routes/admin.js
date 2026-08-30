const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const { isLoggedInAdmin } = require("../middleware.js");
const adminController = require("../controllers/admin.js");

// Admin Authentication Routes
router.get("/login", adminController.renderAdminLogin);
router.post(
  "/login",
  passport.authenticate("local-admin", {
    failureRedirect: "/admin/login",
    failureFlash: true,
  }),
  adminController.loginAdmin,
);

router.get("/logout", adminController.logoutAdmin);

// Admin Dashboard Routes
router.get(
  "/",
  isLoggedInAdmin,
  wrapAsync(adminController.renderAdminDashboard),
);
router.get(
  "/dashboard",
  isLoggedInAdmin,
  wrapAsync(adminController.renderAdminDashboard),
);

// Admin Account Settings Routes (Render Page + Separate Profile & Password Form Actions)
router.get(
  "/settings",
  isLoggedInAdmin,
  wrapAsync(adminController.renderAdminSettings),
);
router.post(
  "/settings/profile",
  isLoggedInAdmin,
  wrapAsync(adminController.updateAdminProfile),
);
router.post(
  "/settings/password",
  isLoggedInAdmin,
  wrapAsync(adminController.updateAdminPassword),
);

// Listings Management (Static routes first)
router.get(
  "/listings",
  isLoggedInAdmin,
  wrapAsync(adminController.renderAdminListings),
);
router.get(
  "/listings/:id",
  isLoggedInAdmin,
  wrapAsync(adminController.renderAdminListingDetails),
);
router.delete(
  "/listings/:id",
  isLoggedInAdmin,
  wrapAsync(adminController.deleteAdminListing),
);

// Users Management (Static / bulk routes MUST come before dynamic :id routes)
router.get(
  "/users",
  isLoggedInAdmin,
  wrapAsync(adminController.renderAdminUsers),
);
router.delete(
  "/users/delete-selected",
  isLoggedInAdmin,
  wrapAsync(adminController.deleteAdminSelectedUsers),
);
router.get(
  "/users/:id",
  isLoggedInAdmin,
  wrapAsync(adminController.renderAdminUserDetails),
);
router.patch(
  "/users/:id/status",
  isLoggedInAdmin,
  wrapAsync(adminController.toggleUserAccountStatus),
);
router.delete(
  "/users/:id",
  isLoggedInAdmin,
  wrapAsync(adminController.deleteAdminUser),
);

// Chat & Broadcast Management (Static routes before dynamic /:userId)
router.get(
  "/chats",
  isLoggedInAdmin,
  wrapAsync(adminController.renderAdminChats),
);
router.post(
  "/chats/send",
  isLoggedInAdmin,
  wrapAsync(adminController.sendBroadcast),
);
router.post(
  "/chats/delete-all-system",
  isLoggedInAdmin,
  wrapAsync(adminController.deleteAllSystemChats),
);

// Specific User Chat Deletion Routes (Placed before generic /chats/user/:userId)
router.delete(
  "/chats/user/:userId/delete-selected",
  isLoggedInAdmin,
  wrapAsync(adminController.deleteAdminSelectedChatMessages),
);
router.post(
  "/chats/user/:userId/delete-all",
  isLoggedInAdmin,
  wrapAsync(adminController.deleteAllAdminChatMessages),
);
router.delete(
  "/chats/user/:userId/message/:messageId",
  isLoggedInAdmin,
  wrapAsync(adminController.deleteAdminChatMessage),
);

router.get(
  "/chats/user/:userId",
  isLoggedInAdmin,
  wrapAsync(adminController.renderAdminUserChat),
);
router.post(
  "/chats/user/:userId",
  isLoggedInAdmin,
  wrapAsync(adminController.sendAdminUserMessage),
);

module.exports = router;
