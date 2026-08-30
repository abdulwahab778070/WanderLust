const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const { isLoggedIn, saveRedirectUrl } = require("../middleware.js");
const userController = require("../controllers/users.js");

router
  .route("/singup")
  .get(userController.renderSingupForm)
  .post(saveRedirectUrl, wrapAsync(userController.singup));

router
  .route("/login")
  .get(userController.renderLoginForm)
  .post(
    saveRedirectUrl,
    passport.authenticate("local", {
      failureRedirect: "/login",
      failureFlash: true,
    }),
    userController.login,
  );

router.get("/logout", userController.logout);

// Profile Routes
router.get(
  "/profile/listings",
  isLoggedIn,
  wrapAsync(userController.renderProfileListings),
);
router.get(
  "/profile/messages",
  isLoggedIn,
  wrapAsync(userController.renderProfileMessages),
);

// Notifications Routes
router.get(
  "/notifications",
  isLoggedIn,
  wrapAsync(userController.renderNotifications),
);
router.delete(
  "/notifications/delete-selected",
  isLoggedIn,
  wrapAsync(userController.deleteSelectedUserNotifications),
);
router.post(
  "/notifications/delete-all",
  isLoggedIn,
  wrapAsync(userController.deleteAllUserNotifications),
);
router.delete(
  "/notifications/:id",
  isLoggedIn,
  wrapAsync(userController.deleteUserNotification),
);

// Delete Messages Routes
router.delete(
  "/profile/messages/delete-selected",
  isLoggedIn,
  wrapAsync(userController.deleteMultipleMessages),
);
router.delete(
  "/profile/messages/:id",
  isLoggedIn,
  wrapAsync(userController.deleteMessageConversation),
);

// Chat Thread Routes
router.get(
  "/profile/messages/:id",
  isLoggedIn,
  wrapAsync(userController.showProfileMessageThread),
);
router.post(
  "/profile/messages/:id/reply",
  isLoggedIn,
  wrapAsync(userController.replyProfileMessage),
);

// Profile Settings & Account Deletion Routes
router
  .route("/profile/settings")
  .get(isLoggedIn, userController.renderProfileSettings)
  .put(isLoggedIn, wrapAsync(userController.updateProfileSettings));

router.put(
  "/profile/change-password",
  isLoggedIn,
  wrapAsync(userController.changePassword),
);

router.delete(
  "/profile/delete-account",
  isLoggedIn,
  wrapAsync(userController.deleteAccount),
);

module.exports = router;
