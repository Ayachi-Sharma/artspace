import mongoose from "mongoose";

declare global {
  var mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

const cached = global.mongooseCache || { conn: null, promise: null };
global.mongooseCache = cached;


export async function connectDB() {
  if (cached.conn) {
    return cached.conn; // already connected, reuse it
  }

  if (!cached.promise) {
    const MONGODB_URI = process.env.MONGODB_URI as string;
    if (!MONGODB_URI) {
      throw new Error("Please define MONGODB_URI in your .env.local file");
    }

    cached.promise = mongoose.connect(MONGODB_URI);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}