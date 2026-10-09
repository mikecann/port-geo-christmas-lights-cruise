import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

// Off-season switch, set on the Convex deployment: IS_SIGNUP_DISABLED=true.
// While it's on, existing accounts (admins included) can still sign in, but
// Google sign-in can't create new ones. The gate on the sign-in page is only
// UI; this is what enforces it.
const isSignupDisabled = () => process.env.IS_SIGNUP_DISABLED === "true";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
  callbacks: {
    // Runs in the same mutation that creates or updates the user, so throwing
    // rolls back a user that was just created. existingUserId is null only
    // when no account or verified email matched an existing user.
    async afterUserCreatedOrUpdated(_ctx, { existingUserId }) {
      if (existingUserId === null && isSignupDisabled())
        throw new Error(
          "New sign-ups are closed (IS_SIGNUP_DISABLED is set), so no account was created",
        );
    },
  },
});
