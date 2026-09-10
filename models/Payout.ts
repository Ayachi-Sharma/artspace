import mongoose, { Schema, models, model } from "mongoose";

export type PayoutStatus =
  | "queued"
  | "pending"
  | "processing"
  | "processed"
  | "reversed"
  | "failed";

export interface IPayout {
  instructorId: mongoose.Types.ObjectId;
  amount: number; // paise
  status: PayoutStatus;
  razorpayPayoutId: string;
  razorpayFundAccountId: string;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutSchema = new Schema<IPayout>(
  {
    instructorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["queued", "pending", "processing", "processed", "reversed", "failed"],
      default: "queued",
      required: true,
    },
    razorpayPayoutId: { type: String, required: true, unique: true },
    razorpayFundAccountId: { type: String, required: true },
    failureReason: { type: String },
  },
  { timestamps: true }
);

export default models.Payout || model<IPayout>("Payout", PayoutSchema);