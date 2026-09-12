"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Script from "next/script";

// Drop this into /workshops/[id]/page.jsx in place of the current disabled
// "Book Now" button:
//   <BookButton workshopId={workshop._id} seatsLeft={seatsLeft} />

export default function BookButton({ workshopId, seatsLeft }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleBook() {
    if (status !== "authenticated") {
      router.push(`/login?redirect=/workshops/${workshopId}`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workshopId }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        throw new Error(
          orderData.error || "Could not start checkout"
        );
      }

      const rzp = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: "Workshop Booking",
        description: orderData.workshopTitle,
        prefill: {
          name: session?.user?.name || "",
          email: session?.user?.email || "",
        },
        handler: async function (response) {
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok) {
              throw new Error(
                verifyData.error || "Payment verification failed"
              );
            }

            router.push(
              `/bookings?confirmed=${verifyData.bookingId}`
            );
          } catch (err) {
            setError(err.message);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
        theme: { color: "#111111" },
      });

      rzp.on("payment.failed", function (response) {
        setError(
          response.error?.description || "Payment failed"
        );
        setLoading(false);
      });

      rzp.open();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  const soldOut = seatsLeft <= 0;

  return (
    <div>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      <button
        onClick={handleBook}
        disabled={soldOut || loading}
        style={{
          padding: "0.75rem 1.5rem",
          background: soldOut ? "#ccc" : "#111",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: soldOut ? "not-allowed" : "pointer",
        }}
      >
        {soldOut
          ? "Sold Out"
          : loading
          ? "Processing..."
          : "Book Now"}
      </button>

      {error && (
        <p style={{ color: "red", marginTop: "0.5rem" }}>
          {error}
        </p>
      )}
    </div>
  );
}