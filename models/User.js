import { Schema, models, model } from "mongoose";

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    role: {
      type: String,
      enum: ["instructor", "attendee"],
      required: true,
      default: "instructor",
    },

    city: {
      type: String,
      enum: ["Jaipur", "Udaipur", "Ahmedabad", "Pune"],
      required: false,
    },

    verified: {
      type: Boolean,
      default: true,
    },

    bio: {
      type: String,
      maxlength: 400,
    },

    profileImage: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const User = models.User || model("User", UserSchema);

export default User;