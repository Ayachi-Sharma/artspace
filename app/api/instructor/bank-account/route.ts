import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // ASSUMPTION: see other routes
import { connectDB } from "@/lib/db";
import InstructorBankAccount from "@/models/InstructorBankAccount";
import { createContact, createFundAccount } from "@/lib/razorpayx";

// Basic IFSC format check: 4 letters, 0, then 6 alphanumeric.
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "instructor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const account = await InstructorBankAccount.findOne({ instructorId: session.user.id }).lean();

    if (!account) {
      return NextResponse.json({ account: null });
    }

    return NextResponse.json({
      account: {
        accountHolderName: account.accountHolderName,
        accountNumberLast4: account.accountNumberLast4,
        ifsc: account.ifsc,
        updatedAt: account.updatedAt,
      },
    });
  } catch (err: any) {
    console.error("get bank account error", err);
    return NextResponse.json({ error: "Could not load bank account" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "instructor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountHolderName, accountNumber, ifsc } = await req.json();

    if (!accountHolderName || !accountNumber || !ifsc) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (!IFSC_REGEX.test(ifsc.toUpperCase())) {
      return NextResponse.json({ error: "Invalid IFSC code" }, { status: 400 });
    }
    if (!/^\d{6,20}$/.test(accountNumber)) {
      return NextResponse.json({ error: "Invalid account number" }, { status: 400 });
    }

    await connectDB();

    // Every save creates a fresh RazorpayX contact + fund account rather
    // than trying to update an existing one — RazorpayX fund accounts are
    // effectively immutable once created (you deactivate + recreate to
    // "change" bank details), so this keeps the logic simple. The old
    // fund account, if any, is just orphaned on RazorpayX's side (no cost,
    // no action needed).
    const contact = await createContact({
      name: session.user.name || accountHolderName,
      email: session.user.email,
      referenceId: session.user.id,
    });

    const fundAccount = await createFundAccount({
      contactId: contact.id,
      accountHolderName,
      accountNumber,
      ifsc: ifsc.toUpperCase(),
    });

    await InstructorBankAccount.findOneAndUpdate(
      { instructorId: session.user.id },
      {
        instructorId: session.user.id,
        accountHolderName,
        accountNumberLast4: accountNumber.slice(-4),
        ifsc: ifsc.toUpperCase(),
        razorpayContactId: contact.id,
        razorpayFundAccountId: fundAccount.id,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("save bank account error", err);
    return NextResponse.json({ error: "Could not save bank account" }, { status: 500 });
  }
}