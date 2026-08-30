const mongoose = require("mongoose");
const Schema = mongoose.Schema;
let passportLocalMongoose = require("passport-local-mongoose");

if (passportLocalMongoose && passportLocalMongoose.default) {
  passportLocalMongoose = passportLocalMongoose.default;
}

const adminSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
});

adminSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("Admin", adminSchema);
