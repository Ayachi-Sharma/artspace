import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import Workshop from "@/models/Workshop";
import Booking from "@/models/Booking";
import Payout from "@/models/Payout";
import { attemptRefundWithRetry } from "@/lib/refund";

// Configure this exact URL + RAZORPAY_WEBHOOK_SECRET in the Razorpay
// dashboard (Settings > Webhooks), subscribed to:
//   - payment.captured  (safety net if the client never calls /verify)
//   - refund.processed  (confirms a refund actually settled)
//   - refund.failed     (confirms a refund was rejected on Razorpay's side,
//                        as opposed to our API call itself erroring out —
//                        see lib/refund.ts for that path)
//   - payout.processed / payout.failed / payout.reversed
//                       (RazorpayX instructor payout status updates)

export async function POST(req) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature || !process.env.RAZORPAY_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Missing signature or secret" },
      { status: 400 }
    );
  }

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  if (expected !== signature) {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  const event = JSON.parse(rawBody);
  await connectDB();

  switch (event.event) {
    case "payment.captured":
      await handlePaymentCaptured(event);
      break;

    case "refund.processed":
      await handleRefundStatusUpdate(event, "processed");
      break;

    case "refund.failed":
      await handleRefundStatusUpdate(event, "failed");
      break;

    case "payout.processed":
      await handlePayoutStatusUpdate(event, "processed");
      break;

    case "payout.failed":
      await handlePayoutStatusUpdate(event, "failed");
      break;

    case "payout.reversed":
      await handlePayoutStatusUpdate(event, "reversed");
      break;

    // Unhandled event types fall through — Razorpay sends many more than
    // we care about (order.paid, payment.failed, etc). No action needed.
  }

  // Always 200 so Razorpay doesn't retry-storm on events we don't handle.
  return NextResponse.json({ received: true });
}

async function handlePaymentCaptured(event) {
  const payment = event.payload?.payment?.entity;
  const orderId = payment?.order_id;
  const paymentId = payment?.id;

  if (!orderId) return;

  const booking = await Booking.findOne({ razorpayOrderId: orderId });

  // Idempotent — skip if /api/payments/verify already confirmed it.
  if (!booking || booking.status !== "pending") return;

  const workshop = await Workshop.findOneAndUpdate(
    {
      _id: booking.workshopId,
      $expr: { $lt: ["$seatsBooked", "$capacity"] },
    },
    { $inc: { seatsBooked: 1 } },
    { new: true }
  );

  if (workshop) {
    booking.status = "confirmed";
    booking.razorpayPaymentId = paymentId;
    await booking.save();
  } else {
    booking.status = "failed";
    booking.razorpayPaymentId = paymentId;

    const result = await attemptRefundWithRetry({
      bookingId: String(booking._id),
      razorpayPaymentId: paymentId,
      amount: booking.amount,
      reason: "sold_out_race_webhook",
    });

    if (result.success) {
      booking.razorpayRefundId = result.refundId;
      booking.refundStatus = "processing";
    } else {
      booking.refundStatus = "failed";
      // A FailedRefund record was created for manual follow-up.
    }

    await booking.save();
  }
}

// Confirms the final state of a refund we already initiated (either from a
// cancellation or the sold-out race case). This is what actually flips
// refundStatus out of "processing" — until this fires, "processing" just
// means "we asked Razorpay to refund it", not that money has moved.
async function handleRefundStatusUpdate(event, finalStatus) {
  const refund = event.payload?.refund?.entity;
  const refundId = refund?.id;

  if (!refundId) return;

  const booking = await Booking.findOne({ razorpayRefundId: refundId });

  if (!booking) return;

  // Idempotent — a duplicate webhook delivery shouldn't overwrite an
  // already-settled status.
  if (
    booking.refundStatus === "processed" ||
    booking.refundStatus === finalStatus
  ) {
    return;
  }

  booking.refundStatus = finalStatus;
  await booking.save();

  if (finalStatus === "failed") {
    // Razorpay accepted our refund request but it was ultimately rejected
    // (e.g. original payment method can't accept refunds). This is a
    // different failure mode than our API call erroring — that path already
    // creates a FailedRefund via lib/refund.ts, but this one only surfaces
    // here, so create the record now.
    const FailedRefund = (
      await import("@/models/FailedRefund")
    ).default;

    await FailedRefund.create({
      bookingId: booking._id,
      razorpayPaymentId: booking.razorpayPaymentId,
      amount: booking.amount,
      reason: "refund_rejected_by_razorpay",
      lastError:
        refund?.error_description ||
        "Refund rejected by Razorpay after being accepted for processing",
      attempts: 1,
    });
  }
}

// Confirms the final state of an instructor payout. "processed" means the
// money actually landed in their bank account; "failed" means it never went
// out (e.g. bad account details); "reversed" means it was sent but bounced
// back (e.g. account closed) — in both failure cases the instructor's
// available balance should show the money as theirs again, which happens
// automatically since getInstructorBalance() excludes failed/reversed
// payouts from totalPaidOut.
async function handlePayoutStatusUpdate(event, finalStatus) {
  const payoutEntity = event.payload?.payout?.entity;
  const razorpayPayoutId = payoutEntity?.id;

  if (!razorpayPayoutId) return;

  const payout = await Payout.findOne({ razorpayPayoutId });

  if (!payout) return;

  // Idempotent — a duplicate webhook delivery shouldn't overwrite an
  // already-settled status.
  if (payout.status === finalStatus) return;

  payout.status = finalStatus;

  if (finalStatus === "failed" || finalStatus === "reversed") {
    payout.failureReason =
      payoutEntity?.failure_reason ||
      `Payout ${finalStatus} by RazorpayX`;
  }

  await payout.save();
}