import { PutObjectCommand,  DeleteObjectCommand, S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
import {
  getSignedUrl,
} from '@aws-sdk/s3-request-presigner';
import 'dotenv/config';

if (!process.env.ACCESS_KEY_ID) {
  throw new Error('ACCESS_KEY_ID environment variable is not defined');
}
if(!process.env.SECRET_ACCESS_KEY) {
  throw new Error('SECRET_ACCESS_KEY environment variable is not defined');
}

const accessKeyId = process.env.ACCESS_KEY_ID;
const secretAccessKey = process.env.SECRET_ACCESS_KEY;

const region = 'auto';
const bucket = 'testing';

const client = new S3Client({ region , credentials: {
  accessKeyId,
  secretAccessKey
},
endpoint: `https://0bc57880732580970c838392829ad527.r2.cloudflarestorage.com`,
});

export const createPresignedUrlWithClient = async ({
  key,
}: {
  key: string;
}) => {
  const command = new PutObjectCommand({ Bucket: bucket, Key: key ,ContentType: 'image/jpeg'});
  console.log("im in bucket code",
    await client.send(
      new ListBucketsCommand('')
    )
  );
  return getSignedUrl(client, command, { expiresIn: 3600 });
};

export const deleteObjectWithClient = ({
  key,
}: {
  key: string;
}) => {
  const deleteObjectCommand = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key
  });
  
  // Execute the command
  client.send(deleteObjectCommand)
    .then(() => {
      console.log('Object deleted successfully');
    })
    .catch((error) => {
      console.error('Error deleting object:', error);
    });
};
