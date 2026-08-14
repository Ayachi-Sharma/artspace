import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workshop from "@/models/Workshop";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "instructor") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
const { title, category, description, city, address, mapLink, isRecurring, sessionDates, price, capacity, images } = body;

if (!title || !category || !description || !city || !address || !sessionDates?.length || !price || !capacity) {
  return Response.json({ error: "Missing required fields" }, { status: 400 });
}

await connectDB();
const workshop = await Workshop.create({
  instructorId: session.user.id,
  title,
  category,
  description,
  city, // now from the form, not session.user.city
  address,
  mapLink,
  isRecurring: !!isRecurring,
  sessionDates,
  price,
  capacity,
  seatsBooked: 0,
  images: images || [],
});

  return Response.json({ success: true, workshop });
}

export async function GET(req: Request) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city");
  const category = searchParams.get("category");

  const filter: Record<string, any> = {};
  if (city) filter.city = city;
  if (category) filter.category = category;

  const workshops = await Workshop.find(filter).sort({ createdAt: -1 });
  return Response.json({ workshops });
}