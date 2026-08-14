import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "instructor") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bio } = await req.json();

  await connectDB();
  await User.findByIdAndUpdate(session.user.id, { bio });

  return Response.json({ success: true });
}