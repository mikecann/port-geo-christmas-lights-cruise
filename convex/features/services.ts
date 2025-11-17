import { EntriesQueryService } from "./entries/services/EntriesQueryService";
import { EntryApprovalService } from "./entries/services/EntryApprovalService";
import { EntryRejectionService } from "./entries/services/EntryRejectionService";
import { EntryMutationService } from "./entries/services/EntryMutationService";
import { EntryManagementService } from "./entries/services/EntryManagementService";
import { UserEntriesQueryService } from "./entries/services/UserEntriesQueryService";
import { UserEntryMutationService } from "./entries/services/UserEntryMutationService";
import { convex } from "../schema";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { EntryCreationService } from "./entries/services/EntryCreationService";
import { QueryService, UserQueryService } from "./lib";


const userQueryServices = {
  entries: UserEntriesQueryService,
} satisfies Record<
  string,
  new (
    context: QueryCtx,
    services: QueryServices,
    userId: Id<"users">,
  ) => UserQueryService
>;

const userMutationServices = {
  entries: UserEntriesQueryService,
} satisfies Record<
  string,
  new (
    context: QueryCtx,
    services: QueryServices,
    userId: Id<"users">,
  ) => UserQueryService
>;

export type QueryServices = {
  entries: EntriesQueryService;
};

export const createQueryServices = (context: QueryCtx): QueryServices => {
  // eslint-disable-next-line
  let services = {} as QueryServices;
  services.entries = new EntriesQueryService(context, services);
  return services;
};

export type MutationServices = {
  entryApproval: EntryApprovalService;
  entryRejection: EntryRejectionService;
  entryMutation: EntryMutationService;
  entryManagement: EntryManagementService;
};

export const createMutationServices = (context: MutationCtx): Services => {
  // eslint-disable-next-line
  let services: Services = createQueryServices(context) as any;
  services.entryApproval = new EntryApprovalService(context, services);
  services.entryRejection = new EntryRejectionService(context, services);
  services.entryMutation = new EntryMutationService(context, services);
  services.entryManagement = new EntryManagementService(context, services);
  return services;
};

export type Services = QueryServices & MutationServices;

export type UserQueryServices = {
  entries: UserEntriesQueryService;
};

export type UserMutationServices = {
  entryCreation: EntryCreationService;
  entries: UserEntryMutationService;
};

export const createUserQueryServices = (
  context: QueryCtx,
  userId: Id<"users">,
): UserQueryServices => {
  // eslint-disable-next-line
  let services = {} as UserQueryServices;
  const queryServices = createQueryServices(context);
  services.entries = new UserEntriesQueryService(
    context,
    queryServices,
    userId,
  );
  return services;
};

export const createUserMutationServices = (
  context: MutationCtx,
  userId: Id<"users">,
): UserMutationServices => {
  // eslint-disable-next-line
  let services = {} as UserMutationServices;
  const mutationServices = createMutationServices(context);
  services.entries = new UserEntryMutationService(
    context,
    mutationServices,
    userId,
  );
  return services;
};

export const queryServicesMiddleware = convex
  .query()
  .middleware(async ({ context, next }) => {
    return next({
      context: {
        ...context,
        services: createQueryServices(context),
      },
    });
  });

export const mutationServicesMiddleware = convex
  .mutation()
  .middleware(async ({ context, next }) => {
    return next({
      context: {
        ...context,
        services: createMutationServices(context),
      },
    });
  });
