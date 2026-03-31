import { Document, Schema, model } from "mongoose";

export interface IMedia extends Document {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  thumbnailUrl?: string;
  altText?: string;
  caption?: string;
  createdBy: Schema.Types.ObjectId;
  org: Schema.Types.ObjectId;
  dimensions?: {
    width?: number;
    height?: number;
  };
  metadata?: Record<string, any>;
  isUsed: boolean;
}

const MediaSchema = new Schema<IMedia>(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
    url: { type: String, required: true },
    thumbnailUrl: String,
    altText: String,
    caption: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    org: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    dimensions: {
      width: Number,
      height: Number,
    },
    metadata: Schema.Types.Mixed,
    isUsed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default model<IMedia>("Media", MediaSchema);
