import { Schema, models, model } from "mongoose";

// A queue of refunds that failed even after retries.
// This is the source of truth for money owed but not yet returned.

const FailedRefundSchema = new Schema(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },

    razorpayPaymentId: {
      type: String,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    reason: {
      type: String,
      required: true,
    },

    lastError: {
      type: String,
      required: true,
    },

    attempts: {
      type: Number,
      required: true,
      default: 1,
    },

    resolved: {
      type: Boolean,
      default: false,
      index: true,
    },

    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export default models.FailedRefund ||
  model("FailedRefund", FailedRefundSchema);