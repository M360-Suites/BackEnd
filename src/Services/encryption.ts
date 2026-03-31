import crypto from "crypto";

const algorithm = "aes-256-cbc";
const key = Buffer.from(process.env.ENCRYPTION_KEY as string, "hex"); // 32 bytes

export function encrypt(text: string): string {
  // Generate a random IV for each encryption
  const iv = crypto.randomBytes(16); // 16 bytes for AES-256-CBC

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Prepend IV to encrypted data (separated by :)
  return iv.toString("hex") + ":" + encrypted;
}

export function decrypt(encryptedData: string): string {
  // Split IV and encrypted data
  const [ivHex, encrypted] = encryptedData.split(":");
  const iv = Buffer.from(ivHex, "hex");

  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}