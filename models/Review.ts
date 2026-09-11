import mongoose, { Schema, models, model } from "mongoose";

export interface IReview {
  workshopId: mongoose.Types.ObjectId;
  attendeeId: mongoose.Types.ObjectId;
  experience: number; // 1-5
  learning: number; // 1-5
  ambiance: number; // 1-5
  entertainment: number; // 1-5
  comment?: string;
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    workshopId: { type: Schema.Types.ObjectId, ref: "Workshop", required: true, index: true },
    attendeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    experience: { type: Number, required: true, min: 1, max: 5 },
    learning: { type: Number, required: true, min: 1, max: 5 },
    ambiance: { type: Number, required: true, min: 1, max: 5 },
    entertainment: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 1000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One review per attendee per workshop
ReviewSchema.index({ workshopId: 1, attendeeId: 1 }, { unique: true });

export default models.Review || model<IReview>("Review", ReviewSchema);