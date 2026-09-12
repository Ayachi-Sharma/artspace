import { Schema, models, model } from "mongoose";

const WorkshopSchema = new Schema(
  {
    instructorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    city: {
      type: String,
      required: true,
    },

    address: {
      type: String,
      required: true,
    },

    mapLink: {
      type: String,
    },

    isRecurring: {
      type: Boolean,
      default: false,
    },

    sessionDates: [
      {
        type: Date,
        required: true,
      },
    ],

    price: {
      type: Number,
      required: true,
    },

    capacity: {
      type: Number,
      required: true,
    },

    seatsBooked: {
      type: Number,
      default: 0,
    },

    images: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  }
);

export default models.Workshop || model("Workshop", WorkshopSchema);