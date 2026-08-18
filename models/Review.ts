import mongoose, { Schema, models, model } from "mongoose";

export interface IReview {
  workshopId: mongoose.Types.ObjectId;
  attendeeId: mongoose.Types.ObjectId;
  rating: number; // 1-5
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    workshopId: { type: Schema.Types.ObjectId, ref: "Workshop", required: true, index: true },
    attendeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);

// One review per attendee per workshop.
ReviewSchema.index({ workshopId: 1, attendeeId: 1 }, { unique: true });

export default models.Review || model<IReview>("Review", ReviewSchema);