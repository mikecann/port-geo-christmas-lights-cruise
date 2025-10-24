import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { TestingCredentials } from "./testing/TestingCredentials";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: process.env.IS_TEST ? [Google, TestingCredentials] : [Google],
});
