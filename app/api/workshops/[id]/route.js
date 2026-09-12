import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Workshop from "@/models/Workshop";
import "@/models/User";

export async function GET(req, { params }) {
  await connectDB();

  const { id } = await params;

  const workshop = await Workshop.findById(id).populate(
    "instructorId",
    "name bio"
  );

  if (!workshop) {
    return Response.json(
      { error: "Workshop not found" },
      { status: 404 }
    );
  }

  return Response.json({ workshop });
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "instructor") {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  await connectDB();

  const workshop = await Workshop.findById(id);

  if (!workshop) {
    return Response.json(
      { error: "Workshop not found" },
      { status: 404 }
    );
  }

  if (workshop.instructorId.toString() !== session.user.id) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  await workshop.deleteOne();

  return Response.json({ success: true });
}