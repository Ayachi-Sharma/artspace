import mongoose, { Schema, models, model } from "mongoose";

// ASSUMPTION: adjust the import path/name if your workshop/user models live
// elsewhere or use a different id type.

export type BookingStatus = "pending" | "confirmed" | "failed" | "cancelled";

export interface IBooking {
  attendeeId: mongoose.Types.ObjectId;
  workshopId: mongoose.Types.ObjectId;
  status: BookingStatus;
  amount: number; // in paise (smallest currency unit), matches Razorpay convention
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
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
  },
  { timestamps: true }
);

// Prevent the same user from holding multiple *pending* bookings for the
// same workshop indefinitely (stale carts). Not a hard DB constraint —
// enforced in the create-order route instead, since partial unique indexes
// on a single status value are awkward across mongoose versions.

export default models.Booking || model<IBooking>("Booking", BookingSchema);