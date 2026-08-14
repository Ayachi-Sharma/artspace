"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CITIES } from "@/lib/constants";

export default function NewWorkshopPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    category: "",
    description: "",
    city: "",
    address: "",
    mapLink: "",
    isRecurring: false,
    sessionDates: [""],
    price: "",
    capacity: "",
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  if (status === "loading") return <p>Loading...</p>;
  if (session?.user?.role !== "instructor") return <p>Only instructors can create workshops.</p>;

  const uploadImages = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of imageFiles) {
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileType: file.type }),
      });
      const { uploadUrl, publicUrl } = await presignRes.json();

      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      urls.push(publicUrl);
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setUploading(true);

    try {
      const imageUrls = await uploadImages();

      const res = await fetch("/api/workshops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          capacity: Number(form.capacity),
          sessionDates: form.sessionDates.filter(Boolean),
          images: imageUrls,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create workshop");
      }

      router.push("/instructor/workshops");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 500, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <h2>Create Workshop</h2>

      <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
      <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
      <select
  value={form.city}
  onChange={(e) => setForm({ ...form, city: e.target.value })}
  required
>
  <option value="" disabled>Select city</option>
  {CITIES.map((c) => (
    <option key={c} value={c}>{c}</option>
  ))}
</select>
<input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
      <input placeholder="Google Maps link" value={form.mapLink} onChange={(e) => setForm({ ...form, mapLink: e.target.value })} />

      <label>
        <input
          type="checkbox"
          checked={form.isRecurring}
          onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
        />
        Recurring workshop
      </label>

      {form.sessionDates.map((date, i) => (
        <input
          key={i}
          type="date"
          value={date}
          onChange={(e) => {
            const updated = [...form.sessionDates];
            updated[i] = e.target.value;
            setForm({ ...form, sessionDates: updated });
          }}
          required
        />
      ))}
      {form.isRecurring && (
        <button type="button" onClick={() => setForm({ ...form, sessionDates: [...form.sessionDates, ""] })}>
          + Add another date
        </button>
      )}

      <input type="number" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
      <input type="number" placeholder="Capacity" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required />

      <input type="file" multiple accept="image/*" onChange={(e) => setImageFiles(Array.from(e.target.files || []))} />

      {error && <p style={{ color: "red" }}>{error}</p>}
      <button type="submit" disabled={uploading}>
        {uploading ? "Creating..." : "Create Workshop"}
      </button>
    </form>
  );
}