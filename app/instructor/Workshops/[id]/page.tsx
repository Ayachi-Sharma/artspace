"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Attendee = {
  _id: string;
  status: "pending" | "confirmed" | "failed" | "cancelled";
  amount: number;
  createdAt: string;
  attendeeId: {
    _id: string;
    name: string;
    email: string;
  };
};

type DashboardData = {
  workshop: {
    _id: string;
    title: string;
    capacity: number;
    seatsBooked: number;
    price: number;
  };
  summary: {
    totalBookings: number;
    confirmedCount: number;
    revenue: number; // paise
  };
  bookings: Attendee[];
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: "#0a7d2c",
  pending: "#a06a00",
  failed: "#c02020",
  cancelled: "#888",
};

export default function InstructorWorkshopDashboard() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/workshops/${id}/bookings`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: "1rem" }}>Loading...</div>;
  if (error) return <div style={{ padding: "1rem", color: "red" }}>{error}</div>;
  if (!data) return null;

  const { workshop, summary, bookings } = data;
  const seatsLeft = workshop.capacity - workshop.seatsBooked;

  function exportToCsv() {
    const headers = ["Name", "Email", "Amount (INR)", "Booked On", "Status"];

    // Escape a field per CSV rules: wrap in quotes if it contains a comma,
    // quote, or newline, and double up any internal quotes.
    const escapeCsvField = (value: string) => {
      if (/[",\n]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const rows = bookings.map((b) => [
      b.attendeeId?.name || "",
      b.attendeeId?.email || "",
      (b.amount / 100).toFixed(2),
      new Date(b.createdAt).toLocaleDateString(),
      b.status,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((field) => escapeCsvField(String(field))).join(","))
      .join("\n");

    // Prepend a UTF-8 BOM so Excel opens it correctly instead of mangling
    // any non-ASCII characters in attendee names.
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    const safeTitle = workshop.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    link.download = `${safeTitle}-attendees-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "1rem" }}>
      <h2>{workshop.title}</h2>
      <p style={{ color: "#666" }}>
        {workshop.seatsBooked} / {workshop.capacity} seats booked · {seatsLeft} left
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
          margin: "1.5rem 0",
        }}
      >
        <StatCard label="Confirmed bookings" value={summary.confirmedCount} />
        <StatCard label="Total attempts" value={summary.totalBookings} />
        <StatCard label="Revenue" value={`₹${(summary.revenue / 100).toLocaleString("en-IN")}`} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3>Attendees</h3>
        {bookings.length > 0 && (
          <button
            onClick={exportToCsv}
            style={{
              padding: "0.4rem 0.9rem",
              fontSize: "0.85rem",
              border: "1px solid #ccc",
              borderRadius: 6,
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Export CSV
          </button>
        )}
      </div>
      {bookings.length === 0 ? (
        <p>No bookings yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
              <th style={{ padding: "0.5rem" }}>Name</th>
              <th style={{ padding: "0.5rem" }}>Email</th>
              <th style={{ padding: "0.5rem" }}>Amount</th>
              <th style={{ padding: "0.5rem" }}>Booked on</th>
              <th style={{ padding: "0.5rem" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b._id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                <td style={{ padding: "0.5rem" }}>{b.attendeeId?.name || "—"}</td>
                <td style={{ padding: "0.5rem" }}>{b.attendeeId?.email || "—"}</td>
                <td style={{ padding: "0.5rem" }}>₹{(b.amount / 100).toFixed(0)}</td>
                <td style={{ padding: "0.5rem" }}>{new Date(b.createdAt).toLocaleDateString()}</td>
                <td
                  style={{
                    padding: "0.5rem",
                    color: STATUS_COLORS[b.status] || "#666",
                    fontWeight: 600,
                    textTransform: "capitalize",
                  }}
                >
                  {b.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 8, padding: "1rem" }}>
      <div style={{ fontSize: "0.8rem", color: "#666" }}>{label}</div>
      <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>{value}</div>
    </div>
  );
}