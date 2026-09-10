import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import Workshop from "@/models/Workshop";
import Booking from "@/models/Booking";
import Link from "next/link";

export default async function InstructorDashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = session.user as any;
  if (user?.role !== "instructor") redirect("/dashboard/attendee");

  const userId = user?.id;
  await connectDB();

  // ── Fetch data ──────────────────────────────────────────────
  const workshops = await Workshop.find({ instructorId: userId })
    .sort({ createdAt: -1 })
    .lean();

  const workshopIds = workshops.map((w: any) => w._id);

  const allBookings = await Booking.find({ workshopId: { $in: workshopIds } })
    .populate("attendeeId", "name email")
    .sort({ createdAt: -1 })
    .lean();

  // ── Stats ───────────────────────────────────────────────────
  const confirmedBookings = allBookings.filter(
    (b: any) => b.status === "confirmed"
  );
  const totalRevenue = confirmedBookings.reduce(
    (sum: number, b: any) => sum + (b.amount || 0),
    0
  );
  const totalSeatsBooked = workshops.reduce(
    (sum: number, w: any) => sum + (w.seatsBooked || 0),
    0
  );
  const totalCapacity = workshops.reduce(
    (sum: number, w: any) => sum + (w.capacity || 0),
    0
  );
  const fillRate =
    totalCapacity > 0
      ? Math.round((totalSeatsBooked / totalCapacity) * 100)
      : 0;

  // ── Helpers ─────────────────────────────────────────────────
  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Instructor Dashboard
          </h1>
          <p className="text-gray-500 mt-1">
            {workshops.length} workshop{workshops.length !== 1 ? "s" : ""} ·{" "}
            {confirmedBookings.length} confirmed bookings
          </p>
        </div>
        <Link
          href="/instructor/workshops/new"
          className="inline-flex items-center bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition font-medium"
        >
          + Create Workshop
        </Link>
      </div>

      {/* ── Stats Row ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total Revenue",
            value: `₹${(totalRevenue / 100).toLocaleString("en-IN")}`,
            icon: "💰",
          },
          {
            label: "Bookings",
            value: confirmedBookings.length,
            icon: "🎟️",
          },
          {
            label: "Seats Filled",
            value: `${totalSeatsBooked}/${totalCapacity}`,
            icon: "💺",
          },
          { label: "Fill Rate", value: `${fillRate}%`, icon: "📊" },
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

      {/* ── My Workshops ────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          My Workshops
        </h2>

        {workshops.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center border border-gray-100">
            <p className="text-4xl mb-3">🏺</p>
            <p className="text-gray-500 mb-4">
              You haven&apos;t created any workshops yet.
            </p>
            <Link
              href="/instructor/workshops/new"
              className="inline-block bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              Create Your First Workshop
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-5 py-3">Workshop</th>
                    <th className="px-5 py-3">City</th>
                    <th className="px-5 py-3">Next Date</th>
                    <th className="px-5 py-3">Seats</th>
                    <th className="px-5 py-3">Price</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {workshops.map((w: any) => {
                    const nextDate = w.sessionDates?.find(
                      (d: Date) => new Date(d) >= new Date()
                    );
                    const isFull = w.seatsBooked >= w.capacity;
                    return (
                      <tr key={w._id.toString()} className="hover:bg-gray-50">
                        <td className="px-5 py-4 font-medium text-gray-900">
                          {w.title}
                        </td>
                        <td className="px-5 py-4 text-gray-600">{w.city}</td>
                        <td className="px-5 py-4 text-gray-600">
                          {nextDate ? formatDate(nextDate) : "—"}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={
                              isFull
                                ? "text-red-600 font-semibold"
                                : "text-gray-600"
                            }
                          >
                            {w.seatsBooked}/{w.capacity}
                          </span>
                          {isFull && (
                            <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                              Full
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-gray-900 font-medium">
                          ₹{w.price.toLocaleString("en-IN")}
                        </td>
                        <td className="px-5 py-4">
                          <Link
                            href={`/instructor/workshops/${w._id}`}
                            className="text-indigo-600 hover:underline text-sm"
                          >
                            Manage →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ── Recent Bookings ─────────────────────────────── */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Recent Bookings
        </h2>

        {allBookings.length === 0 ? (
          <p className="text-gray-400 text-sm">No bookings yet.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100 shadow-sm">
            {allBookings.slice(0, 10).map((b: any) => (
              <div
                key={b._id.toString()}
                className="flex items-center justify-between px-5 py-3"
              >
                <div>
                  <span className="font-medium text-gray-900">
                    {(b.attendeeId as any)?.name || "Unknown"}
                  </span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-sm text-gray-500">
                    {(b.attendeeId as any)?.email}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">
                    ₹{(b.amount / 100).toLocaleString("en-IN")}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${statusColor[b.status]}`}
                  >
                    {b.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}