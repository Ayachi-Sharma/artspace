import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role: string;
    city: string;
    verified: boolean;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      city: string;
      verified: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    city: string;
    verified: boolean;
  }
}