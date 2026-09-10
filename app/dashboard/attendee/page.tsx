import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import Booking from "@/models/Booking";
import Workshop from "@/models/Workshop";
import Link from "next/link";

export default async function AttendeeDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = session.user as any;
  const userId = user?.id;

  await connectDB();

  // ── Fetch data ──────────────────────────────────────────────
  const bookings = await Booking.find({ attendeeId: userId })
    .populate("workshopId", "title city sessionDates price images")
    .sort({ createdAt: -1 })
    .lean();

  const upcomingBookings = bookings.filter((b: any) => {
    const nextDate = b.workshopId?.sessionDates?.[0];
    return b.status === "confirmed" && nextDate && new Date(nextDate) >= new Date();
  });

  const pastBookings = bookings.filter((b: any) => {
    const lastDate = b.workshopId?.sessionDates?.slice(-1)[0];
    return b.status === "confirmed" && lastDate && new Date(lastDate) < new Date();
  });

  const pendingBookings = bookings.filter((b: any) => b.status === "pending");

  // ── Stats ───────────────────────────────────────────────────
  const totalSpent = bookings
    .filter((b: any) => b.status === "confirmed")
    .reduce((sum: number, b: any) => sum + (b.amount || 0), 0);

  // ── Recommended workshops (same city, not yet booked) ──────
  const bookedWorkshopIds = bookings.map((b: any) => b.workshopId?._id);
  const recommended = await Workshop.find({
    city: user?.city || "Jaipur",
    _id: { $nin: bookedWorkshopIds },
    sessionDates: { $elemMatch: { $gte: new Date() } },
  })
    .sort({ sessionDates: 1 })
    .limit(4)
    .lean();

  // ── Helpers ─────────────────────────────────────────────────
  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

  const statusColor: Record<string, string> = {
    confirmed: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-600",
  };

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(" ")[0] || "Creator"} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {user?.city || "Your city"} · {upcomingBookings.length} upcoming workshop
          {upcomingBookings.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Stats Row ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Upcoming", value: upcomingBookings.length, icon: "📅" },
          { label: "Completed", value: pastBookings.length, icon: "✅" },
          { label: "Pending", value: pendingBookings.length, icon: "⏳" },
          {
            label: "Total Spent",
            value: `₹${(totalSpent / 100).toLocaleString("en-IN")}`,
            icon: "💰",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
          >
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── Upcoming Bookings ───────────────────────────── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Upcoming Workshops
          </h2>
          <Link
            href="/workshops"
            className="text-sm text-indigo-600 hover:underline"
          >
            Browse all →
          </Link>
        </div>

        {upcomingBookings.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center border border-gray-100">
            <p className="text-4xl mb-3">🎨</p>
            <p className="text-gray-500 mb-4">
              No upcoming workshops yet. Time to get creative!
            </p>
            <Link
              href="/workshops"
              className="inline-block bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              Explore Workshops
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {upcomingBookings.map((b: any) => (
              <div
                key={b._id.toString()}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex gap-4"
              >
                <div className="w-20 h-20 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                  {b.workshopId?.images?.[0] ? (
                    <img
                      src={b.workshopId.images[0]}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      🏺
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {b.workshopId?.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    📍 {b.workshopId?.city}
                  </p>
                  <p className="text-sm text-gray-500">
                    📅 {formatDate(b.workshopId?.sessionDates?.[0])}
                  </p>
                  <span
                    className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${statusColor[b.status]}`}
                  >
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Recommended for You ─────────────────────────── */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Recommended in {user?.city || "your city"}
        </h2>
        {recommended.length === 0 ? (
          <p className="text-gray-400 text-sm">
            No new workshops right now. Check back soon!
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommended.map((w: any) => (
              <Link
                key={w._id.toString()}
                href={`/workshops/${w._id}`}
                className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition group"
              >
                <div className="h-36 bg-gray-200 overflow-hidden">
                  {w.images?.[0] ? (
                    <img
                      src={w.images[0]}
                      alt={w.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      🎨
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {w.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(w.sessionDates?.[0])} · {w.city}
                  </p>
                  <p className="text-indigo-600 font-bold mt-2">
                    ₹{w.price.toLocaleString("en-IN")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}