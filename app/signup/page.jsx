"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "attendee",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to sign up");
      }

      // Auto sign-in right after signup so the user lands logged in
      const signInRes = await signIn("credentials", {
        redirect: false,
        email: form.email,
        password: form.password,
      });

      if (signInRes?.error) {
        // Account was created but auto sign-in failed — send them to login instead
        router.push("/login");
        return;
      }

      router.push("/workshops");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: 400,
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      <h2>Sign up</h2>

      <input
        placeholder="Name"
        value={form.name}
        onChange={(e) =>
          setForm({
            ...form,
            name: e.target.value,
          })
        }
        required
      />

      <input
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={(e) =>
          setForm({
            ...form,
            email: e.target.value,
          })
        }
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={(e) =>
          setForm({
            ...form,
            password: e.target.value,
          })
        }
        minLength={6}
        required
      />

      <fieldset
        style={{
          border: "1px solid #ddd",
          borderRadius: 4,
          padding: "0.5rem 0.75rem",
        }}
      >
        <legend style={{ padding: "0 0.25rem" }}>
          I am signing up as
        </legend>

        <label style={{ marginRight: "1rem" }}>
          <input
            type="radio"
            name="role"
            value="attendee"
            checked={form.role === "attendee"}
            onChange={(e) =>
              setForm({
                ...form,
                role: e.target.value,
              })
            }
          />{" "}
          Attendee
        </label>

        <label>
          <input
            type="radio"
            name="role"
            value="instructor"
            checked={form.role === "instructor"}
            onChange={(e) =>
              setForm({
                ...form,
                role: e.target.value,
              })
            }
          />{" "}
          Instructor
        </label>
      </fieldset>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? "Signing up..." : "Sign up"}
      </button>
    </form>
  );
}