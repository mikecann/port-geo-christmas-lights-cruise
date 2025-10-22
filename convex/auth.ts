import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { TestingCredentials } from "./testing/TestingCredentials";

// Add testing provider in test environment
const providers = process.env.IS_TEST ? [Google, TestingCredentials] : [Google];

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers,
});
