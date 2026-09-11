import { CITIES } from "@/lib/constants";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { city } = await req.json();
  if (!city || typeof city !== "string" || !(CITIES as readonly string[]).includes(city)) {
    return Response.json({ error: "Valid city required" }, { status: 400 });
  }

  await connectDB();
  await User.findByIdAndUpdate(session.user.id, { city });

  return Response.json({ success: true, city });
}