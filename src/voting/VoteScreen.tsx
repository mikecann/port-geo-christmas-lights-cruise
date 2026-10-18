import { useState } from "react";
import { IconInfoCircle, IconPhoto } from "@tabler/icons-react";
import type { PublicPhoto } from "../../convex/features/photos/schema";
import { usePhotoSrcSet, usePhotoUrl } from "../common/hooks/usePhotoUrl";
import { VOTE_PHOTO } from "../../shared/photoUrls";
import { routes } from "../routes";
import classes from "./VoteScreen.module.css";
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
    <div className={classes.photo}>
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
