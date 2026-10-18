import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { createOrUpdateUser, emailCodeProvider } from "./features/auth/model";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google, emailCodeProvider],
  callbacks: { createOrUpdateUser },
});
