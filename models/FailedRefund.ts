import mongoose, { Schema, models, model } from "mongoose";

// A queue of refunds that failed even after retries. Since there's no admin
// panel yet, this is the source of truth for "money owed, not yet returned"
// — query it directly (Mongo shell / Compass) until there's a UI for it.

export interface IFailedRefund {
  bookingId: mongoose.Types.ObjectId;
  razorpayPaymentId: string;
  amount: number; // paise
  reason: string; // why the refund was attempted (e.g. "cancellation", "sold_out_race")
  lastError: string;
  attempts: number;
  resolved: boolean;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FailedRefundSchema = new Schema<IFailedRefund>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    razorpayPaymentId: { type: String, required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    lastError: { type: String, required: true },
    attempts: { type: Number, required: true, default: 1 },
    resolved: { type: Boolean, default: false, index: true },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

export default models.FailedRefund || model<IFailedRefund>("FailedRefund", FailedRefundSchema);