import { useId, useState } from "react";
import { IconInfoCircle, IconPhoto } from "@tabler/icons-react";
import type { PublicPhoto } from "../../convex/features/photos/schema";
import { usePhotoSrcSet, usePhotoUrl } from "../common/hooks/usePhotoUrl";
import { VOTE_PHOTO } from "../../shared/photoUrls";
import { routes } from "../routes";
import classes from "./VoteScreen.module.css";
import { BULB_COLORS } from "./bulbs";
import VoteFlow from "./VoteFlow";
import { SignNumber, VoteBarLoading } from "./VoteFlowParts";
import type { VoteFlowEntry } from "./useVoteFlow";

// The vote page: the entry's photo fills the screen, with the Vote button in
// a bar at the bottom. Without an entry yet it shows the number (when known)
// straight away and holds the layout while the rest loads.
export default function VoteScreen({
  entryNumber,
  entry,
  photo,
}: {
  entryNumber?: number;
  entry?: VoteFlowEntry;
  photo?: PublicPhoto;
}) {
  return (
    <div className={classes.screen}>
      <VotePhoto entryNumber={entryNumber} entry={entry} photo={photo} />
      <div className={classes.bar}>
        {entry ? <VoteFlow entry={entry} /> : <VoteBarLoading />}
      </div>
    </div>
  );
}

function VotePhoto({
  entryNumber,
  entry,
  photo,
}: {
  entryNumber?: number;
  entry?: VoteFlowEntry;
  photo?: PublicPhoto;
}) {
  const image = usePhotoSrcSet(photo, VOTE_PHOTO);
  const thumbnail = usePhotoUrl(photo, { size: "xs" });

  return (
    <div className={classes.photo} data-empty={(entry && !photo) || undefined}>
      {entry && !photo && <NoPhotoLights />}
      {thumbnail && thumbnail !== image?.src && (
        <img className={classes.placeholder} src={thumbnail} alt="" />
      )}
      {image && entry && (
        <FadeInImage
          key={image.src}
          image={image}
          alt={`${entry.name} - Christmas lights display`}
        />
      )}
      <div className={classes.shade} />
      <div className={classes.links}>
        {entry ? (
          <a
            className={classes.pill}
            {...routes.entry({ entryId: entry._id }).link}
          >
            <IconPhoto size={18} aria-hidden />
            Photos & map
          </a>
        ) : (
          <span />
        )}
        <a className={classes.pill} {...routes.competitionDetails().link}>
          <IconInfoCircle size={18} aria-hidden />
          How voting works
        </a>
      </div>
      <h1 className={classes.caption}>
        {entryNumber !== undefined && <SignNumber entryNumber={entryNumber} />}
        {entry && <span className={classes.name}>{entry.name}</span>}
      </h1>
    </div>
  );
}

// Bulbs spaced along a drooping string, from one side of the screen to the other
function lightString(y: number, droop: number, count: number, offset: number) {
  const bulbs = Array.from({ length: count }, (_, i) => {
    const t = (i + 0.5) / count;
    return {
      x: -10 + 380 * t,
      y: y + 2 * (1 - t) * t * droop,
      color: BULB_COLORS[(i + offset) % BULB_COLORS.length],
    };
  });
  return { path: `M -10 ${y} Q 180 ${y + droop} 370 ${y}`, bulbs };
}

const LIGHT_STRINGS = [lightString(10, 70, 9, 0), lightString(60, 80, 8, 2)];

// Strings of lights in place of a photo, so an entry without one still looks
// meant. Drawn rather than an image, to keep the page light on mobile data.
function NoPhotoLights() {
  const id = useId();
  return (
    <div className={classes.noPhoto}>
      <svg className={classes.lights} viewBox="0 0 360 150" aria-hidden>
        <defs>
          {BULB_COLORS.map((color) => (
            <radialGradient key={color} id={`${id}-${color}`}>
              <stop
                offset="0%"
                style={{ stopColor: `var(--mantine-color-${color})` }}
                stopOpacity={0.45}
              />
              <stop
                offset="100%"
                style={{ stopColor: `var(--mantine-color-${color})` }}
                stopOpacity={0}
              />
            </radialGradient>
          ))}
        </defs>
        {LIGHT_STRINGS.map(({ path, bulbs }) => (
          <g key={path}>
            <path d={path} className={classes.wire} />
            {bulbs.map(({ x, y, color }) => (
              <g
                key={x}
                style={{ color: `var(--mantine-color-${color})` }}
                fill="currentColor"
              >
                <circle
                  cx={x}
                  cy={y + 9}
                  r={18}
                  fill={`url(#${id}-${color})`}
                />
                <rect
                  x={x - 2.5}
                  y={y - 1}
                  width={5}
                  height={4}
                  rx={1}
                  className={classes.cap}
                />
                <ellipse cx={x} cy={y + 9} rx={4.5} ry={7} />
              </g>
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}

// Fades in over the placeholder once it has downloaded
function FadeInImage({
  image,
  alt,
}: {
  image: { src: string; srcSet?: string; sizes?: string };
  alt: string;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  return (
    <img
      {...image}
      alt={alt}
      className={classes.image}
      data-loaded={isLoaded || undefined}
      fetchPriority="high"
      decoding="async"
      // Already there when it came from the cache or the worker's preload
      ref={(img) => {
        if (img?.complete && img.naturalWidth > 0) setIsLoaded(true);
      }}
      onLoad={() => setIsLoaded(true)}
    />
  );
}
