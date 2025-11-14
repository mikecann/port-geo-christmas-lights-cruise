import { ConvexError } from "convex/values";
import { UserMutationService } from "../../lib";
import { ensure } from "../../../../shared/ensure";
import { COMPETITION_GEOGRAPHIC_BOUNDARY } from "../../../../shared/constants";
import { photos } from "../../photos/model";

export class UserEntryMutationService extends UserMutationService {
  async create() {
    const existing = await this.context.db
      .query("entries")
      .withIndex("by_submittedByUserId", (q) =>
        q.eq("submittedByUserId", this.userId),
      )
      .unique();
    if (existing)
      throw new Error(
        `Cannot enter competition, user '${this.userId}' already has an entry`,
      );

    return await this.context.db.insert("entries", {
      submittedByUserId: this.userId,
      status: "draft",
    });
  }

  async updateBeforeSubmission({
    houseAddress,
    name,
  }: {
    houseAddress?: { address: string; placeId: string };
    name?: string;
  }) {
    const entry = await this.context.db
      .query("entries")
      .withIndex("by_submittedByUserId", (q) =>
        q.eq("submittedByUserId", this.userId),
      )
      .unique();
    const entryWithStatus = ensure(entry, `User '${this.userId}' has no entry`);

    if (entryWithStatus.status != "draft")
      throw new Error(
        `Entry '${entryWithStatus._id}' is not in the draft status`,
      );

    const updateFields: {
      houseAddress?: { address: string; placeId: string };
      name?: string;
    } = {};
    if (houseAddress !== undefined) updateFields.houseAddress = houseAddress;

    if (name !== undefined) updateFields.name = name;

    await this.context.db.patch(entryWithStatus._id, updateFields);
  }

  async updateApproved({ name }: { name?: string }) {
    const entry = await this.context.db
      .query("entries")
      .withIndex("by_submittedByUserId", (q) =>
        q.eq("submittedByUserId", this.userId),
      )
      .unique();
    const entryWithStatus = ensure(entry, `User '${this.userId}' has no entry`);

    if (entryWithStatus.status !== "approved")
      throw new Error(
        `Entry '${entryWithStatus._id}' is not in approved status`,
      );

    const updateFields: {
      name?: string;
    } = {};
    if (name !== undefined) updateFields.name = name;

    await this.context.db.patch(entryWithStatus._id, updateFields);
  }

  async remove() {
    const entry = await this.context.db
      .query("entries")
      .withIndex("by_submittedByUserId", (q) =>
        q.eq("submittedByUserId", this.userId),
      )
      .unique();
    const entryWithStatus = ensure(entry, `User '${this.userId}' has no entry`);

    if (entryWithStatus.status != "draft")
      throw new Error(
        `Entry of id '${entryWithStatus._id}' with status '${entryWithStatus.status}' is not in the draft status`,
      );

    // Delete all photos for this entry
    await photos.forEntry(entryWithStatus._id).deleteAll(this.context);

    await this.context.db.delete(entryWithStatus._id);
  }

  async startSubmitting() {
    const entry = await this.context.db
      .query("entries")
      .withIndex("by_submittedByUserId", (q) =>
        q.eq("submittedByUserId", this.userId),
      )
      .unique();
    const entryWithStatus = ensure(entry, `User '${this.userId}' has no entry`);

    if (entryWithStatus.status != "draft")
      throw new Error(
        `Entry '${entryWithStatus._id}' is not in the draft status`,
      );

    if (!entryWithStatus.houseAddress)
      throw new Error(
        `Entry '${entryWithStatus._id}' is missing required house address`,
      );

    const { address, placeId } = entryWithStatus.houseAddress;
    if (
      typeof address !== "string" ||
      address.trim().length === 0 ||
      typeof placeId !== "string" ||
      placeId.trim().length === 0
    )
      throw new Error(
        `Invalid house address: address '${address}' and placeId '${placeId}' must be provided`,
      );

    if (
      await this.services.entries.hasEntryWithPlaceIdAlreadyBeenSubmitted(
        placeId,
      )
    )
      throw new ConvexError(
        `Address ${entryWithStatus.houseAddress.address} is already used!`,
      );

    await this.context.db.patch(entryWithStatus._id, {
      status: "submitting" as const,
      name: ensure(
        entryWithStatus.name,
        `Entry '${entryWithStatus._id}' is missing required name`,
      ),
      houseAddress: entryWithStatus.houseAddress,
    });

    return await this.services.entries.get({ entryId: entryWithStatus._id });
  }

  async finalizeSubmission({
    lat,
    lng,
    placeId,
  }: {
    lat: number;
    lng: number;
    placeId: string;
  }) {
    const entry = await this.context.db
      .query("entries")
      .withIndex("by_submittedByUserId", (q) =>
        q.eq("submittedByUserId", this.userId),
      )
      .unique();
    const entryWithStatus = ensure(entry, `User '${this.userId}' has no entry`);

    if (entryWithStatus.status != "submitting")
      throw new Error(
        `Entry '${entryWithStatus._id}' is not in the submitting status`,
      );

    if (
      await this.services.entries.hasEntryWithPlaceIdAlreadyBeenSubmitted(
        placeId,
        entryWithStatus._id,
      )
    )
      throw new Error(
        `Cannot finalize submission: Place ID '${placeId}' already has an approved entry`,
      );

    if (!this.isLocationWithinCompetitionBoundary(lat, lng))
      throw new Error(
        `Address "${entryWithStatus.houseAddress?.address || "unknown"}" is outside the competition area. Entries must be within the Port Geographe/Busselton region.`,
      );

    const houseAddress =
      typeof entryWithStatus.houseAddress === "object" &&
      "address" in entryWithStatus.houseAddress
        ? entryWithStatus.houseAddress.address
        : "";

    await this.context.db.patch(entryWithStatus._id, {
      status: "submitted" as const,
      submittedAt: Date.now(),
      houseAddress: {
        address: houseAddress,
        lat,
        lng,
        placeId,
      },
    });
  }

  async revertToDraft() {
    const entry = await this.context.db
      .query("entries")
      .withIndex("by_submittedByUserId", (q) =>
        q.eq("submittedByUserId", this.userId),
      )
      .unique();
    const entryWithStatus = ensure(entry, `User '${this.userId}' has no entry`);

    if (entryWithStatus.status !== "submitting")
      throw new Error(
        `Entry '${entryWithStatus._id}' is not in submitting status, cannot revert`,
      );

    // Revert back to draft, preserving the address data as optional draft format
    const draftAddress =
      typeof entryWithStatus.houseAddress === "object" &&
      "address" in entryWithStatus.houseAddress &&
      "placeId" in entryWithStatus.houseAddress
        ? {
            address: entryWithStatus.houseAddress.address,
            placeId: entryWithStatus.houseAddress.placeId,
          }
        : undefined;

    await this.context.db.patch(entryWithStatus._id, {
      status: "draft" as const,
      houseAddress: draftAddress,
    });
  }

  private isLocationWithinCompetitionBoundary(
    lat: number,
    lng: number,
  ): boolean {
    const { southWest, northEast } = COMPETITION_GEOGRAPHIC_BOUNDARY;

    return (
      lat >= southWest.lat &&
      lat <= northEast.lat &&
      lng >= southWest.lng &&
      lng <= northEast.lng
    );
  }
}
