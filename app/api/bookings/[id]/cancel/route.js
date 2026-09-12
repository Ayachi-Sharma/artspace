import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workshop from "@/models/Workshop";
import Booking from "@/models/Booking";
import { attemptRefundWithRetry } from "@/lib/refund";

// POST /api/bookings/[id]/cancel
// Attendee-only, ownership-checked. Cancels a confirmed (or pending) booking,
// releases the seat back to the workshop, and issues a full refund via
// Razorpay if a payment had actually gone through.
//
// Cutoff policy: cancellation is blocked within CANCELLATION_CUTOFF_HOURS of
// the workshop's earliest sessionDate.

const CANCELLATION_CUTOFF_HOURS = 24;

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

    await connectDB();

    const booking = await Booking.findById(id);

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (String(booking.attendeeId) !== String(session.user.id)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    if (booking.status === "cancelled") {
      return NextResponse.json(
        { error: "Booking already cancelled" },
        { status: 409 }
      );
    }

    if (booking.status === "failed") {
      return NextResponse.json(
        {
          error:
            "This booking never succeeded — nothing to cancel",
        },
        { status: 409 }
      );
    }

    const workshop = await Workshop.findById(booking.workshopId);

    if (!workshop) {
      return NextResponse.json(
        { error: "Workshop not found" },
        { status: 404 }
      );
    }

    if (workshop.sessionDates?.length) {
      const earliestStart = new Date(
        Math.min(
          ...workshop.sessionDates.map(
            (d) => new Date(d).getTime()
          )
        )
      );

      const hoursUntilStart =
        (earliestStart.getTime() - Date.now()) /
        (1000 * 60 * 60);

      if (hoursUntilStart < CANCELLATION_CUTOFF_HOURS) {
        return NextResponse.json(
          {
            error:
              hoursUntilStart < 0
                ? "This workshop has already started — cancellation is no longer available"
                : `Cancellations must be made at least ${CANCELLATION_CUTOFF_HOURS} hours before the workshop starts`,
          },
          { status: 409 }
        );
      }
    }

    const wasConfirmed = booking.status === "confirmed";

    if (wasConfirmed) {
      await Workshop.findOneAndUpdate(
        {
          _id: booking.workshopId,
          $expr: {
            $gt: ["$seatsBooked", 0],
          },
        },
        {
          $inc: {
            seatsBooked: -1,
          },
        }
      );
    }

    if (wasConfirmed && booking.razorpayPaymentId) {
      const result = await attemptRefundWithRetry({
        bookingId: String(booking._id),
        razorpayPaymentId: booking.razorpayPaymentId,
        amount: booking.amount,
        reason: "cancellation",
      });

      if (result.success) {
        booking.razorpayRefundId = result.refundId;
        booking.refundStatus = "processing";
      } else {
        booking.refundStatus = "failed";
      }
    }

    booking.status = "cancelled";
    booking.cancelledAt = new Date();

    await booking.save();

    return NextResponse.json({
      bookingId: booking._id,
      status: booking.status,
      refundStatus: booking.refundStatus,
    });
  } catch (err) {
    console.error("cancel booking error", err);

    return NextResponse.json(
      { error: "Could not cancel booking" },
      { status: 500 }
    );
  }
}