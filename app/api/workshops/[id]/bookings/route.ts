import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workshop from "@/models/Workshop";
import Booking from "@/models/Booking";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectDB();

    const workshop = await Workshop.findById(id).lean();
    if (!workshop) {
      return NextResponse.json({ error: "Workshop not found" }, { status: 404 });
    }

    if (String((workshop as any).instructorId) !== String(session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const bookings = await Booking.find({ workshopId: id })
      .populate("attendeeId", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const confirmedBookings = bookings.filter((b: any) => b.status === "confirmed");
    const revenue = confirmedBookings.reduce(
      (sum: number, b: any) => sum + (b.amount || 0),
      0
    );

    return NextResponse.json({
      workshop: {
        _id: (workshop as any)._id,
        title: (workshop as any).title,
        capacity: (workshop as any).capacity,
        seatsBooked: (workshop as any).seatsBooked,
        price: (workshop as any).price,
      },
      summary: {
        totalBookings: bookings.length,
        confirmedCount: confirmedBookings.length,
        revenue,
      },
      bookings,
    });
  } catch (err: any) {
    console.error("get workshop bookings error", err);
    return NextResponse.json(
      { error: "Could not fetch bookings" },
      { status: 500 }
    );
  }
}