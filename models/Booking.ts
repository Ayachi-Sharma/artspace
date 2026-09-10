import mongoose, { Schema, models, model } from "mongoose";

export type BookingStatus = "pending" | "confirmed" | "failed" | "cancelled";
export type RefundStatus = "processing" | "processed" | "failed";

export interface IBooking {
  attendeeId: mongoose.Types.ObjectId;
  workshopId: mongoose.Types.ObjectId;
  status: BookingStatus;
  amount: number; // in paise (smallest currency unit), matches Razorpay convention
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  razorpayRefundId?: string;
  refundStatus?: RefundStatus;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    attendeeId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    workshopId: { type: Schema.Types.ObjectId, ref: "Workshop", required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "failed", "cancelled"],
      default: "pending",
      required: true,
    },
    amount: { type: Number, required: true },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    razorpayRefundId: { type: String },
    refundStatus: {
      type: String,
      enum: ["processing", "processed", "failed"],
    },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

export default models.Booking || model<IBooking>("Booking", BookingSchema);