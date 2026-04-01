"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const MediaSchema = new mongoose_1.Schema({
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
    url: { type: String, required: true },
    thumbnailUrl: String,
    altText: String,
    caption: String,
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    org: { type: mongoose_1.Schema.Types.ObjectId, ref: "Organization", required: true },
    dimensions: {
        width: Number,
        height: Number,
    },
    metadata: mongoose_1.Schema.Types.Mixed,
    isUsed: { type: Boolean, default: false },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("Media", MediaSchema);
