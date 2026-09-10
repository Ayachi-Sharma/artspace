import mongoose from "mongoose";
import Workshop from "@/models/Workshop";
import Booking from "@/models/Booking";
import Payout from "@/models/Payout";

// Available balance = sum of `confirmed` bookings across all of the
// instructor's workshops, minus payouts already made (or in flight).
// Cancelled/failed bookings are excluded automatically since they're never
// `confirmed`. Payouts in "queued"/"pending"/"processing"/"processed" all
// count against the balance (only "failed"/"reversed" don't) — otherwise an
// instructor could double-request while a payout is still in flight.
export async function getInstructorBalance(instructorId: string): Promise<{
  totalEarned: number; // paise, all-time from confirmed bookings
  totalPaidOut: number; // paise, sum of non-failed/non-reversed payouts
  availableBalance: number; // paise, what they can request right now
}> {
  const workshops = await Workshop.find({ instructorId }).select("_id").lean();
  const workshopIds = workshops.map((w) => w._id);

  const earnedResult = await Booking.aggregate([
    { $match: { workshopId: { $in: workshopIds }, status: "confirmed" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const totalEarned = earnedResult[0]?.total || 0;

  const paidOutResult = await Payout.aggregate([
    {
      $match: {
        instructorId: new mongoose.Types.ObjectId(instructorId),
        status: { $nin: ["failed", "reversed"] },
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const totalPaidOut = paidOutResult[0]?.total || 0;

  return {
    totalEarned,
    totalPaidOut,
    availableBalance: Math.max(0, totalEarned - totalPaidOut),
  };
}