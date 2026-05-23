const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const DEFAULT_IMAGE_URL =
    "https://wallpapercave.com/wp/xgrRFIA.jpg";

const listingSchema = new Schema({
    title: {
        type: String,
        required: true,
    },

    description: String,

    image: {
        filename: {
            type: String,
            default: "listingimage",
        },

        url: {
            type: String,
            default: DEFAULT_IMAGE_URL,

            set: (v) =>
                v === "" ? DEFAULT_IMAGE_URL : v,
        },
    },

    price: Number,

    location: String,

    country: String,

    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },

    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: "Review",
        },
    ],
});

const Listing = mongoose.model("Listing", listingSchema);

module.exports = Listing;