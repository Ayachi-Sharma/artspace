"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

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

export default function WorkshopDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    fetch(`/api/workshops/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setWorkshop(data.workshop);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!workshop) return <p>Workshop not found.</p>;

  const seatsLeft = workshop.capacity - workshop.seatsBooked;
  const instructor =
    typeof workshop.instructorId === "object" ? workshop.instructorId : null;

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

      <button disabled={seatsLeft <= 0} style={{ marginTop: "1rem", padding: "0.75rem 1.5rem" }}>
        {seatsLeft > 0 ? "Book Now" : "Sold Out"}
      </button>
      {/* Payment flow wires up in Phase 2 */}
    </div>
  );
}
