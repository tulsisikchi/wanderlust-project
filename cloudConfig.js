const cloudinary = require("cloudinary").v2;

const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
    cloud_name: "dkgbdme33",

    api_key: "852859988675842",

    api_secret: "BdnM_P_7-jWZE9x6XYrHpRdDdYE",
});

const storage = new CloudinaryStorage({

    cloudinary: cloudinary,

    params: {
        folder: "WANDERLUST_DEV",
        allowed_formats: ["png", "jpg", "jpeg"],
    },
});

module.exports = {
    cloudinary,
    storage,
};