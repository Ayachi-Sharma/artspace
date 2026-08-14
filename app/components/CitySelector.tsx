"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const CITIES = ["Jaipur", "Delhi", "Mumbai", "Bangalore", "Pune"]; // adjust to your launch cities

export default function CitySelector() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = async (city: string) => {
    setLoading(true);
    const res = await fetch("/api/user/city", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city }),
    });

    if (res.ok) {
      await update({ city }); // triggers jwt callback to refresh token with new city
      router.refresh(); // re-fetches server components with updated session
    }
    setLoading(false);
  };

  return (
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
  );
}