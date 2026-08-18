import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { s3 } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "instructor") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileType } = await req.json(); // e.g. "image/jpeg"
  const key = `workshops/${session.user.id}/${randomUUID()}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: key,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });
  const publicUrl = `https://s3.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_S3_BUCKET_NAME}/${key}`;

  return Response.json({ uploadUrl, publicUrl });
}