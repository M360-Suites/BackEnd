import { Schema, model, Document } from "mongoose";

export interface IWebsite extends Document {
  name: string;
  url: string;
  description?: string;
  icon?: string;
  pages: Schema.Types.ObjectId[];
  orgId: Schema.Types.ObjectId;
  createdBy: Schema.Types.ObjectId;
  status: string;
  searchVisibility?: boolean;
  // allowedUserAccess:
  createdAt: Date;
  updatedAt: Date;
}

const WebsiteSchema = new Schema<IWebsite>(
  {
    name: { type: String, required: true },
    url: { type: String, unique: true },
    description: { type: String },
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
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
        type: Schema.Types.ObjectId,
        ref: "Page",
        default: [],
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Interface for TypeScript type checking
export interface IPage extends Document {
  websiteId: Schema.Types.ObjectId;
  title: string;
  slug: string;
  content: any; // Can be more specific based on your content structure
  status: "draft" | "published" | "archived";
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  featuredImage?: Schema.Types.ObjectId;
  media?: Schema.Types.ObjectId[];
  org: Schema.Types.ObjectId;
  createdBy: Schema.Types.ObjectId;
  updatedBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema
const PageSchema = new Schema<IPage>(
  {
    websiteId: { type: Schema.Types.ObjectId, ref: "Website", required: true },
    title: { type: String, required: true },
    slug: { type: String, required: true },
    content: { type: Schema.Types.Mixed, required: true },
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
    featuredImage: { type: Schema.Types.ObjectId, ref: "Media" },
    media: [{ type: Schema.Types.ObjectId, ref: "Media" }],
    org: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Add a compound index to enforce unique slugs per websiteId
PageSchema.index({ websiteId: 1, slug: 1 }, { unique: true });

const Website = model<IWebsite>("Website", WebsiteSchema);
const Page = model<IPage>("Page", PageSchema);

export { Website, Page };
