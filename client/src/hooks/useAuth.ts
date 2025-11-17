import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    queryFn: async () => {
      const response = await fetch("/api/auth/user");
      if (response.status === 401) {
        return null;
      }
      if (!response.ok) {
        throw new Error("Failed to fetch user");
      }
      return response.json();
    },
  });

  return {
    user: user || null,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
  };
}
