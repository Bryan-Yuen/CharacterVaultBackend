import {
  PutObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import "dotenv/config";

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

export const createPresignedUrlWithClient = async ({
  key,
}: {
  key: string;
}) => {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: "image/jpeg",
  });

  return await getSignedUrl(client, command, { expiresIn: 3600 });
};

export const deleteObjectWithClient = async ({ key }: { key: string }) => {
  const deleteObjectCommand = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await client.send(deleteObjectCommand);
};
