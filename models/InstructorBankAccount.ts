import mongoose, { Schema, models, model } from "mongoose";

// One bank account per instructor (last one saved wins — re-saving replaces
// it). We deliberately do NOT persist the full account number after the
// RazorpayX fund account is created: only the last 4 digits, for display
// ("...1234"), plus RazorpayX's own IDs which are what payouts actually
// reference.

export interface IInstructorBankAccount {
  instructorId: mongoose.Types.ObjectId;
  accountHolderName: string;
  accountNumberLast4: string;
  ifsc: string;
  razorpayContactId: string;
  razorpayFundAccountId: string;
  createdAt: Date;
  updatedAt: Date;
}

const InstructorBankAccountSchema = new Schema<IInstructorBankAccount>(
  {
    instructorId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    accountHolderName: { type: String, required: true },
    accountNumberLast4: { type: String, required: true },
    ifsc: { type: String, required: true },
    razorpayContactId: { type: String, required: true },
    razorpayFundAccountId: { type: String, required: true },
  },
  { timestamps: true }
);

export default models.InstructorBankAccount ||
  model<IInstructorBankAccount>("InstructorBankAccount", InstructorBankAccountSchema);