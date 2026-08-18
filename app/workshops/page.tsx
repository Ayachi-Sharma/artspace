"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { CITIES } from "@/lib/constants";

type Workshop = {
  _id: string;
  title: string;
  category: string;
  city: string;
  price: number;
  capacity: number;
  seatsBooked: number;
  images: string[];
  averageRating?: number;
  reviewCount?: number;
};

export default function BrowseWorkshopsPage() {
  const { data: session, status } = useSession();

  const [city, setCity] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Default the filter to the logged-in user's city once session loads
  useEffect(() => {
    if (status === "authenticated" && session?.user?.city) {
      setCity(session.user.city);
    }
  }, [status, session]);

  useEffect(() => {
    // Wait for session to resolve before firing the first fetch, so we don't
    // fetch once with no city and again right after with the real city.
    if (status === "loading") return;

    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (category) params.set("category", category);

    fetch(`/api/workshops?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setWorkshops(data.workshops || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [status, city, category]);

  // Categories are free-text on the model (no fixed enum), so build the
  // filter options from what's actually in the currently loaded results.
  const availableCategories = Array.from(new Set(workshops.map((w) => w.category))).sort();

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "1rem" }}>
      <h2>Browse Workshops</h2>

      <div style={{ display: "flex", gap: "1rem", margin: "1rem 0" }}>
        <select value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">All cities</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {availableCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : workshops.length === 0 ? (
        <p>No workshops found for these filters.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "1rem",
          }}
        >
          {workshops.map((w) => {
            const seatsLeft = w.capacity - w.seatsBooked;
            return (
              <Link
                key={w._id}
                href={`/workshops/${w._id}`}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 8,
                  overflow: "hidden",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "4 / 3",
                    background: "#f5f5f5",
                  }}
                >
                  {w.images?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={w.images[0]}
                      alt={w.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )}
                </div>
                <div style={{ padding: "0.75rem" }}>
                  <div style={{ fontWeight: 600 }}>{w.title}</div>
                  <div style={{ fontSize: "0.85rem", color: "#666" }}>{w.category}</div>

                  {(w.reviewCount ?? 0) > 0 && (
                    <div style={{ fontSize: "0.8rem", color: "#e0a800", marginTop: "0.25rem" }}>
                      ★ {w.averageRating}{" "}
                      <span style={{ color: "#999" }}>({w.reviewCount})</span>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem" }}>
                    <span>₹{w.price}</span>
                    <span style={{ color: seatsLeft <= 0 ? "red" : "#666" }}>
                      {seatsLeft > 0 ? `${seatsLeft} seats left` : "Sold out"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}