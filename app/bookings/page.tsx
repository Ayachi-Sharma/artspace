"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Booking = {
  _id: string;
  status: "pending" | "confirmed" | "failed" | "cancelled";
  amount: number;
  createdAt: string;
  workshopId: {
    _id: string;
    title: string;
    images: string[];
    city: string;
    price: number;
  };
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: "#0a7d2c",
  pending: "#a06a00",
  failed: "#c02020",
  cancelled: "#888",
};

export default function BookingsPage() {
  const searchParams = useSearchParams();
  const justConfirmed = searchParams.get("confirmed");

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/bookings")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setBookings(data.bookings || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "1rem" }}>
      <h2>My Bookings</h2>

      {justConfirmed && (
        <div style={{ padding: "0.75rem", background: "#eaffea", borderRadius: 6, marginBottom: "1rem" }}>
          Booking confirmed! 🎉
        </div>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : bookings.length === 0 ? (
        <p>
          No bookings yet. <Link href="/workshops">Browse workshops</Link>
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {bookings.map((b) => (
            <div
              key={b._id}
              style={{
                display: "flex",
                gap: "1rem",
                border: "1px solid #eee",
                borderRadius: 8,
                padding: "0.75rem",
                alignItems: "center",
              }}
            >
              <div style={{ width: 80, height: 60, background: "#f5f5f5", borderRadius: 4, flexShrink: 0 }}>
                {b.workshopId?.images?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.workshopId.images[0]}
                    alt={b.workshopId.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 4 }}
                  />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <Link href={`/workshops/${b.workshopId?._id}`} style={{ fontWeight: 600, textDecoration: "none", color: "inherit" }}>
                  {b.workshopId?.title || "Workshop"}
                </Link>
                <div style={{ fontSize: "0.85rem", color: "#666" }}>
                  ₹{(b.amount / 100).toFixed(0)} · {new Date(b.createdAt).toLocaleDateString()}
                </div>
              </div>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: STATUS_COLORS[b.status] || "#666",
                  textTransform: "capitalize",
                }}
              >
                {b.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}