import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import InstructorBankAccount from "@/models/InstructorBankAccount";
import Payout from "@/models/Payout";
import { getInstructorBalance } from "@/lib/instructorBalance";
import { createPayout } from "@/lib/razorpayx";

const MIN_PAYOUT_PAISE = 10000; // ₹100 minimum

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "instructor") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const [balance, payouts] = await Promise.all([
      getInstructorBalance(session.user.id),
      Payout.find({
        instructorId: session.user.id,
      })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return NextResponse.json({
      balance,
      payouts,
    });
  } catch (err) {
    console.error("get payouts error", err);

    return NextResponse.json(
      { error: "Could not load payout info" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "instructor") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const bankAccount = await InstructorBankAccount.findOne({
      instructorId: session.user.id,
    });

    if (!bankAccount) {
      return NextResponse.json(
        {
          error:
            "Add your bank account details before requesting a payout",
        },
        { status: 400 }
      );
    }

    const { availableBalance } = await getInstructorBalance(
      session.user.id
    );

    if (availableBalance < MIN_PAYOUT_PAISE) {
      return NextResponse.json(
        {
          error: `Minimum payout amount is ₹${
            MIN_PAYOUT_PAISE / 100
          }. Your available balance is ₹${(
            availableBalance / 100
          ).toFixed(2)}.`,
        },
        { status: 400 }
      );
    }

    // On-demand payout = the full available balance.
    const amount = availableBalance;

    // Create the Payout record first so we have an _id
    // to pass as RazorpayX's reference_id.
    const payout = await Payout.create({
      instructorId: session.user.id,
      amount,
      status: "queued",
      razorpayPayoutId: `pending_${Date.now()}`,
      razorpayFundAccountId:
        bankAccount.razorpayFundAccountId,
    });

    try {
      const rpxPayout = await createPayout({
        fundAccountId:
          bankAccount.razorpayFundAccountId,
        amount,
        referenceId: payout._id.toString(),
        narration: "Workshop earnings payout",
      });

      payout.razorpayPayoutId = rpxPayout.id;
      payout.status = mapRazorpayxStatus(
        rpxPayout.status
      );

      await payout.save();

      return NextResponse.json({ payout });
    } catch (payoutErr) {
      payout.status = "failed";

      payout.failureReason =
        payoutErr?.error?.description ||
        payoutErr?.message ||
        "Unknown error";

      await payout.save();

      console.error(
        "payout creation failed",
        payoutErr
      );

      return NextResponse.json(
        {
          error:
            "Could not initiate payout — please try again",
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("request payout error", err);

    return NextResponse.json(
      { error: "Could not request payout" },
      { status: 500 }
    );
  }
}

function mapRazorpayxStatus(rpxStatus) {
  const known = [
    "queued",
    "pending",
    "processing",
    "processed",
    "reversed",
    "failed",
  ];

  return known.includes(rpxStatus)
    ? rpxStatus
    : "queued";
}