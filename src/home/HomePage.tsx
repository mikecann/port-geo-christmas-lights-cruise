import { Box, Stack } from "@mantine/core";
import { Stars } from "./Stars";
import { Title } from "./Title";
import { Sponsors } from "./Sponsors";
import { Houses } from "./Houses";
import { Trees } from "./Trees";
import BelowTheFoldCopy from "./BelowTheFold";
import BookNowSection from "./BookNowSection";
import Footer from "./Footer";

export default function HomePage() {
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
      <Houses />
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
