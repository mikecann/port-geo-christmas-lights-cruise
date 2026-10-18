import { Box, Stack } from "@mantine/core";
import { Stars } from "./Stars";
import { Title } from "./Title";
import { Houses } from "./Houses";
import { Trees } from "./Trees";
import CompetitionSection from "./CompetitionSection";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { HomeEntryMarker } from "./HomeEntryMarker";
import { useEffect, useRef, useState } from "react";
import styles from "./HomePage.module.css";

export default function HomePage() {
  const randomEntries = useQuery(api.public.entries.getRandomThree, {});
  const housesRef = useRef<HTMLDivElement>(null);
  const [isOffscreen, setIsOffscreen] = useState(false);

  useEffect(() => {
    const houses = housesRef.current;
    if (!houses) return;
    const observer = new IntersectionObserver(([entry]) =>
      setIsOffscreen(!entry.isIntersecting),
    );
    observer.observe(houses);
    return () => observer.disconnect();
  }, []);

  return (
    <Box
      className={styles.scene}
      data-offscreen={isOffscreen || undefined}
      pt={40}
      style={{
        position: "relative",
        overflow: "hidden",
        background: "#0b1c3b",
        minHeight: "100vh",
      }}
    >
      <Stars />
      <Title />
      <Box ref={housesRef} style={{ position: "relative" }}>
        <Houses />
        {randomEntries && randomEntries.length >= 3 && (
          <>
            <HomeEntryMarker
              entry={randomEntries[0]}
              position={{ x: "32.8%", y: "22%" }}
            />
            <HomeEntryMarker
              entry={randomEntries[1]}
              position={{ x: "50.4%", y: "19%" }}
            />
            <HomeEntryMarker
              entry={randomEntries[2]}
              position={{ x: "67.5%", y: "22%" }}
            />
          </>
        )}
      </Box>
      <Trees />
      <Stack bg="#02051A" gap={0}>
        <CompetitionSection />
      </Stack>
    </Box>
  );
}
