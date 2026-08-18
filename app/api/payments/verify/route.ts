import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "crypto";
import { authOptions } from "@/lib/auth"; // ASSUMPTION: see create-order/route.ts
import { connectDB } from "@/lib/db";
import Workshop from "@/models/Workshop";
import Booking from "@/models/Booking";
import { attemptRefundWithRetry } from "@/lib/refund";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
    }

    // Verify the HMAC signature Razorpay sends back to the client. This is
    // the standard order-flow check: sign order_id|payment_id with your key
    // secret and compare.
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    await connectDB();

    const booking = await Booking.findOne({ razorpayOrderId: razorpay_order_id });
    if (!booking) {
      return NextResponse.json({ error: "Booking not found for this order" }, { status: 404 });
    }
    if (String(booking.attendeeId) !== String(session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Idempotent: webhook or a retried client call may hit this twice.
    if (booking.status === "confirmed") {
      return NextResponse.json({ bookingId: booking._id, status: "confirmed" });
    }
    if (booking.status === "failed") {
      return NextResponse.json(
        { error: "This booking already failed — refund was already initiated", bookingId: booking._id, refundStatus: booking.refundStatus },
        { status: 409 }
      );
    }

    // Atomic seat reservation: only succeeds if capacity hasn't been hit in
    // the meantime. $expr compares two fields on the same document.
    const workshop = await Workshop.findOneAndUpdate(
      { _id: booking.workshopId, $expr: { $lt: ["$seatsBooked", "$capacity"] } },
      { $inc: { seatsBooked: 1 } },
      { new: true }
    );

    if (!workshop) {
      // Payment succeeded but the workshop sold out in the meantime (race
      // condition). Refund immediately — the attendee never got a seat, they
      // shouldn't be charged.
      booking.status = "failed";
      booking.razorpayPaymentId = razorpay_payment_id;
      booking.razorpaySignature = razorpay_signature;

      const result = await attemptRefundWithRetry({
        bookingId: String(booking._id),
        razorpayPaymentId: razorpay_payment_id,
        amount: booking.amount,
        reason: "sold_out_race",
      });

      if (result.success) {
        booking.razorpayRefundId = result.refundId;
        booking.refundStatus = "processing";
      } else {
        booking.refundStatus = "failed";
        // A FailedRefund record was created for manual follow-up.
      }

      await booking.save();
      return NextResponse.json(
        {
          error: "Workshop sold out after payment — refund initiated",
          bookingId: booking._id,
          refundStatus: booking.refundStatus,
        },
        { status: 409 }
      );
    }

    booking.status = "confirmed";
    booking.razorpayPaymentId = razorpay_payment_id;
    booking.razorpaySignature = razorpay_signature;
    await booking.save();

    return NextResponse.json({ bookingId: booking._id, status: "confirmed" });
  } catch (err: any) {
    console.error("verify error", err);
    return NextResponse.json({ error: "Could not verify payment" }, { status: 500 });
  }
}