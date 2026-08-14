"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import CitySelector from "./CitySelector";

export default function Header() {
  const { data: session, status } = useSession();

  return (
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 2rem", borderBottom: "1px solid #eee" }}>
      <Link href="/" style={{ fontWeight: 700, fontSize: "1.25rem" }}>
        ArtSpace
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {status === "authenticated" && <CitySelector />}

        {status === "authenticated" ? (
          <>
            <span>{session.user?.name}</span>
            <button onClick={() => signOut()}>Logout</button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link href="/signup">Sign up</Link>
          </>
        )}
      </div>
    </header>
  );
}