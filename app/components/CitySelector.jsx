"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CITIES } from "../../lib/constants";

export default function CitySelector() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleChange = async (city) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/user/city", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Could not update city");
      }

      await update({ city });
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <select
        value={session?.user?.city || ""}
        onChange={(e) => handleChange(e.target.value)}
        disabled={loading}
      >
        <option value="" disabled>
          Select city
        </option>

        {CITIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {error && (
        <p
          style={{
            color: "red",
            fontSize: "0.75rem",
            margin: "0.25rem 0 0",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}