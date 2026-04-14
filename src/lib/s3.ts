import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET!;

export function getPublicUrl(key: string): string {
  return `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

/** Generate a presigned PUT URL for direct client upload */
export async function createPresignedUpload(
  filename: string,
  contentType: string
): Promise<{ presignedUrl: string; publicUrl: string; key: string }> {
  const ext = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")) : ".jpg";
  const key = `${randomUUID()}${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const publicUrl = getPublicUrl(key);

  return { presignedUrl, publicUrl, key };
}

/** Upload a buffer to S3 directly (server-side, for format conversion) */
export async function uploadToS3(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const ext = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")) : ".jpg";
  const key = `${randomUUID()}${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return getPublicUrl(key);
}
