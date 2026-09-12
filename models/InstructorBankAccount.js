import { Schema, models, model } from "mongoose";

// One bank account per instructor.
// Only the last 4 digits are persisted after the RazorpayX
// fund account is created.

const InstructorBankAccountSchema = new Schema(
  {
    instructorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    accountHolderName: {
      type: String,
      required: true,
    },

    accountNumberLast4: {
      type: String,
      required: true,
    },

    ifsc: {
      type: String,
      required: true,
    },

    razorpayContactId: {
      type: String,
      required: true,
    },

    razorpayFundAccountId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default (
  models.InstructorBankAccount ||
  model("InstructorBankAccount", InstructorBankAccountSchema)
);