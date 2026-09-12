import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "instructor") {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  await connectDB();

  const user = await User.findById(session.user.id)
    .select("name email bio profileImage verified")
    .lean();

  if (!user) {
    return Response.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  return Response.json({ user });
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "instructor") {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { name, bio, profileImage } = await req.json();

  await connectDB();

  const updated = await User.findByIdAndUpdate(
    session.user.id,
    {
      name,
      bio,
      profileImage,
    },
    { new: true }
  )
    .select("name email bio profileImage verified")
    .lean();

  return Response.json({ user: updated });
}