import { useEffect } from "react";
import { useAuth as useClerkAuth } from "@clerk/react";
import { registerClerkGetToken, clearClerkGetToken } from "../lib/apiAuth";

/**
 * Registers Clerk `getToken` for API calls. Must render inside ClerkProvider.
 */
export function ClerkApiAuthBridge() {
  const { getToken, isLoaded, isSignedIn } = useClerkAuth();

  useEffect(() => {
    registerClerkGetToken(async () => {
      if (!isLoaded || !isSignedIn) return null;
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
    return () => clearClerkGetToken();
  }, [getToken, isLoaded, isSignedIn]);

  return null;
}
