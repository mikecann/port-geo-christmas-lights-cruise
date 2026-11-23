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
    return groupPins(points, zoom, isZoomedIn ? PHOTO_PIN : NUMBER_PIN).map(
      (group) => ({
        ...group,
        key: group.members.map((m) => m.id).join(","),
        entries: group.members.map((m) => m.entry),
      }),
    );
  }, [entries, selectedEntryId, zoom, isZoomedIn]);

  const groupsByKey = useMemo(
    () =>
      new Map(
        groups.filter((g) => g.members.length > 1).map((g) => [g.key, g]),
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
      // Either way, an open house's popup closes, so it isn't left over the
      // houses you're looking at
      onDeselect();
      const openList = () => setListHouse(group.members[0].id);
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
  // Zooming regroups the pins, so an open list closes rather than moving to
  // whatever group its house ends up in. A hovered pin may have been folded
  // into a group without hearing the mouse leave, so that's dropped too.
  const zoomChanged = useCallback((next: number) => {
    setZoom(next);
    setListHouse(null);
    setHoveredEntryId(null);
  }, []);

  // A tap on the map away from the pins closes the list, as it does a popup
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("click", closeList);
    return () => listener.remove();
  }, [map, closeList]);

  // A list stays open only while its house is still in a group. Once it
  // isn't (the data changed), the list is gone for good, rather than coming
  // back by itself if the house is grouped again later.
  const listKey = listHouse
    ? ([...groupsByKey.keys()].find((key) =>
        key.split(",").includes(listHouse),
      ) ?? null)
    : null;
  if (listHouse && !listKey && zoom !== null) setListHouse(null);

  // A house opened some other way (Back, a link) closes the list. Checked
  // while rendering, as React suggests for state that follows a prop.
  const [lastSelected, setLastSelected] = useState(selectedEntryId);
  if (selectedEntryId !== lastSelected) {
    setLastSelected(selectedEntryId);
    if (selectedEntryId) setListHouse(null);
  }

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

  // One list of pins, so a house keeps the same marker when it's opened or
  // closed rather than being drawn again
  const pins = groups.map((group) =>
    group.members.length === 1 ? (
      marker(group.entries[0])
    ) : (
      <EntryGroupMarker
        key={group.key}
        groupKey={group.key}
        lat={group.lat}
        lng={group.lng}
        entries={group.entries}
        listOpen={listKey === group.key}
        onClick={tapGroup}
        onPick={openHouse}
        onCloseList={closeList}
      />
    ),
  );
  if (selected) pins.push(marker(selected));

  return (
    <>
      <WatchZoom onChange={zoomChanged} />
      {pins}
    </>
  );
}
