import {
  PutObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import "dotenv/config";

import { createCipheriv } from "node:crypto";

/*
const {
  scrypt,
  randomFill,
  createCipheriv,
} = require('node:crypto');
 */

if (!process.env.ACCESS_KEY_ID) {
  throw new Error("ACCESS_KEY_ID environment variable is not defined");
}
if (!process.env.SECRET_ACCESS_KEY) {
  throw new Error("SECRET_ACCESS_KEY environment variable is not defined");
}
if (!process.env.S3_API_URL) {
  throw new Error("S3_API_URL environment variable is not defined");
}
if (!process.env.BUCKET_NAME) {
  throw new Error("BUCKET_NAME environment variable is not defined");
}
if(!process.env.PRESIGNED_URL_CIPHER_KEY) {
  throw new Error("PRESIGNED_URL_CIPHER_KEY environment variable is not defined");
}
if(!process.env.PRESIGNED_URL_CIPHER_IV) {
  throw new Error("PRESIGNED_URL_CIPHER_IV environment variable is not defined");
}

const accessKeyId = process.env.ACCESS_KEY_ID;
const secretAccessKey = process.env.SECRET_ACCESS_KEY;

const region = "auto";
const bucket = process.env.BUCKET_NAME;

const client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  endpoint: process.env.S3_API_URL,
});

export const createEncryptedPresignedUrlWithClient = async ({
  key,
}: {
  key: string;
}) => {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: "image/jpeg",
  });

  // expires in 1 minute
  //return await getSignedUrl(client, command, { expiresIn: 60 });
  const presignedUrl = await getSignedUrl(client, command, { expiresIn: 60 });

  // Static key and IV (both stored securely)
  const staticKey = Buffer.from(process.env.PRESIGNED_URL_CIPHER_KEY || "", "base64"); // Static key (base64-encoded)
  const staticIv = Buffer.from(process.env.PRESIGNED_URL_CIPHER_IV || "", "base64"); // Static IV (base64-encoded)

  const cipher = createCipheriv("aes-256-cbc", staticKey, staticIv);
  let encryptedPresignedUrl = cipher.update(presignedUrl, "utf8", "base64");
  encryptedPresignedUrl += cipher.final("base64");

  return encryptedPresignedUrl;
};

export const deleteObjectWithClient = async ({ key }: { key: string }) => {
  const deleteObjectCommand = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await client.send(deleteObjectCommand);
};
