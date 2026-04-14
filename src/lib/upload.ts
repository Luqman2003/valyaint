import sharp from "sharp";
import { uploadToS3 } from "./s3";

const HEIC_FORMATS = new Set([".heic", ".heif"]);
const SHARP_CONVERT = new Set([".webp", ".tiff", ".tif", ".avif"]);

export async function saveFile(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  let buffer: Buffer<ArrayBuffer> = Buffer.from(bytes);

  const ext = (file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ".jpg").toLowerCase();
  let outputExt = ext;
  let contentType = file.type || "image/jpeg";

  if (HEIC_FORMATS.has(ext)) {
    const heicConvert = (await import("heic-convert")).default;
    const result = await heicConvert({
      buffer: new Uint8Array(buffer),
      format: "JPEG",
      quality: 1,
    });
    buffer = Buffer.from(result);
    outputExt = ".jpg";
    contentType = "image/jpeg";
  } else if (SHARP_CONVERT.has(ext)) {
    buffer = await sharp(buffer).jpeg({ quality: 100 }).toBuffer() as Buffer<ArrayBuffer>;
    outputExt = ".jpg";
    contentType = "image/jpeg";
  }

  return uploadToS3(buffer, `photo${outputExt}`, contentType);
}
