import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // ASSUMPTION: see other routes
import {connectDB} from "@/lib/db"; // ASSUMPTION: see other routes
import Booking from "@/models/Booking";
import Review from "@/models/Review";
import "@/models/User"; // registers User schema for populate()

// GET /api/workshops/[id]/reviews
// Public. Returns the review list plus an average rating + count. No auth
// needed to read reviews.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const reviews = await Review.find({ workshopId: params.id })
      .sort({ createdAt: -1 })
      .populate("attendeeId", "name")
      .lean();

    const count = reviews.length;
    const average = count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;

    return NextResponse.json({
      reviews,
      summary: { count, average: Math.round(average * 10) / 10 },
    });
  } catch (err: any) {
    console.error("list reviews error", err);
    return NextResponse.json({ error: "Could not load reviews" }, { status: 500 });
  }
}

// POST /api/workshops/[id]/reviews
// Attendee-only. Requires a *confirmed* booking for this workshop. One
// review per attendee per workshop (enforced by the unique index on the
// model — a duplicate attempt returns 409).
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { rating, comment } = await req.json();

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be a number between 1 and 5" }, { status: 400 });
    }
    if (comment && typeof comment !== "string") {
      return NextResponse.json({ error: "Comment must be a string" }, { status: 400 });
    }
    if (comment && comment.length > 1000) {
      return NextResponse.json({ error: "Comment is too long (max 1000 characters)" }, { status: 400 });
    }

    await connectDB();

    // Must have actually attended (confirmed booking) to review.
    const confirmedBooking = await Booking.findOne({
      workshopId: params.id,
      attendeeId: session.user.id,
      status: "confirmed",
    });

    if (!confirmedBooking) {
      return NextResponse.json(
        { error: "Only attendees with a confirmed booking can review this workshop" },
        { status: 403 }
      );
    }

    try {
      const review = await Review.create({
        workshopId: params.id,
        attendeeId: session.user.id,
        rating,
        comment: comment?.trim() || undefined,
      });
      return NextResponse.json({ review }, { status: 201 });
    } catch (err: any) {
      // Mongo duplicate key error from the unique (workshopId, attendeeId) index.
      if (err?.code === 11000) {
        return NextResponse.json({ error: "You've already reviewed this workshop" }, { status: 409 });
      }
      throw err;
    }
  } catch (err: any) {
    console.error("create review error", err);
    return NextResponse.json({ error: "Could not submit review" }, { status: 500 });
  }
}