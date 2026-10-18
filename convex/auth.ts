import { convexAuth } from "@convex-dev/auth/server";
import {
  createOrUpdateUser,
  emailCodeProvider,
  googleProvider,
} from "./features/auth/model";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [googleProvider, emailCodeProvider],
  callbacks: { createOrUpdateUser },
});
