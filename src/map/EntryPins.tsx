import { useCallback, useEffect, useMemo, useState } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import type { EntryWithFirstPhoto } from "../../convex/public/entries";
import { EntryMarker } from "./EntryMarker";
import { EntryGroupMarker } from "./EntryGroupMarker";
import { WatchZoom, PHOTO_ZOOM } from "./WatchZoom";
import { groupPins, NUMBER_PIN, PHOTO_PIN, zoomForGroupTap } from "./groupPins";

interface EntryPinsProps {
  entries: EntryWithFirstPhoto[];
  selectedEntryId?: string;
  onSelect: (entryId: string) => void;
  onDeselect: () => void;
}

// Every house on the map: its own pin when there's room, or a group pin when
// it would sit on top of its neighbours
export function EntryPins({
  entries,
  selectedEntryId,
  onSelect,
  onDeselect,
}: EntryPinsProps) {
  const map = useMap();
  const [zoom, setZoom] = useState<number | null>(null);
  const [hoveredEntryId, setHoveredEntryId] = useState<string | null>(null);
  const endHover = useCallback(() => setHoveredEntryId(null), []);
  // The list is remembered by one of its houses rather than the group, as
  // closing a popup to open it can change who's in the group
  const [listHouse, setListHouse] = useState<string | null>(null);

  const isZoomedIn = (zoom ?? 0) >= PHOTO_ZOOM;

  // The selected house always gets its own pin, so its popup has somewhere
  // to hang even when it's in a crowd
  const groups = useMemo(() => {
    if (zoom === null) return [];
    const points = entries
      .filter((e) => e.entry._id !== selectedEntryId)
      .map((e) => ({
        id: e.entry._id as string,
        lat: e.entry.houseAddress.lat,
        lng: e.entry.houseAddress.lng,
        entry: e,
      }));
    return groupPins(points, zoom, isZoomedIn ? PHOTO_PIN : NUMBER_PIN);
  }, [entries, selectedEntryId, zoom, isZoomedIn]);

  const groupsByKey = useMemo(
    () =>
      new Map(
        groups
          .filter((g) => g.members.length > 1)
          .map((g) => [g.members.map((m) => m.id).join(","), g]),
      ),
    [groups],
  );

  const tapGroup = useCallback(
    (key: string) => {
      const group = groupsByKey.get(key);
      if (!map || !group || zoom === null) return;
      const div = map.getDiv();
      const target = zoomForGroupTap(group.members, zoom, {
        width: div.clientWidth,
        height: div.clientHeight,
      });
      const openList = () => {
        onDeselect();
        setListHouse(group.members[0].id);
      };
      if (target === null) return openList();
      setListHouse(null);
      const before = map.getZoom() ?? 0;
      map.moveCamera({
        center: { lat: group.lat, lng: group.lng },
        zoom: target,
      });
      // Somewhere the map won't zoom in that far, so a list rather than a
      // tap that does nothing
      if ((map.getZoom() ?? 0) <= before) openList();
    },
    [map, zoom, groupsByKey, onDeselect],
  );

  const openHouse = useCallback(
    (entryId: string) => {
      setListHouse(null);
      onSelect(entryId);
    },
    [onSelect],
  );
  const closeList = useCallback(() => setListHouse(null), []);

  // A tap on the map away from the pins closes the list, as it does a popup
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("click", closeList);
    return () => listener.remove();
  }, [map, closeList]);

  // A list stays open only while its house is still in a group
  const listKey = listHouse
    ? ([...groupsByKey.keys()].find((key) =>
        key.split(",").includes(listHouse),
      ) ?? null)
    : null;

  const selected = entries.find((e) => e.entry._id === selectedEntryId);
  const marker = (entry: EntryWithFirstPhoto) => (
    <EntryMarker
      key={entry.entry._id}
      entry={entry}
      isHovered={hoveredEntryId === entry.entry._id}
      isSelected={selectedEntryId === entry.entry._id}
      compact={!isZoomedIn}
      onHover={setHoveredEntryId}
      onHoverEnd={endHover}
      onClick={openHouse}
      onClose={onDeselect}
    />
  );

  return (
    <>
      <WatchZoom onChange={setZoom} />
      {selected ? marker(selected) : null}
      {groups.map((group) => {
        if (group.members.length === 1) return marker(group.members[0].entry);
        const key = group.members.map((m) => m.id).join(",");
        return (
          <EntryGroupMarker
            key={key}
            groupKey={key}
            lat={group.lat}
            lng={group.lng}
            entries={group.members.map((m) => m.entry)}
            listOpen={listKey === key}
            onClick={tapGroup}
            onPick={openHouse}
            onCloseList={closeList}
          />
        );
      })}
    </>
  );
}
