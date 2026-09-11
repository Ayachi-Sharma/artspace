"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

type Instructor = {
  _id: string;
  name: string;
  bio?: string;
};

type Workshop = {
  _id: string;
  title: string;
  category: string;
  description: string;
  city: string;
  address: string;
  mapLink?: string;
  isRecurring: boolean;
  sessionDates: string[];
  price: number;
  capacity: number;
  seatsBooked: number;
  images: string[];
  instructorId: Instructor | string;
};

type Review = {
  _id: string;
  experience: number;
  learning: number;
  ambiance: number;
  entertainment: number;
  comment?: string;
  createdAt: string;
  attendeeId: { _id: string; name: string } | string;
};

const DIMENSIONS = ["experience", "learning", "ambiance", "entertainment"] as const;

export default function WorkshopDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { data: session } = useSession();

  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewSummary, setReviewSummary] = useState({ count: 0, average: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Review form state
  const [scores, setScores] = useState({ experience: 5, learning: 5, ambiance: 5, entertainment: 5 });
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const loadAll = () => {
    Promise.all([
      fetch(`/api/workshops/${id}`).then((res) => res.json()),
      fetch(`/api/workshops/${id}/reviews`).then((res) => res.json()),
    ])
      .then(([workshopData, reviewData]) => {
        if (workshopData.error) throw new Error(workshopData.error);
        setWorkshop(workshopData.workshop);

        if (!reviewData.error) {
          setReviews(reviewData.reviews || []);
          setReviewSummary(reviewData.summary || { count: 0, average: 0 });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!id) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!workshop) return <p>Workshop not found.</p>;

  const seatsLeft = workshop.capacity - workshop.seatsBooked;
  const instructor =
    typeof workshop.instructorId === "object" ? workshop.instructorId : null;
  const isInstructor = session?.user?.role === "instructor";

  const alreadyReviewed = reviews.some(
    (r) => typeof r.attendeeId === "object" && r.attendeeId._id === session?.user?.id
  );

  const canShowReviewForm = session?.user?.id && !isInstructor && !alreadyReviewed && !submitted;

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch(`/api/workshops/${id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...scores, comment: comment.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not submit review");

      setSubmitted(true);
      setComment("");
      loadAll(); // refresh the list + summary to include the new review
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "1rem" }}>
      {workshop.images?.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            overflowX: "auto",
            marginBottom: "1rem",
          }}
        >
          {workshop.images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt={`${workshop.title} ${i + 1}`}
              style={{ width: 280, height: 200, objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
            />
          ))}
        </div>
      )}

      <h1>{workshop.title}</h1>
      <p style={{ color: "#666" }}>
        {workshop.category} · {workshop.city}
      </p>

      {reviewSummary.count > 0 && (
        <p style={{ color: "#e0a800", fontSize: "0.9rem" }}>
          ★ {reviewSummary.average} <span style={{ color: "#999" }}>({reviewSummary.count} reviews)</span>
        </p>
      )}

      <p style={{ fontSize: "1.25rem", fontWeight: 600 }}>₹{workshop.price}</p>

      <p style={{ color: seatsLeft <= 0 ? "red" : "#666" }}>
        {seatsLeft > 0 ? `${seatsLeft} of ${workshop.capacity} seats left` : "Sold out"}
      </p>

      <h3>About this workshop</h3>
      <p style={{ whiteSpace: "pre-wrap" }}>{workshop.description}</p>

      <h3>Location</h3>
      <p>{workshop.address}</p>
      {workshop.mapLink && (
        <a href={workshop.mapLink} target="_blank" rel="noopener noreferrer">
          Get Directions
        </a>
      )}

      <h3>Sessions</h3>
      {workshop.isRecurring ? (
        <p>
          {workshop.sessionDates.length} sessions, starting{" "}
          {new Date(workshop.sessionDates[0]).toLocaleDateString()}
        </p>
      ) : (
        <p>{new Date(workshop.sessionDates[0]).toLocaleDateString()}</p>
      )}

      {instructor && (
        <>
          <h3>Instructor</h3>
          <p style={{ fontWeight: 600 }}>{instructor.name}</p>
          {instructor.bio && <p>{instructor.bio}</p>}
        </>
      )}

      {isInstructor ? (
        <p style={{ marginTop: "1rem", color: "#666", fontStyle: "italic" }}>
          Instructors can browse workshops but can't book them.
        </p>
      ) : (
        <button disabled={seatsLeft <= 0} style={{ marginTop: "1rem", padding: "0.75rem 1.5rem" }}>
          {seatsLeft > 0 ? "Book Now" : "Sold Out"}
        </button>
      )}
      {/* Payment flow wires up in Phase 2 */}

      <h3 style={{ marginTop: "2rem" }}>Reviews {reviewSummary.count > 0 && `(${reviewSummary.count})`}</h3>

      {canShowReviewForm && (
        <form
          onSubmit={handleSubmitReview}
          style={{ border: "1px solid #eee", borderRadius: 8, padding: "1rem", margin: "1rem 0" }}
        >
          <p style={{ fontWeight: 600, marginTop: 0 }}>Leave a review</p>

          {DIMENSIONS.map((dim) => (
            <div key={dim} style={{ marginBottom: "0.5rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", textTransform: "capitalize" }}>
                {dim}: {scores[dim]}
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={scores[dim]}
                onChange={(e) => setScores({ ...scores, [dim]: Number(e.target.value) })}
                style={{ width: "100%" }}
              />
            </div>
          ))}

          <textarea
            placeholder="Optional comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={1000}
            style={{ width: "100%", marginTop: "0.5rem" }}
          />

          {submitError && <p style={{ color: "red", fontSize: "0.85rem" }}>{submitError}</p>}

          <button type="submit" disabled={submitting} style={{ marginTop: "0.5rem", padding: "0.5rem 1rem" }}>
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      )}

      {submitted && (
        <p style={{ color: "#0a7d2c", fontSize: "0.9rem" }}>Thanks for your review!</p>
      )}

      {reviews.length === 0 ? (
        <p style={{ color: "#999" }}>No reviews yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {reviews.map((r) => {
            const reviewer = typeof r.attendeeId === "object" ? r.attendeeId.name : "Anonymous";
            const overall = Math.round(((r.experience + r.learning + r.ambiance + r.entertainment) / 4) * 10) / 10;
            return (
              <div key={r._id} style={{ borderBottom: "1px solid #eee", paddingBottom: "0.75rem" }}>
                <div style={{ fontWeight: 600 }}>
                  {reviewer} <span style={{ color: "#e0a800", fontWeight: 400 }}>★ {overall}</span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "#666", marginTop: "0.15rem" }}>
                  Experience {r.experience} · Learning {r.learning} · Ambiance {r.ambiance} · Entertainment {r.entertainment}
                </div>
                {r.comment && <p style={{ margin: "0.4rem 0 0" }}>{r.comment}</p>}
                <div style={{ fontSize: "0.75rem", color: "#999" }}>
                  {new Date(r.createdAt).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}