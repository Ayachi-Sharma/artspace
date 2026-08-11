import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const body = await req.json();
        const { name, email, password, role } = body;
        const existingEmail = await User.findOne({ email })

        if (existingEmail) {
            return NextResponse.json(
                { success: false, message: "Email already exists" }, { status: 400 })
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role,
        });

        return NextResponse.json(
            { success: true, message: "User created successfully", userId: newUser._id },
            { status: 201 }
        );

    } catch (error) {
        return NextResponse.json(
            { success: false, message: "Something went wrong", error: String(error) },
            { status: 500 }
        );
    }
}