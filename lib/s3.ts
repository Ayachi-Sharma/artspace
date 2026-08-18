import { S3Client } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  // Required because the bucket name (artspace.dev) contains a dot.
  // Virtual-hosted-style URLs (bucket.dot.s3.region.amazonaws.com) break
  // TLS hostname verification for dotted bucket names over HTTPS.
  // Path-style (s3.region.amazonaws.com/bucket.dot/key) avoids that.
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});