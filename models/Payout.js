import { Schema, models, model } from "mongoose";

const PayoutSchema = new Schema(
  {
    instructorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "queued",
        "pending",
        "processing",
        "processed",
        "reversed",
        "failed",
      ],
      default: "queued",
      required: true,
    },

    razorpayPayoutId: {
      type: String,
      required: true,
      unique: true,
    },

    razorpayFundAccountId: {
      type: String,
      required: true,
    },

    failureReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default models.Payout || model("Payout", PayoutSchema);