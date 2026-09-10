"use client";

import { useEffect, useState } from "react";

type BankAccount = {
  accountHolderName: string;
  accountNumberLast4: string;
  ifsc: string;
  updatedAt: string;
} | null;

type Balance = {
  totalEarned: number;
  totalPaidOut: number;
  availableBalance: number;
};

type Payout = {
  _id: string;
  amount: number;
  status: string;
  failureReason?: string;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  processed: "#0a7d2c",
  queued: "#a06a00",
  pending: "#a06a00",
  processing: "#a06a00",
  failed: "#c02020",
  reversed: "#c02020",
};

function formatRupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export default function InstructorPayoutsPage() {
  const [bankAccount, setBankAccount] = useState<BankAccount>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Bank account form state
  const [showBankForm, setShowBankForm] = useState(false);
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [savingBank, setSavingBank] = useState(false);
  const [bankError, setBankError] = useState("");

  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState("");

  function loadAll() {
    setLoading(true);
    setError("");
    Promise.all([
      fetch("/api/instructor/bank-account").then((res) => res.json()),
      fetch("/api/instructor/payouts").then((res) => res.json()),
    ])
      .then(([bankData, payoutData]) => {
        if (bankData.error) throw new Error(bankData.error);
        if (payoutData.error) throw new Error(payoutData.error);
        setBankAccount(bankData.account);
        setBalance(payoutData.balance);
        setPayouts(payoutData.payouts || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleSaveBank(e: React.FormEvent) {
    e.preventDefault();
    setSavingBank(true);
    setBankError("");

    try {
      const res = await fetch("/api/instructor/bank-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountHolderName, accountNumber, ifsc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save bank account");

      setShowBankForm(false);
      setAccountHolderName("");
      setAccountNumber("");
      setIfsc("");
      loadAll();
    } catch (err: any) {
      setBankError(err.message);
    } finally {
      setSavingBank(false);
    }
  }

  async function handleRequestPayout() {
    if (!confirm(`Request a payout of ${balance ? formatRupees(balance.availableBalance) : "your available balance"}?`)) return;

    setRequestingPayout(true);
    setPayoutError("");

    try {
      const res = await fetch("/api/instructor/payouts", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not request payout");
      loadAll();
    } catch (err: any) {
      setPayoutError(err.message);
    } finally {
      setRequestingPayout(false);
    }
  }

  if (loading) return <div style={{ padding: "1rem" }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "1rem" }}>
      <h2>Payouts</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Bank account section */}
      <div style={{ border: "1px solid #eee", borderRadius: 8, padding: "1rem", marginBottom: "1.5rem" }}>
        <h3 style={{ marginTop: 0 }}>Bank Account</h3>

        {bankAccount && !showBankForm ? (
          <div>
            <p style={{ margin: "0.25rem 0" }}>{bankAccount.accountHolderName}</p>
            <p style={{ margin: "0.25rem 0", color: "#666" }}>
              A/C ending in {bankAccount.accountNumberLast4} · {bankAccount.ifsc}
            </p>
            <button onClick={() => setShowBankForm(true)} style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
              Update bank details
            </button>
          </div>
        ) : (
          <form onSubmit={handleSaveBank}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", maxWidth: 320 }}>
              <input
                type="text"
                placeholder="Account holder name"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                required
                style={{ padding: "0.5rem" }}
              />
              <input
                type="text"
                placeholder="Account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
                style={{ padding: "0.5rem" }}
              />
              <input
                type="text"
                placeholder="IFSC code"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                required
                style={{ padding: "0.5rem" }}
              />
            </div>
            {bankError && <p style={{ color: "red" }}>{bankError}</p>}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
              <button type="submit" disabled={savingBank}>
                {savingBank ? "Saving..." : "Save"}
              </button>
              {bankAccount && (
                <button type="button" onClick={() => setShowBankForm(false)}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        {!bankAccount && !showBankForm && (
          <button onClick={() => setShowBankForm(true)}>Add bank account</button>
        )}
      </div>

      {/* Balance + request payout */}
      {balance && (
        <div style={{ border: "1px solid #eee", borderRadius: 8, padding: "1rem", marginBottom: "1.5rem" }}>
          <h3 style={{ marginTop: 0 }}>Balance</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.8rem", color: "#666" }}>Total earned</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>{formatRupees(balance.totalEarned)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.8rem", color: "#666" }}>Paid out</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>{formatRupees(balance.totalPaidOut)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.8rem", color: "#666" }}>Available</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 600, color: "#0a7d2c" }}>
                {formatRupees(balance.availableBalance)}
              </div>
            </div>
          </div>

          <button
            onClick={handleRequestPayout}
            disabled={requestingPayout || !bankAccount || balance.availableBalance <= 0}
            style={{ padding: "0.6rem 1.2rem" }}
          >
            {requestingPayout ? "Requesting..." : "Request Payout"}
          </button>
          {!bankAccount && (
            <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.5rem" }}>
              Add a bank account above before requesting a payout.
            </p>
          )}
          {payoutError && <p style={{ color: "red" }}>{payoutError}</p>}
        </div>
      )}

      {/* Payout history */}
      <div>
        <h3>History</h3>
        {payouts.length === 0 ? (
          <p style={{ color: "#666" }}>No payouts yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {payouts.map((p) => (
              <div
                key={p._id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  border: "1px solid #eee",
                  borderRadius: 6,
                  padding: "0.6rem 0.75rem",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{formatRupees(p.amount)}</div>
                  <div style={{ fontSize: "0.8rem", color: "#999" }}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </div>
                  {p.failureReason && (
                    <div style={{ fontSize: "0.8rem", color: "#c02020" }}>{p.failureReason}</div>
                  )}
                </div>
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: STATUS_COLORS[p.status] || "#666",
                    textTransform: "capitalize",
                  }}
                >
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}