"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

// Drop this into /workshops/[id]/page.tsx, e.g. below the Book Now button:
//   <WorkshopReviews workshopId={workshop._id} />

type Review = {
  _id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  attendeeId: { _id: string; name: string };
};

function Stars({ value }: { value: number }) {
  return (
    <span aria-label={`${value} out of 5 stars`} style={{ color: "#e0a800", letterSpacing: 1 }}>
      {"★".repeat(Math.round(value))}
      {"☆".repeat(5 - Math.round(value))}
    </span>
  );
}

export default function WorkshopReviews({ workshopId }: { workshopId: string }) {
  const { data: session, status } = useSession();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState({ count: 0, average: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Whether *this* user is eligible to review: has a confirmed booking for
  // this workshop and hasn't already reviewed it.
  const [canReview, setCanReview] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function loadReviews() {
    setLoading(true);
    fetch(`/api/workshops/${workshopId}/reviews`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setReviews(data.reviews || []);
        setSummary(data.summary || { count: 0, average: 0 });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workshopId]);

  // Eligibility check: does this user have a confirmed booking for this
  // workshop, and have they already reviewed it? Reuses the existing
  // GET /api/bookings endpoint rather than adding a new one.
  useEffect(() => {
    if (status !== "authenticated") {
      setCheckingEligibility(false);
      return;
    }

    Promise.all([
      fetch("/api/bookings").then((res) => res.json()),
      fetch(`/api/workshops/${workshopId}/reviews`).then((res) => res.json()),
    ])
      .then(([bookingsData, reviewsData]) => {
        const hasConfirmedBooking = (bookingsData.bookings || []).some(
          (b: any) => b.workshopId?._id === workshopId && b.status === "confirmed"
        );
        const alreadyReviewed = (reviewsData.reviews || []).some(
          (r: Review) => r.attendeeId?._id === session?.user?.id
        );
        setCanReview(hasConfirmedBooking && !alreadyReviewed);
      })
      .catch(() => setCanReview(false))
      .finally(() => setCheckingEligibility(false));
  }, [status, workshopId, session?.user?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch(`/api/workshops/${workshopId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not submit review");

      setComment("");
      setRating(5);
      setCanReview(false);
      loadReviews();
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ marginTop: "2rem" }}>
      <h3>Reviews</h3>

      {loading ? (
        <p>Loading reviews...</p>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <Stars value={summary.average} />
            <span style={{ fontWeight: 600 }}>{summary.average || "—"}</span>
            <span style={{ color: "#666" }}>
              ({summary.count} review{summary.count === 1 ? "" : "s"})
            </span>
          </div>

          {error && <p style={{ color: "red" }}>{error}</p>}

          {reviews.length === 0 ? (
            <p style={{ color: "#666" }}>No reviews yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
              {reviews.map((r) => (
                <div key={r._id} style={{ borderBottom: "1px solid #eee", paddingBottom: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>{r.attendeeId?.name || "Anonymous"}</strong>
                    <span style={{ color: "#999", fontSize: "0.8rem" }}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Stars value={r.rating} />
                  {r.comment && <p style={{ margin: "0.35rem 0 0" }}>{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!checkingEligibility && canReview && (
        <form onSubmit={handleSubmit} style={{ border: "1px solid #eee", borderRadius: 8, padding: "1rem" }}>
          <h4 style={{ marginTop: 0 }}>Leave a review</h4>

          <div style={{ marginBottom: "0.75rem" }}>
            <label>
              Rating:{" "}
              <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} star{n === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional comment..."
            maxLength={1000}
            rows={3}
            style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box" }}
          />

          {submitError && <p style={{ color: "red" }}>{submitError}</p>}

          <button type="submit" disabled={submitting} style={{ marginTop: "0.5rem", padding: "0.5rem 1rem" }}>
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      )}
    </div>
  );
}