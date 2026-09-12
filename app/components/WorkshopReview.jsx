"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

// Drop this into /workshops/[id]/page.jsx, e.g. below the Book Now button:
//   <WorkshopReviews workshopId={workshop._id} />

const DIMENSIONS = [
  { key: "experience", label: "Experience" },
  { key: "learning", label: "Learning" },
  { key: "ambiance", label: "Ambiance" },
  { key: "entertainment", label: "Entertainment" },
];

function Stars({ value }) {
  return (
    <span
      aria-label={`${value} out of 5 stars`}
      style={{ color: "#e0a800", letterSpacing: 1 }}
    >
      {"★".repeat(Math.round(value))}
      {"☆".repeat(5 - Math.round(value))}
    </span>
  );
}

export default function WorkshopReviews({ workshopId }) {
  const { data: session, status } = useSession();

  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({
    count: 0,
    average: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [canReview, setCanReview] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  const [ratings, setRatings] = useState({
    experience: 5,
    learning: 5,
    ambiance: 5,
    entertainment: 5,
  });

  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function loadReviews() {
    setLoading(true);

    fetch(`/api/workshops/${workshopId}/reviews`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          throw new Error(data.error);
        }

        setReviews(data.reviews || []);
        setSummary(
          data.summary || {
            count: 0,
            average: 0,
          }
        );
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadReviews();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workshopId]);

  useEffect(() => {
    if (status !== "authenticated") {
      setCheckingEligibility(false);
      return;
    }

    Promise.all([
      fetch("/api/bookings").then((res) => res.json()),
      fetch(`/api/workshops/${workshopId}/reviews`).then((res) =>
        res.json()
      ),
    ])
      .then(([bookingsData, reviewsData]) => {
        const hasConfirmedBooking = (
          bookingsData.bookings || []
        ).some(
          (b) =>
            b.workshopId?._id === workshopId &&
            b.status === "confirmed"
        );

        const alreadyReviewed = (
          reviewsData.reviews || []
        ).some(
          (r) =>
            r.attendeeId?._id === session?.user?.id
        );

        setCanReview(
          hasConfirmedBooking && !alreadyReviewed
        );
      })
      .catch(() => setCanReview(false))
      .finally(() => setCheckingEligibility(false));
  }, [status, workshopId, session?.user?.id]);

  function handleRatingChange(dimension, value) {
    setRatings((prev) => ({
      ...prev,
      [dimension]: Number(value),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch(
        `/api/workshops/${workshopId}/reviews`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...ratings,
            comment,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Could not submit review"
        );
      }

      setComment("");

      setRatings({
        experience: 5,
        learning: 5,
        ambiance: 5,
        entertainment: 5,
      });

      setCanReview(false);
      loadReviews();
    } catch (err) {
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            <Stars value={summary.average} />

            <span style={{ fontWeight: 600 }}>
              {summary.average || "—"}
            </span>

            <span style={{ color: "#666" }}>
              ({summary.count} review
              {summary.count === 1 ? "" : "s"})
            </span>
          </div>

          {error && (
            <p style={{ color: "red" }}>{error}</p>
          )}

          {reviews.length === 0 ? (
            <p style={{ color: "#666" }}>
              No reviews yet.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              {reviews.map((r) => {
                const overall =
                  (r.experience +
                    r.learning +
                    r.ambiance +
                    r.entertainment) /
                  4;

                return (
                  <div
                    key={r._id}
                    style={{
                      borderBottom: "1px solid #eee",
                      paddingBottom: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <strong>
                        {r.attendeeId?.name ||
                          "Anonymous"}
                      </strong>

                      <span
                        style={{
                          color: "#999",
                          fontSize: "0.8rem",
                        }}
                      >
                        {new Date(
                          r.createdAt
                        ).toLocaleDateString()}
                      </span>
                    </div>

                    <div style={{ marginTop: "0.35rem" }}>
                      <Stars value={overall} />
                      <span
                        style={{
                          marginLeft: "0.4rem",
                          fontSize: "0.85rem",
                          color: "#666",
                        }}
                      >
                        {overall.toFixed(1)}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(2, minmax(0, 1fr))",
                        gap: "0.25rem 1rem",
                        marginTop: "0.5rem",
                        fontSize: "0.85rem",
                      }}
                    >
                      {DIMENSIONS.map((dimension) => (
                        <div key={dimension.key}>
                          <span style={{ color: "#666" }}>
                            {dimension.label}:{" "}
                          </span>
                          <Stars
                            value={r[dimension.key]}
                          />
                        </div>
                      ))}
                    </div>

                    {r.comment && (
                      <p
                        style={{
                          margin: "0.5rem 0 0",
                        }}
                      >
                        {r.comment}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {!checkingEligibility && canReview && (
        <form
          onSubmit={handleSubmit}
          style={{
            border: "1px solid #eee",
            borderRadius: 8,
            padding: "1rem",
          }}
        >
          <h4 style={{ marginTop: 0 }}>
            Leave a review
          </h4>

          {DIMENSIONS.map((dimension) => (
            <div
              key={dimension.key}
              style={{ marginBottom: "0.75rem" }}
            >
              <label>
                {dimension.label}:{" "}
                <select
                  value={ratings[dimension.key]}
                  onChange={(e) =>
                    handleRatingChange(
                      dimension.key,
                      e.target.value
                    )
                  }
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} star{n === 1 ? "" : "s"}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}

          <textarea
            value={comment}
            onChange={(e) =>
              setComment(e.target.value)
            }
            placeholder="Share your experience... (optional)"
            maxLength={1000}
            rows={4}
            style={{
              width: "100%",
              padding: "0.5rem",
              boxSizing: "border-box",
            }}
          />

          {submitError && (
            <p style={{ color: "red" }}>
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem 1rem",
            }}
          >
            {submitting
              ? "Submitting..."
              : "Submit Review"}
          </button>
        </form>
      )}
    </div>
  );
}