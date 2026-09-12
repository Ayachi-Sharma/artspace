import { Schema, models, model } from "mongoose";

const BookingSchema = new Schema(
  {
    attendeeId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    workshopId: {
      type: Schema.Types.ObjectId,
      ref: "Workshop",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "failed", "cancelled"],
      default: "pending",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },

    razorpayPaymentId: {
      type: String,
    },

    razorpaySignature: {
      type: String,
    },

    razorpayRefundId: {
      type: String,
    },

    refundStatus: {
      type: String,
      enum: ["processing", "processed", "failed"],
    },

    cancelledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export default models.Booking || model("Booking", BookingSchema);