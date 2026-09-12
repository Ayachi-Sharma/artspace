import { razorpay } from "../lib/razorpay";
import FailedRefund from "../models/FailedRefund";

// Wraps razorpay.payments.refund() with retries + backoff, and records a
// FailedRefund + (optionally) pings Slack if every attempt fails. Call sites
// (cancel/verify/webhook routes) call this instead of hitting the Razorpay
// SDK directly, so all three share the same retry/alert behavior.

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [500, 2000]; // wait before attempt 2 and attempt 3

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function attemptRefundWithRetry(params) {
  const { bookingId, razorpayPaymentId, amount, reason } = params;

  let lastError = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const refund = await razorpay.payments.refund(razorpayPaymentId, {
        amount,
        speed: "normal",
      });

      return {
        success: true,
        refundId: refund.id,
      };
    } catch (err) {
      lastError =
        err?.error?.description ||
        err?.message ||
        "Unknown Razorpay error";

      console.error(
        `Refund attempt ${attempt}/${MAX_ATTEMPTS} failed for payment ${razorpayPaymentId}:`,
        lastError
      );

      if (attempt < MAX_ATTEMPTS) {
        await sleep(BACKOFF_MS[attempt - 1]);
      }
    }
  }

  // All attempts exhausted — persist for manual follow-up and alert if configured.
  try {
    await FailedRefund.create({
      bookingId,
      razorpayPaymentId,
      amount,
      reason,
      lastError,
      attempts: MAX_ATTEMPTS,
    });
  } catch (dbErr) {
    // If even writing the FailedRefund record fails, this is the last line
    // of defense — make sure it's loud in the logs.
    console.error(
      "CRITICAL: could not persist FailedRefund record",
      dbErr
    );
  }

  await notifySlack(
    `🚨 Refund failed after ${MAX_ATTEMPTS} attempts\nBooking: ${bookingId}\nPayment: ${razorpayPaymentId}\nAmount: ₹${(
      amount / 100
    ).toFixed(2)}\nReason: ${reason}\nError: ${lastError}`
  );

  return {
    success: false,
    error: lastError,
  };
}

async function notifySlack(text) {
  const webhookUrl = process.env.SLACK_REFUND_ALERT_WEBHOOK_URL;

  if (!webhookUrl) return; // optional — silently skip if not configured

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    console.error("Slack refund alert failed to send", err);
  }
}