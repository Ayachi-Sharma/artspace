import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workshop from "@/models/Workshop";
import "@/models/Review"; // registers Review schema so aggregate $lookup below can find the "reviews" collection

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
  const mine = searchParams.get("mine");

  const filter: Record<string, any> = {};

  if (mine === "true") {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "instructor") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    filter.instructorId = new mongoose.Types.ObjectId(session.user.id);
  } else {
    if (city) filter.city = city;
    if (category) filter.category = category;
  }

  // Aggregation instead of a plain find() so we can join in each workshop's
  // reviews and compute an average rating + count in the same query.
  const workshops = await Workshop.aggregate([
    { $match: filter },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: "reviews", // mongoose lowercases + pluralizes the "Review" model name for the collection
        localField: "_id",
        foreignField: "workshopId",
        as: "reviews",
      },
    },
    {
      $addFields: {
        averageRating: {
          $cond: [
            { $gt: [{ $size: "$reviews" }, 0] },
            { $round: [{ $avg: "$reviews.rating" }, 1] },
            0,
          ],
        },
        reviewCount: { $size: "$reviews" },
      },
    },
    { $project: { reviews: 0 } }, // drop the raw joined array, keep only the computed fields
  ]);

  return Response.json({ workshops });
}