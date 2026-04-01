"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Page = exports.Website = void 0;
const mongoose_1 = require("mongoose");
const WebsiteSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    url: { type: String, unique: true },
    description: { type: String },
    orgId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Organization", required: true },
    status: {
        type: String,
        enum: ["draft", "published", "archived"],
        default: "draft",
    },
    icon: {
        type: String,
    },
    searchVisibility: {
        type: Boolean,
        default: false,
    },
    pages: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Page",
            default: [],
        },
    ],
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
}, {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
});
// Mongoose Schema
const PageSchema = new mongoose_1.Schema({
    websiteId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Website", required: true },
    title: { type: String, required: true },
    slug: { type: String, required: true },
    content: { type: mongoose_1.Schema.Types.Mixed, required: true },
    status: {
        type: String,
        enum: ["draft", "published", "archived"],
        default: "draft",
    },
    seo: {
        title: String,
        description: String,
        keywords: [String],
    },
    featuredImage: { type: mongoose_1.Schema.Types.ObjectId, ref: "Media" },
    media: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Media" }],
    org: { type: mongoose_1.Schema.Types.ObjectId, ref: "Organization", required: true },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
// Add a compound index to enforce unique slugs per websiteId
PageSchema.index({ websiteId: 1, slug: 1 }, { unique: true });
const Website = (0, mongoose_1.model)("Website", WebsiteSchema);
exports.Website = Website;
const Page = (0, mongoose_1.model)("Page", PageSchema);
exports.Page = Page;
