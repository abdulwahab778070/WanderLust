const User = require("../models/user.js");
const Listing = require("../models/listing.js");
const Message = require("../models/message.js");
const Admin = require("../models/admin.js");

module.exports.renderSingupForm = (req, res) => {
  if (
    req.headers.referer &&
    !req.headers.referer.includes("/login") &&
    !req.headers.referer.includes("/singup")
  ) {
    req.session.redirectUrl = req.headers.referer;
  }
  res.render("users/singup.ejs");
};

module.exports.singup = async (req, res, next) => {
  try {
    let { username, email, contact, password } = req.body;
    let newUser = new User({ username, email, contact });
    const registeredUser = await User.register(newUser, password);
    req.login(registeredUser, (err) => {
      if (err) {
        return next(err);
      }
      req.flash(
        "success",
        "User registered successfully! Welcome to WanderLust",
      );
      let redirectUrl = res.locals.redirectUrl || "/listings";
      res.redirect(redirectUrl);
    });
  } catch (e) {
    req.flash("error", e.message);
    res.redirect("/singup");
  }
};

module.exports.renderLoginForm = (req, res) => {
  if (
    req.headers.referer &&
    !req.headers.referer.includes("/login") &&
    !req.headers.referer.includes("/singup")
  ) {
    req.session.redirectUrl = req.headers.referer;
  }
  res.render("users/login.ejs");
};

module.exports.login = async (req, res, next) => {
  if (req.user.status && req.user.status !== "active") {
    const statusMsg =
      req.user.status === "suspended"
        ? "Your account has been suspended by the administrator."
        : "Your account is deactivated. Please contact support.";

    return req.logout((err) => {
      if (err) {
        return next(err);
      }
      req.flash("error", statusMsg);
      return res.redirect("/login");
    });
  }

  req.flash("success", "login successfully! Wellcome to WanderLust");
  let redirectUrl = res.locals.redirectUrl || "/listings";
  res.redirect(redirectUrl);
};

module.exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }

    req.flash("success", "You are logged out!");
    res.redirect("/listings");
  });
};

module.exports.renderProfileListings = async (req, res) => {
  const myListings = await Listing.find({ owner: req.user._id }).sort({
    date: -1,
  });
  res.render("users/userprofilelistings.ejs", { myListings });
};

module.exports.renderProfileMessages = async (req, res) => {
  const admins = await Admin.find({}, "_id");
  const adminIds = admins.map((a) => a._id);

  if (adminIds.length > 0) {
    await Message.updateMany(
      { sender: { $in: adminIds }, isBroadcast: { $ne: true } },
      { $set: { isBroadcast: true } },
    );
  }

  const allMessages = await Message.find({
    $or: [{ sender: req.user._id }, { receiver: req.user._id }],
    deletedBy: { $ne: req.user._id },
    isBroadcast: { $ne: true },
    sender: { $nin: adminIds },
  })
    .populate("sender")
    .populate("receiver")
    .populate({
      path: "listing",
      populate: { path: "owner" },
    })
    .sort({ createdAt: -1 });

  const receivedMap = new Map();
  const sentMap = new Map();

  for (let msg of allMessages) {
    const isMyListing =
      msg.listing &&
      msg.listing.owner &&
      msg.listing.owner._id.equals(req.user._id);
    const listingId = msg.listing
      ? msg.listing._id.toString()
      : "deleted_listing";

    if (isMyListing) {
      const otherUser =
        msg.sender && msg.sender._id.equals(req.user._id)
          ? msg.receiver
          : msg.sender;
      const otherUserId = otherUser ? otherUser._id.toString() : "deleted_user";
      const key = `${listingId}_${otherUserId}`;

      if (!receivedMap.has(key)) {
        receivedMap.set(key, {
          sampleMsgId: msg._id,
          otherUser: otherUser,
          listing: msg.listing,
          lastMessage: msg,
          unseenCount: 0,
        });
      }

      if (
        !msg.isSeen &&
        msg.receiver &&
        msg.receiver._id.equals(req.user._id)
      ) {
        receivedMap.get(key).unseenCount += 1;
      }
    } else {
      const otherUser =
        msg.sender && msg.sender._id.equals(req.user._id)
          ? msg.receiver
          : msg.sender;
      const otherUserId = otherUser ? otherUser._id.toString() : "deleted_user";
      const key = `${listingId}_${otherUserId}`;

      if (!sentMap.has(key)) {
        sentMap.set(key, {
          sampleMsgId: msg._id,
          otherUser: otherUser,
          listing: msg.listing,
          lastMessage: msg,
          unseenCount: 0,
        });
      }

      if (
        !msg.isSeen &&
        msg.receiver &&
        msg.receiver._id.equals(req.user._id)
      ) {
        sentMap.get(key).unseenCount += 1;
      }
    }
  }

  const receivedConversations = Array.from(receivedMap.values());
  const sentConversations = Array.from(sentMap.values());

  res.render("users/userprofilemesseges.ejs", {
    receivedConversations,
    sentConversations,
  });
};

module.exports.showProfileMessageThread = async (req, res) => {
  let { id } = req.params;

  let targetMsgRaw = await Message.findById(id);
  const admins = await Admin.find({}, "_id");
  const adminIds = admins.map((a) => a._id.toString());
  const isSenderAdmin =
    targetMsgRaw &&
    targetMsgRaw.sender &&
    adminIds.includes(targetMsgRaw.sender.toString());

  if (!targetMsgRaw || targetMsgRaw.isBroadcast || isSenderAdmin) {
    req.flash("error", "WanderLust notices appear in your notifications.");
    return res.redirect("/notifications");
  }

  let rawListingId = targetMsgRaw.listing;
  let rawSender = targetMsgRaw.sender;
  let rawReceiver = targetMsgRaw.receiver;

  const isSender = rawSender.equals(req.user._id);
  const isReceiver = rawReceiver.equals(req.user._id);

  if (!isSender && !isReceiver) {
    req.flash("error", "Unauthorized access to message thread");
    return res.redirect("/profile/messages");
  }

  let otherUserId = isSender ? rawReceiver : rawSender;

  let targetMsg = await Message.findById(id)
    .populate("sender")
    .populate("receiver")
    .populate("listing");

  let otherUser =
    targetMsg.sender && targetMsg.sender._id.equals(req.user._id)
      ? targetMsg.receiver
      : targetMsg.sender;

  await Message.updateMany(
    {
      listing: rawListingId,
      receiver: req.user._id,
      sender: otherUserId,
      isSeen: false,
    },
    { $set: { isSeen: true } },
  );

  let conversation = await Message.find({
    listing: rawListingId,
    $or: [
      { sender: req.user._id, receiver: otherUserId },
      { sender: otherUserId, receiver: req.user._id },
    ],
    deletedBy: { $ne: req.user._id },
    isBroadcast: { $ne: true },
    sender: { $nin: adminIds },
  })
    .populate("sender")
    .populate("receiver")
    .sort({ createdAt: 1 });

  res.render("users/showuserprofilemesseges.ejs", {
    targetMessageId: id,
    conversation,
    otherUser,
    listing: targetMsg.listing,
  });
};

module.exports.replyProfileMessage = async (req, res) => {
  let { id } = req.params;
  let { message } = req.body;
  let targetMsg = await Message.findById(id)
    .populate("sender")
    .populate("receiver");

  const admins = await Admin.find({}, "_id");
  const adminIds = admins.map((a) => a._id.toString());
  const isSenderAdmin =
    targetMsg &&
    targetMsg.sender &&
    adminIds.includes(targetMsg.sender._id.toString());

  if (!targetMsg || targetMsg.isBroadcast || isSenderAdmin) {
    req.flash("error", "Cannot reply to WanderLust notices here.");
    return res.redirect("/profile/messages");
  }

  let receiverId =
    targetMsg.sender && targetMsg.sender._id.equals(req.user._id)
      ? targetMsg.receiver
        ? targetMsg.receiver._id
        : null
      : targetMsg.sender
        ? targetMsg.sender._id
        : null;

  if (!receiverId) {
    req.flash("error", "Cannot send message to a deleted user account.");
    return res.redirect(`/profile/messages/${id}`);
  }

  const newReply = new Message({
    sender: req.user._id,
    receiver: receiverId,
    listing: targetMsg.listing,
    message: message,
    senderContact: req.user.contact,
    isSeen: false,
  });

  await newReply.save();
  req.flash("success", "Message sent!");
  res.redirect(`/profile/messages/${id}`);
};

module.exports.deleteMessageConversation = async (req, res) => {
  let { id } = req.params;
  let targetMsg = await Message.findById(id);

  if (!targetMsg) {
    req.flash("error", "Message thread not found");
    return res.redirect("/profile/messages");
  }

  let otherUserId =
    targetMsg.sender && targetMsg.sender.equals(req.user._id)
      ? targetMsg.receiver
      : targetMsg.sender;

  await Message.updateMany(
    {
      listing: targetMsg.listing,
      $or: [
        { sender: req.user._id, receiver: otherUserId },
        { sender: otherUserId, receiver: req.user._id },
      ],
    },
    { $addToSet: { deletedBy: req.user._id } },
  );

  await Message.deleteMany({
    listing: targetMsg.listing,
    $or: [
      { sender: req.user._id, receiver: otherUserId },
      { sender: otherUserId, receiver: req.user._id },
    ],
    $or: [
      { $expr: { $gte: [{ $size: "$deletedBy" }, 2] } },
      { sender: null },
      { receiver: null },
    ],
  });

  req.flash("success", "Conversation deleted from your messages!");
  res.redirect("/profile/messages");
};

module.exports.deleteMultipleMessages = async (req, res) => {
  let { conversationIds } = req.body;

  if (!conversationIds || conversationIds.length === 0) {
    req.flash("error", "Please select at least one conversation to delete.");
    return res.redirect("/profile/messages");
  }

  if (!Array.isArray(conversationIds)) {
    conversationIds = [conversationIds];
  }

  for (let msgId of conversationIds) {
    let targetMsg = await Message.findById(msgId);
    if (targetMsg) {
      let otherUserId =
        targetMsg.sender && targetMsg.sender.equals(req.user._id)
          ? targetMsg.receiver
          : targetMsg.sender;

      await Message.updateMany(
        {
          listing: targetMsg.listing,
          $or: [
            { sender: req.user._id, receiver: otherUserId },
            { sender: otherUserId, receiver: req.user._id },
          ],
        },
        { $addToSet: { deletedBy: req.user._id } },
      );

      await Message.deleteMany({
        listing: targetMsg.listing,
        $or: [
          { sender: req.user._id, receiver: otherUserId },
          { sender: otherUserId, receiver: req.user._id },
        ],
        $or: [
          { $expr: { $gte: [{ $size: "$deletedBy" }, 2] } },
          { sender: null },
          { receiver: null },
        ],
      });
    }
  }

  req.flash("success", "Selected conversations deleted from your messages!");
  res.redirect("/profile/messages");
};

module.exports.renderProfileSettings = (req, res) => {
  res.render("users/userprofilesetting.ejs");
};

module.exports.updateProfileSettings = async (req, res) => {
  let { contact } = req.body;
  await User.findByIdAndUpdate(req.user._id, { contact });
  req.flash("success", "Profile settings updated successfully!");
  res.redirect("/profile/settings");
};

module.exports.changePassword = async (req, res) => {
  let { currentPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    req.flash("error", "New passwords do not match.");
    return res.redirect("/profile/settings");
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      req.flash("error", "User not found.");
      return res.redirect("/login");
    }

    await user.changePassword(currentPassword, newPassword);

    req.flash("success", "Password changed successfully!");
    return res.redirect("/profile/settings");
  } catch (e) {
    req.flash("error", "Incorrect current password.");
    return res.redirect("/profile/settings");
  }
};

module.exports.deleteAccount = async (req, res, next) => {
  let { currentPassword } = req.body;
  const userId = req.user._id;

  if (!currentPassword) {
    req.flash("error", "Current password is required.");
    return res.redirect("/profile/settings");
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      req.flash("error", "User not found.");
      return res.redirect("/profile/settings");
    }

    const authenticate = User.authenticate();
    const isValid = await new Promise((resolve) => {
      authenticate(user.username, currentPassword, (err, result) => {
        if (err || !result) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });

    if (!isValid) {
      req.flash("error", "Incorrect password. Account deletion failed.");
      return res.redirect("/profile/settings");
    }

    await Listing.deleteMany({ owner: userId });

    await Message.deleteMany({
      $or: [
        { sender: userId, receiver: userId },
        { sender: userId, deletedBy: userId },
        { receiver: userId, deletedBy: userId },
      ],
    });

    await Message.updateMany(
      { $or: [{ sender: userId }, { receiver: userId }] },
      { $addToSet: { deletedBy: userId } },
    );

    await User.findByIdAndDelete(userId);

    res.clearCookie("connect.sid");
    if (req.session) {
      req.session.destroy(() => {
        return res.redirect("/listings");
      });
    } else {
      return res.redirect("/listings");
    }
  } catch (e) {
    req.flash("error", e.message || "Something went wrong.");
    return res.redirect("/profile/settings");
  }
};

module.exports.renderNotifications = async (req, res) => {
  const admins = await Admin.find({}, "_id");
  const adminIds = admins.map((a) => a._id);

  if (adminIds.length > 0) {
    await Message.updateMany(
      { receiver: req.user._id, sender: { $in: adminIds } },
      { $set: { isBroadcast: true } },
    );
  }

  const notifications = await Message.find({
    receiver: req.user._id,
    deletedBy: { $ne: req.user._id },
    $or: [{ isBroadcast: true }, { sender: { $in: adminIds } }],
  })
    .populate("sender")
    .populate("listing")
    .sort({ createdAt: -1 });

  await Message.updateMany(
    {
      receiver: req.user._id,
      deletedBy: { $ne: req.user._id },
      $or: [{ isBroadcast: true }, { sender: { $in: adminIds } }],
      isSeen: false,
    },
    { $set: { isSeen: true } },
  );

  res.render("users/userwanderlustnotification.ejs", {
    notifications,
    messages: notifications,
  });
};

module.exports.deleteUserNotification = async (req, res) => {
  let { id } = req.params;

  await Message.findOneAndUpdate(
    { _id: id, receiver: req.user._id },
    { $addToSet: { deletedBy: req.user._id } },
  );

  req.flash("success", "Notice deleted successfully!");
  res.redirect("/notifications");
};

module.exports.deleteAllUserNotifications = async (req, res) => {
  const admins = await Admin.find({}, "_id");
  const adminIds = admins.map((a) => a._id);

  await Message.updateMany(
    {
      receiver: req.user._id,
      $or: [{ isBroadcast: true }, { sender: { $in: adminIds } }],
    },
    { $addToSet: { deletedBy: req.user._id } },
  );

  req.flash("success", "All notices cleared successfully!");
  res.redirect("/notifications");
};

module.exports.deleteSelectedUserNotifications = async (req, res) => {
  let { notificationIds } = req.body;

  if (!notificationIds || notificationIds.length === 0) {
    req.flash("error", "Please select at least one notice to delete.");
    return res.redirect("/notifications");
  }

  if (!Array.isArray(notificationIds)) {
    notificationIds = [notificationIds];
  }

  for (let notifId of notificationIds) {
    await Message.findOneAndUpdate(
      { _id: notifId, receiver: req.user._id },
      { $addToSet: { deletedBy: req.user._id } },
    );
  }

  req.flash("success", "Selected notices deleted successfully!");
  res.redirect("/notifications");
};
