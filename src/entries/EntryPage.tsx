import { Container, Text, Stack, Card, Center, Grid } from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import { IconPhoto } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useRoute, routes, routeGroups } from "../routes";
import { useState, useRef, useEffect } from "react";
import { AspectRatio } from "@mantine/core";
import EntryPageSkeleton from "./EntryPageSkeleton";
import Autoplay from "embla-carousel-autoplay";
import PhotoLightbox from "../authed/myEntries/photos/PhotoLightbox";
import EntryHeader from "./EntryHeader";
import SystemAdminSection from "./SystemAdminSection";
import EntryVoting from "./voting/EntryVoting";
import VoteModal from "../map/voteModal/VoteModal";
import ShareModal from "./ShareModal";
import { PhotoSlide } from "./PhotoSlide";
import { Route } from "type-route";

export default function EntryPage({
  route,
}: {
  route: Route<typeof routeGroups.entry>;
}) {
  const [lightboxOpened, setLightboxOpened] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [shareModalOpened, setShareModalOpened] = useState(false);

  const entryId = route.params.entryId as Id<"entries">;

  const entryWithPhotos = useQuery(api.public.entries.getWithPhotos, {
    entryId,
  });

  if (!entryWithPhotos) return <EntryPageSkeleton />;

  const { entry, photos } = entryWithPhotos;

  if (entry.status !== "approved")
    return (
      <Container size="lg" py="xl">
        <Center>
          <Text size="lg" c="dimmed">
            This entry is not available for viewing.
          </Text>
        </Center>
      </Container>
    );

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Image Carousel */}
        <Card withBorder p={0} radius="md">
          {photos.length > 0 ? (
            <Carousel
              withIndicators={photos.length > 1}
              withControls={photos.length > 1}
              height={500}
              emblaOptions={{
                loop: photos.length > 1,
                dragFree: false,
                align: "center",
              }}
              controlSize={40}
              style={{
                "--carousel-control-bg": "rgba(0, 0, 0, 0.6)",
                "--carousel-control-color": "white",
                "--carousel-indicator-size": "10px",
                "--carousel-indicator-bg": "rgba(255, 255, 255, 0.4)",
                "--carousel-indicator-bg-active": "white",
              }}
            >
              {photos.map((photo, i) => {
                return (
                  <PhotoSlide
                    key={photo._id}
                    photo={photo}
                    entry={entry}
                    isPriority={i === 0}
                    onImageClick={(imageUrl) => {
                      setSelectedImageUrl(imageUrl);
                      setLightboxOpened(true);
                    }}
                  />
                );
              })}
            </Carousel>
          ) : (
            <AspectRatio ratio={16 / 10}>
              <Center
                bg="var(--mantine-color-gray-9)"
                style={{ borderRadius: "var(--mantine-radius-md)" }}
              >
                <Stack gap="xs" align="center">
                  <IconPhoto size={48} color="var(--mantine-color-gray-5)" />
                  <Text size="lg" c="dimmed">
                    No photos available
                  </Text>
                </Stack>
              </Center>
            </AspectRatio>
          )}
        </Card>

        {/* Entry Info and Voting Section */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 8 }}>
            <EntryHeader
              entry={entry}
              entryId={entryId}
              onShareClick={() => setShareModalOpened(true)}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <EntryVoting entryId={entryId} />
          </Grid.Col>
        </Grid>

        <SystemAdminSection entryId={entryId} />
      </Stack>

      {/* Photo Lightbox */}
      <PhotoLightbox
        opened={lightboxOpened}
        onClose={() => {
          setLightboxOpened(false);
          setSelectedImageUrl(null);
        }}
        imageUrl={selectedImageUrl}
      />

      {/* Vote Modal */}
      {route.name == "entryVote" ? (
        <VoteModal
          entryId={entryId}
          opened={true}
          onClose={() => {
            routes.entry({ entryId }).push();
          }}
        />
      ) : null}

      {/* Share Modal */}
      <ShareModal
        opened={shareModalOpened}
        onClose={() => setShareModalOpened(false)}
        entry={entry}
        entryId={entryId}
      />
    </Container>
  );
}
