const Admin = require("../models/admin.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");
const Message = require("../models/message.js");

module.exports.renderAdminLogin = (req, res) => {
  res.render("admin/adminlogin.ejs");
};

module.exports.loginAdmin = async (req, res) => {
  req.flash("success", "Welcome back, Admin!");
  res.redirect("/admin");
};

module.exports.logoutAdmin = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success", "Admin logged out successfully!");
    res.redirect("/admin/login");
  });
};

module.exports.renderAdminDashboard = async (req, res) => {
  const totalUsers = await User.countDocuments({});
  const totalListings = await Listing.countDocuments({});
  const totalMessages = await Message.countDocuments({});
  res.render("admin/adminindex.ejs", {
    totalUsers,
    totalListings,
    totalMessages,
    activePage: "dashboard",
  });
};

module.exports.renderAdminSettings = async (req, res) => {
  const admin = await Admin.findById(req.user._id);
  res.render("admin/adminaccountsetting.ejs", {
    admin,
    activePage: "settings",
  });
};

module.exports.updateAdminProfile = async (req, res) => {
  const { username, email } = req.body;
  const admin = await Admin.findById(req.user._id);

  if (!admin) {
    req.flash("error", "Admin not found.");
    return res.redirect("/admin/login");
  }

  admin.username = username;
  admin.email = email;

  await admin.save();
  req.flash("success", "Admin profile details updated successfully!");
  res.redirect("/admin/settings");
};

module.exports.updateAdminPassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const admin = await Admin.findById(req.user._id);

  if (!admin) {
    req.flash("error", "Admin not found.");
    return res.redirect("/admin/login");
  }

  if (!currentPassword || !newPassword || !confirmPassword) {
    req.flash("error", "All password fields are required.");
    return res.redirect("/admin/settings");
  }

  if (newPassword !== confirmPassword) {
    req.flash("error", "New passwords do not match.");
    return res.redirect("/admin/settings");
  }

  try {
    await admin.changePassword(currentPassword, newPassword);
    await admin.save();
    req.flash("success", "Admin password changed successfully!");
  } catch (e) {
    req.flash("error", "Incorrect current password.");
  }

  res.redirect("/admin/settings");
};

module.exports.renderAdminListings = async (req, res) => {
  const allListings = await Listing.find({})
    .populate("owner")
    .sort({ _id: -1 });
  res.render("admin/adminalllisting.ejs", {
    allListings,
    activePage: "listings",
  });
};

module.exports.renderAdminListingDetails = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id).populate("owner");
  if (!listing) {
    req.flash("error", "Listing not found!");
    return res.redirect("/admin/listings");
  }
  res.render("admin/adminshowlisting.ejs", { listing, activePage: "listings" });
};

module.exports.deleteAdminListing = async (req, res) => {
  const { id } = req.params;
  await Listing.findByIdAndDelete(id);
  req.flash("success", "Listing deleted successfully by Admin!");
  res.redirect("/admin/listings");
};

module.exports.renderAdminUsers = async (req, res) => {
  const allUsers = await User.find({}).sort({ _id: -1 });
  res.render("admin/adminallusers.ejs", { allUsers, activePage: "users" });
};

module.exports.renderAdminUserDetails = async (req, res) => {
  const { id } = req.params;
  const targetUser = await User.findById(id);

  if (!targetUser) {
    req.flash("error", "User account not found or deleted.");
    return res.redirect("/admin/users");
  }

  const userListings = await Listing.find({ owner: id }).sort({ _id: -1 });

  res.render("admin/adminshowuser.ejs", {
    targetUser,
    userListings,
    activePage: "users",
  });
};

module.exports.toggleUserAccountStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const targetUser = await User.findById(id);
  if (!targetUser) {
    req.flash("error", "User account not found.");
    return res.redirect("/admin/users");
  }

  targetUser.status = status;
  await targetUser.save();

  req.flash(
    "success",
    `User account status successfully updated to ${status}.`,
  );
  res.redirect(`/admin/users/${id}`);
};

module.exports.deleteAdminUser = async (req, res) => {
  const { id } = req.params;
  await User.findByIdAndDelete(id);
  await Listing.deleteMany({ owner: id });
  await Message.deleteMany({ $or: [{ sender: id }, { receiver: id }] });
  req.flash("success", "User and all related data deleted successfully!");
  res.redirect("/admin/users");
};

module.exports.deleteAdminSelectedUsers = async (req, res) => {
  let { allUserIds, userIds } = req.body;

  let ids = [];
  if (allUserIds) {
    ids = allUserIds.split(",").filter((id) => id.trim() !== "");
  } else if (userIds) {
    ids = Array.isArray(userIds) ? userIds : [userIds];
  }

  if (ids.length === 0) {
    req.flash("error", "No users selected.");
    return res.redirect("/admin/users");
  }

  await User.deleteMany({ _id: { $in: ids } });
  await Listing.deleteMany({ owner: { $in: ids } });
  await Message.deleteMany({
    $or: [{ sender: { $in: ids } }, { receiver: { $in: ids } }],
  });

  req.flash(
    "success",
    "Selected users and their related data permanently deleted!",
  );
  res.redirect("/admin/users");
};

module.exports.renderAdminChats = async (req, res) => {
  const usersWithMessages = await Message.distinct("receiver", {
    sender: req.user._id,
  });
  const users = await User.find({ _id: { $in: usersWithMessages } });

  let chatsWithDetails = await Promise.all(
    users.map(async (user) => {
      const lastMessage = await Message.findOne({
        receiver: user._id,
        sender: req.user._id,
      }).sort({
        createdAt: -1,
      });
      const totalMessages = await Message.countDocuments({
        receiver: user._id,
        sender: req.user._id,
      });
      return {
        user,
        lastMessage,
        totalMessages,
      };
    }),
  );

  chatsWithDetails.sort((a, b) => {
    const timeA = a.lastMessage
      ? new Date(a.lastMessage.createdAt).getTime()
      : 0;
    const timeB = b.lastMessage
      ? new Date(b.lastMessage.createdAt).getTime()
      : 0;
    return timeB - timeA;
  });

  res.render("admin/adminchats.ejs", {
    chatsWithDetails,
    activePage: "chats",
  });
};

module.exports.sendBroadcast = async (req, res) => {
  const { receiverId, messageText } = req.body;
  const newMessage = new Message({
    receiver: receiverId,
    sender: req.user._id,
    message: messageText,
    isBroadcast: true,
    isSeen: false,
  });
  await newMessage.save();
  req.flash("success", "Official broadcast notice sent successfully!");
  res.redirect("/admin/chats");
};

module.exports.deleteAllSystemChats = async (req, res) => {
  await Message.deleteMany({});
  req.flash(
    "success",
    "All user chat records permanently deleted from the database!",
  );
  res.redirect("/admin/chats");
};

module.exports.renderAdminUserChat = async (req, res) => {
  const { userId } = req.params;
  const targetUser = await User.findById(userId);

  if (!targetUser) {
    req.flash("error", "User account not found or deleted.");
    return res.redirect("/admin/listings");
  }

  const messages = await Message.find({
    receiver: userId,
    sender: req.user._id,
  })
    .populate("deletedBy")
    .sort({
      createdAt: 1,
    });

  res.render("admin/adminshowchat.ejs", {
    targetUser,
    messages,
    activePage: "users",
  });
};

module.exports.sendAdminUserMessage = async (req, res) => {
  const { userId } = req.params;
  const { messageText } = req.body;

  const userListing = await Listing.findOne({ owner: userId });

  const newMessage = new Message({
    receiver: userId,
    sender: req.user._id,
    listing: userListing ? userListing._id : null,
    message: messageText,
    isBroadcast: true,
    isSeen: false,
  });

  await newMessage.save();
  req.flash("success", "Notice sent to user successfully!");
  res.redirect(`/admin/chats/user/${userId}`);
};

module.exports.deleteAdminChatMessage = async (req, res) => {
  const { userId, messageId } = req.params;
  await Message.findByIdAndDelete(messageId);
  req.flash("success", "Message permanently deleted from database!");
  res.redirect(`/admin/chats/user/${userId}`);
};

module.exports.deleteAdminSelectedChatMessages = async (req, res) => {
  const { userId } = req.params;
  let { messageIds } = req.body;
  if (messageIds) {
    if (!Array.isArray(messageIds)) {
      messageIds = [messageIds];
    }
    await Message.deleteMany({ _id: { $in: messageIds } });
    req.flash(
      "success",
      "Selected messages permanently deleted from database!",
    );
  } else {
    req.flash("error", "No messages selected.");
  }
  res.redirect(`/admin/chats/user/${userId}`);
};

module.exports.deleteAllAdminChatMessages = async (req, res) => {
  const { userId } = req.params;
  await Message.deleteMany({ receiver: userId, sender: req.user._id });
  req.flash(
    "success",
    "All messages for this user permanently deleted from database!",
  );
  res.redirect("/admin/chats");
};
