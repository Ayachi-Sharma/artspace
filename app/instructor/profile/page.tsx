"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

type ProfileData = {
  name: string;
  email: string;
  bio: string;
  profileImage: string;
  verified: boolean;
};

export default function InstructorProfilePage() {
  const { status } = useSession();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [draft, setDraft] = useState<ProfileData | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/instructor/profile")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setProfile(json.user);
        setDraft(json.user);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading) return <p>Loading...</p>;
  if (status === "unauthenticated") {
    return <p>Only instructors can access this page.</p>;
  }
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!profile || !draft) return null;

  const handleEditToggle = () => {
    setDraft(profile); // reset any unsaved edits when entering edit mode
    setEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/instructor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          bio: draft.bio,
          profileImage: draft.profileImage,
        }),
      });

      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setProfile(json.user);
      setDraft(json.user);
      setEditing(false);
    } catch (err: any) {
      setError(err.message || "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} style={{ maxWidth: 500 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Profile</h2>
        {!editing ? (
          <button type="button" onClick={handleEditToggle}>
            Edit
          </button>
        ) : (
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        )}
      </div>

      <div style={{ margin: "1rem 0" }}>
        <label style={{ display: "block", fontSize: "0.85rem", color: "#666" }}>
          Profile Image URL
        </label>
        {editing ? (
          <input
            type="text"
            value={draft.profileImage || ""}
            onChange={(e) => setDraft({ ...draft, profileImage: e.target.value })}
            style={{ width: "100%" }}
          />
        ) : (
          <p>{profile.profileImage || "No image set"}</p>
        )}
      </div>

      <div style={{ margin: "1rem 0" }}>
        <label style={{ display: "block", fontSize: "0.85rem", color: "#666" }}>
          Name
        </label>
        {editing ? (
          <input
            type="text"
            value={draft.name || ""}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            style={{ width: "100%" }}
          />
        ) : (
          <p>{profile.name}</p>
        )}
      </div>

      <div style={{ margin: "1rem 0" }}>
        <label style={{ display: "block", fontSize: "0.85rem", color: "#666" }}>
          Email
        </label>
        <p>{profile.email}</p>
      </div>

      <div style={{ margin: "1rem 0" }}>
        <label style={{ display: "block", fontSize: "0.85rem", color: "#666" }}>
          Verified Status
        </label>
        <p>{profile.verified ? "✅ Verified" : "⏳ Pending verification"}</p>
      </div>

      <div style={{ margin: "1rem 0" }}>
        <label style={{ display: "block", fontSize: "0.85rem", color: "#666" }}>
          Bio
        </label>
        {editing ? (
          <textarea
            placeholder="Tell attendees about yourself..."
            value={draft.bio || ""}
            onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
            rows={5}
            style={{ width: "100%" }}
          />
        ) : (
          <p>{profile.bio || "No bio yet."}</p>
        )}
      </div>
    </form>
  );
}