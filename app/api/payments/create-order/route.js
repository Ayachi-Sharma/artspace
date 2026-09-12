import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workshop from "@/models/Workshop";
import Booking from "@/models/Booking";
import { razorpay } from "@/lib/razorpay";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { workshopId } = await req.json();

    if (!workshopId) {
      return NextResponse.json(
        { error: "workshopId is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const workshop = await Workshop.findById(workshopId);

    if (!workshop) {
      return NextResponse.json(
        { error: "Workshop not found" },
        { status: 404 }
      );
    }

    const seatsLeft =
      workshop.capacity - workshop.seatsBooked;

    if (seatsLeft <= 0) {
      return NextResponse.json(
        { error: "This workshop is sold out" },
        { status: 409 }
      );
    }

    // Block a user from stacking multiple pending bookings
    // for the same workshop.
    const existingPending = await Booking.findOne({
      attendeeId: session.user.id,
      workshopId,
      status: "pending",
    });

    if (existingPending) {
      return NextResponse.json({
        bookingId: existingPending._id,
        orderId: existingPending.razorpayOrderId,
        amount: existingPending.amount,
        currency: "INR",
        keyId: process.env.RAZORPAY_KEY_ID,
      });
    }

    const amountInPaise = Math.round(
      workshop.price * 100
    );

    // Create booking first so we have a Mongo _id
    // to use as the Razorpay receipt.
    const booking = await Booking.create({
      attendeeId: session.user.id,
      workshopId,
      status: "pending",
      amount: amountInPaise,
      razorpayOrderId: `pending_${new Date().getTime()}`,
    });

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: booking._id.toString(),
      notes: {
        workshopId: String(workshopId),
        attendeeId: String(session.user.id),
        bookingId: booking._id.toString(),
      },
    });

    booking.razorpayOrderId = order.id;

    await booking.save();

    return NextResponse.json({
      bookingId: booking._id,
      orderId: order.id,
      amount: amountInPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      workshopTitle: workshop.title,
    });
  } catch (err) {
    console.error("create-order error", err);

    return NextResponse.json(
      { error: "Could not create order" },
      { status: 500 }
    );
  }
}