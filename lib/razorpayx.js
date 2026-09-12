// RazorpayX (contacts / fund accounts / payouts) is called via direct REST
// requests rather than the `razorpay` npm package's client methods.
//
// Why: as of razorpay@2.9.8, the SDK has NO `contacts` or `payouts`
// resource at all (calling razorpay.contacts.create() or
// razorpay.payouts.create() throws "Cannot read properties of undefined").
// It does have `fundAccount.create()`, but its bundled TS types are for a
// *different* Razorpay API (Route/customer fund accounts, keyed by
// customer_id) — not RazorpayX vendor fund accounts (keyed by contact_id).
// The endpoint itself doesn't care (it just forwards whatever you POST),
// but the SDK's types would reject `contact_id` as an unknown property.
// Calling the REST API directly sidesteps all of that.
//
// RazorpayX also typically uses its OWN API key pair (generated under
// Dashboard > Account & Settings > API Keys, scoped for RazorpayX), which
// may differ from your payment-gateway RAZORPAY_KEY_ID/SECRET — hence the
// separate RAZORPAYX_KEY_ID / RAZORPAYX_KEY_SECRET env vars below rather
// than reusing lib/razorpay.ts's client.

const RAZORPAYX_BASE_URL = "https://api.razorpay.com/v1";

function getAuthHeader() {
  const keyId = process.env.RAZORPAYX_KEY_ID;
  const keySecret = process.env.RAZORPAYX_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "RAZORPAYX_KEY_ID / RAZORPAYX_KEY_SECRET env vars are not set"
    );
  }

  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

async function rpxPost(path, body) {
  const res = await fetch(`${RAZORPAYX_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    const message =
      data?.error?.description ||
      `RazorpayX request to ${path} failed (${res.status})`;

    throw new Error(message);
  }

  return data;
}

export async function createContact(params) {
  return rpxPost("/contacts", {
    name: params.name,
    email: params.email,
    type: "vendor",
    reference_id: params.referenceId,
  });
}

export async function createFundAccount(params) {
  return rpxPost("/fund_accounts", {
    contact_id: params.contactId,
    account_type: "bank_account",
    bank_account: {
      name: params.accountHolderName,
      ifsc: params.ifsc,
      account_number: params.accountNumber,
    },
  });
}

export async function createPayout(params) {
  if (!process.env.RAZORPAYX_ACCOUNT_NUMBER) {
    throw new Error("RAZORPAYX_ACCOUNT_NUMBER env var is not set");
  }

  return rpxPost("/payouts", {
    account_number: process.env.RAZORPAYX_ACCOUNT_NUMBER,
    fund_account_id: params.fundAccountId,
    amount: params.amount,
    currency: "INR",
    mode: "IMPS",
    purpose: "payout",
    queue_if_low_balance: true,
    reference_id: params.referenceId,
    narration: params.narration,
  });
}