import cloudinary from "../config/cloudinary";

/**
 * Upload a file to Cloudinary
 * @param filePath - The local path to the file to be uploaded
 * @param options - Additional options for the upload (e.g., folder, tags)
 * @returns The upload result from Cloudinary
 */
export const uploadFile = async (
  filePath: string,
  options: Record<string, any> = {}
) => {
  try {
    const uploadResult = await cloudinary.uploader.upload(filePath, options);
    return uploadResult;
  } catch (error: any) {
    console.error(
      "Error uploading file to Cloudinary:",
      error.message || error
    );
    throw new Error(error.message || "Failed to upload file to Cloudinary");
  }
};

/**
 * Fetch an optimized file URL from Cloudinary
 * @param publicId - The public ID of the file in Cloudinary
 * @param options - Options for optimization (e.g., fetch_format, quality)
 * @returns The optimized file URL
 */
export const fetchFile = (
  publicId: string,
  options: Record<string, any> = {}
) => {
  try {
    const optimizeUrl = cloudinary.url(publicId, {
      fetch_format: "auto",
      quality: "auto",
      ...options,
    });
    return optimizeUrl;
  } catch (error: any) {
    console.error(
      "Error fetching file from Cloudinary:",
      error.message || error
    );
    throw new Error("Failed to fetch file from Cloudinary");
  }
};

/**
 * Transform a file in Cloudinary
 * @param publicId - The public ID of the file in Cloudinary
 * @param options - Transformation options (e.g., crop, gravity, width, height)
 * @returns The transformed file URL
 */
export const transformFile = (
  publicId: string,
  options: Record<string, any> = {}
) => {
  try {
    const transformedUrl = cloudinary.url(publicId, options);
    return transformedUrl;
  } catch (error: any) {
    console.error(
      "Error transforming file in Cloudinary:",
      error.message || error
    );
    throw new Error("Failed to transform file in Cloudinary");
  }
};
