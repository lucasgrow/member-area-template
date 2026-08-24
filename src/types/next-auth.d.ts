import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image: string;
      role: "user" | "admin";
      membership: "free" | "start" | "pro" | "ultra";
      onboarded: boolean;
    };
  }
}
