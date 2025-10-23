import { Box, Stack } from "@mantine/core";
import { Stars } from "./Stars";
import { Title } from "./Title";
import { Sponsors } from "./Sponsors";
import { Houses } from "./Houses";
import { Trees } from "./Trees";
import BelowTheFoldCopy from "./BelowTheFold";
import BookNowSection from "./BookNowSection";
import Footer from "./Footer";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { HomeEntryMarker } from "./HomeEntryMarker";

export default function HomePage() {
  const randomEntries = useQuery(api.public.entries.getRandomThree);

  return (
    <Box
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
      <Box style={{ position: "relative" }}>
        <Houses />
        {randomEntries && randomEntries.length >= 3 && (
          <>
            <HomeEntryMarker
              entry={randomEntries[0]}
              position={{ x: "32.8%", y: "20%" }}
            />
            <HomeEntryMarker
              entry={randomEntries[1]}
              position={{ x: "50.4%", y: "17%" }}
            />
            <HomeEntryMarker
              entry={randomEntries[2]}
              position={{ x: "67.5%", y: "20%" }}
            />
          </>
        )}
      </Box>
      <Trees />
      <Stack bg="#02051A">
        <BookNowSection />
        <BelowTheFoldCopy />
        <Stack pt={"lg"} pb={"lg"} bg="rgba(0,0,0,0.25)">
          <Sponsors />
        </Stack>
      </Stack>
      <Footer />
    </Box>
  );
}
