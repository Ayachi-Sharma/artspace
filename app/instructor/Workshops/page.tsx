"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

type Workshop = {
  _id: string;
  title: string;
  category: string;
  city: string;
  price: number;
  capacity: number;
  seatsBooked: number;
  images: string[];
};

export default function MyWorkshopsPage() {
  const { data: session, status } = useSession();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || session?.user?.role !== "instructor") {
      setLoading(false);
      return;
    }

    fetch("/api/workshops?mine=true")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setWorkshops(data.workshops || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [status, session]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this workshop? This can't be undone.")) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/workshops/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setWorkshops((prev) => prev.filter((w) => w._id !== id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  if (status === "loading" || loading) return <p>Loading...</p>;
  if (status === "unauthenticated" || session?.user?.role !== "instructor") {
    return <p>Only instructors can access this page.</p>;
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2>My Workshops</h2>
        <Link href="/instructor/workshops/new">+ New Workshop</Link>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {workshops.length === 0 ? (
        <p>You haven&apos;t created any workshops yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
          {workshops.map((w) => (
            <div
              key={w._id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                border: "1px solid #eee",
                borderRadius: 8,
                padding: "0.75rem",
              }}
            >
              {w.images?.[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={w.images[0]}
                  alt={w.title}
                  style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 6 }}
                />
              )}

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{w.title}</div>
                <div style={{ fontSize: "0.85rem", color: "#666" }}>
                  {w.category} · {w.city} · ₹{w.price}
                </div>
                <div style={{ fontSize: "0.85rem", color: "#666" }}>
                  {w.seatsBooked}/{w.capacity} seats booked
                </div>
              </div>

              <Link href={`/workshops/${w._id}`}>View</Link>
              <button onClick={() => handleDelete(w._id)} disabled={deletingId === w._id}>
                {deletingId === w._id ? "Deleting..." : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
