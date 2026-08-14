"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function InstructorProfilePage() {
  const { data: session, status } = useSession();
  const [bio, setBio] = useState("");
  const [saved, setSaved] = useState(false);

  if (status === "loading") return <p>Loading...</p>;
  if (status === "unauthenticated" || session?.user?.role !== "instructor") {
    return <p>Only instructors can access this page.</p>;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/instructor/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio }),
    });
    if (res.ok) setSaved(true);
  };

  return (
    <form onSubmit={handleSave} style={{ maxWidth: 500 }}>
      <h2>Edit Profile</h2>
      <textarea
        placeholder="Tell attendees about yourself..."
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        rows={5}
        style={{ width: "100%" }}
      />
      <button type="submit">Save</button>
      {saved && <p>Saved!</p>}
    </form>
  );
}