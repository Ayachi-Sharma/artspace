import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Booking from "@/models/Booking";
import Review from "@/models/Review";
import "@/models/User";

const DIMENSIONS = [
  "experience",
  "learning",
  "ambiance",
  "entertainment",
];

function overallScore(r) {
  return (
    r.experience +
    r.learning +
    r.ambiance +
    r.entertainment
  ) / 4;
}

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    await connectDB();

    const reviews = await Review.find({ workshopId: id })
      .sort({ createdAt: -1 })
      .populate("attendeeId", "name")
      .lean();

    const count = reviews.length;

    const dimensionAverages = DIMENSIONS.reduce((acc, dim) => {
      acc[dim] =
        count > 0
          ? Math.round(
              (reviews.reduce(
                (sum, r) => sum + r[dim],
                0
              ) / count) * 10
            ) / 10
          : 0;

      return acc;
    }, {});

    const overallAverage =
      count > 0
        ? Math.round(
            (reviews.reduce(
              (sum, r) => sum + overallScore(r),
              0
            ) / count) * 10
          ) / 10
        : 0;

    return NextResponse.json({
      reviews,
      summary: {
        count,
        average: overallAverage,
        breakdown: dimensionAverages,
      },
    });
  } catch (err) {
    console.error("list reviews error", err);

    return NextResponse.json(
      { error: "Could not load reviews" },
      { status: 500 }
    );
  }
}

export async function POST(req, { params }) {
  try {
    const { id } = await params;

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const {
      experience,
      learning,
      ambiance,
      entertainment,
      comment,
    } = await req.json();

    for (const [key, value] of Object.entries({
      experience,
      learning,
      ambiance,
      entertainment,
    })) {
      if (
        typeof value !== "number" ||
        value < 1 ||
        value > 5
      ) {
        return NextResponse.json(
          {
            error: `${key} must be a number between 1 and 5`,
          },
          { status: 400 }
        );
      }
    }

    if (comment && typeof comment !== "string") {
      return NextResponse.json(
        { error: "Comment must be a string" },
        { status: 400 }
      );
    }

    if (comment && comment.length > 1000) {
      return NextResponse.json(
        {
          error:
            "Comment is too long (max 1000 characters)",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const confirmedBooking = await Booking.findOne({
      workshopId: id,
      attendeeId: session.user.id,
      status: "confirmed",
    });

    if (!confirmedBooking) {
      return NextResponse.json(
        {
          error:
            "Only attendees with a confirmed booking can review this workshop",
        },
        { status: 403 }
      );
    }

    try {
      const review = await Review.create({
        workshopId: id,
        attendeeId: session.user.id,
        experience,
        learning,
        ambiance,
        entertainment,
        comment: comment?.trim() || undefined,
      });

      return NextResponse.json(
        { review },
        { status: 201 }
      );
    } catch (err) {
      if (err?.code === 11000) {
        return NextResponse.json(
          {
            error:
              "You've already reviewed this workshop",
          },
          { status: 409 }
        );
      }

      throw err;
    }
  } catch (err) {
    console.error("create review error", err);

    return NextResponse.json(
      { error: "Could not submit review" },
      { status: 500 }
    );
  }
}