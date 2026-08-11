import mongoose, { Schema, models, model } from "mongoose";

const UserSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 50,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
        },
        role: {
            type: String,
            enum: ["instructor", "attendee"],
            required: true,
            default: "attendee",
        },
        city: {
            type: String,
            enum: ["Jaipur", "Udaipur", "Ahmedabad", "Pune"],
            required: false,
        },
        verified: {
            type: Boolean,
            default: false,
        },
        bio: {
            type: String,
            required: function (this: { role: string }): boolean {
                return this.role === "instructor";
            },
            maxlength: 400,
        },
        profileImage: {
            type: String,
            required: false,
        },
    },
    { timestamps: true }
);

const User = models.user || model("User", UserSchema);
export default User;