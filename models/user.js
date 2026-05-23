const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const passportLocalMongoose = require("passport-local-mongoose").default;

const userSchema = new Schema({});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);