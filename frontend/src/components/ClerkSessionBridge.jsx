import { useAuth, useClerk, useUser } from "@clerk/clerk-react";
import { useEffect, useRef } from "react";

export default function ClerkSessionBridge() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const syncedUserIdRef = useRef("");

  useEffect(() => {
    const handleSignOutRequested = () => {
      signOut({ redirectUrl: window.location.origin }).catch((error) => {
        console.error("Clerk sign-out failed:", error);
      });
    };

    window.addEventListener("clerk-sign-out-requested", handleSignOutRequested);

    return () => {
      window.removeEventListener(
        "clerk-sign-out-requested",
        handleSignOutRequested,
      );
    };
  }, [signOut]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    async function syncSession() {
      if (!isSignedIn) {
        if (syncedUserIdRef.current) {
          syncedUserIdRef.current = "";
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
          window.dispatchEvent(new Event("clerk-auth-cleared"));
        }

        return;
      }

      if (!user?.id || syncedUserIdRef.current === user.id) {
        return;
      }

      const token = await getToken();
      const email =
        user.primaryEmailAddress?.emailAddress ||
        user.emailAddresses?.[0]?.emailAddress ||
        "";

      if (!token || !email) {
        return;
      }

      const res = await fetch("/api/auth/clerk/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to sync Clerk session");
      }

      syncedUserIdRef.current = user.id;
      window.dispatchEvent(new Event("clerk-auth-synced"));
    }

    syncSession().catch((error) => {
      console.error("Clerk session sync failed:", error);
    });
  }, [getToken, isLoaded, isSignedIn, user?.id]);

  return null;
}
