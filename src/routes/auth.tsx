import { createFileRoute, redirect } from "@tanstack/react-router";

// the sign-in page moved to /login; old links keep working
export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
});
