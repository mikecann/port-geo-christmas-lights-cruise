import { useEffect, useRef } from "react";
import { useConvexAuth } from "convex/react";
import { useRoute } from "../routes";
import { authCompleted, track } from "./client";

export function AnalyticsObserver() {
  const route = useRoute();
  const { isAuthenticated } = useConvexAuth();
  const previous = useRef("");
  useEffect(() => {
    const page = route.name;
    const key =
      page + ("entryId" in route.params ? String(route.params.entryId) : "");
    if (previous.current === key) return;
    previous.current = key;
    if (!page || page.startsWith("admin") || page === "testAuth") return;
    track("page_viewed", { page });
  }, [route]);
  useEffect(() => {
    if (isAuthenticated) authCompleted();
  }, [isAuthenticated]);
  return null;
}
