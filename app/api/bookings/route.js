import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Booking from "@/models/Booking";
import "@/models/Workshop";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    await connectDB();

    const bookings = await Booking.find({
      attendeeId: session.user.id,
    })
      .sort({ createdAt: -1 })
      .populate("workshopId", "title images city price")
      .lean();

    return NextResponse.json({ bookings });
  } catch (err) {
    console.error("bookings list error", err);

    return NextResponse.json(
      { error: "Could not load bookings" },
      { status: 500 }
    );
  }
}