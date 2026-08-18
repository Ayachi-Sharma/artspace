import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // ASSUMPTION: see create-order/route.ts
import {connectDB} from "@/lib/db"; // ASSUMPTION: see create-order/route.ts
import Booking from "@/models/Booking";
import "@/models/Workshop"; // registers the Workshop schema for populate()

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectDB();

    const bookings = await Booking.find({ attendeeId: session.user.id })
      .sort({ createdAt: -1 })
      .populate("workshopId", "title images city price")
      .lean();

    return NextResponse.json({ bookings });
  } catch (err: any) {
    console.error("bookings list error", err);
    return NextResponse.json({ error: "Could not load bookings" }, { status: 500 });
  }
}