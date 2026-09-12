import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = session.user?.role;

  if (role === "instructor") {
    redirect("/dashboard/instructor");
  }

  // default: attendee (also catches "user", "attendee", or undefined)
  redirect("/dashboard/attendee");
}