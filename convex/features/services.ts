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
import {
  QueryService,
  MutationService,
  UserQueryService,
  UserMutationService,
} from "./lib";

const queryServices = {
  entries: EntriesQueryService,
} satisfies Record<
  string,
  new (context: QueryCtx, services: QueryServices) => QueryService
>;

const mutationServices = {
  entryApproval: EntryApprovalService,
  entryRejection: EntryRejectionService,
  entryMutation: EntryMutationService,
  entryManagement: EntryManagementService,
} satisfies Record<
  string,
  new (context: MutationCtx, services: Services) => MutationService
>;

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
  entryCreation: EntryCreationService,
  entries: UserEntryMutationService,
} satisfies Record<
  string,
  new (
    context: MutationCtx,
    services: Services,
    userId: Id<"users">,
  ) => UserMutationService
>;

export const services = {
  ...queryServices,
  ...mutationServices,
  ...userQueryServices,
  ...userMutationServices,
};

function createServiceInstances<TServices extends Record<string, unknown>>(
  serviceMap: Record<string, new (...args: unknown[]) => unknown>,
  instantiate: (ServiceClass: new (...args: unknown[]) => unknown) => unknown,
): TServices {
  const instances = {} as TServices;
  for (const [key, ServiceClass] of Object.entries(serviceMap))
    instances[key as keyof TServices] = instantiate(
      ServiceClass,
    ) as TServices[keyof TServices];
  return instances;
}

export type QueryServices = {
  entries: EntriesQueryService;
};

export const createQueryServices = (context: QueryCtx): QueryServices => {
  const serviceInstances = {} as QueryServices;
  return createServiceInstances(
    queryServices as Record<string, new (...args: unknown[]) => unknown>,
    (ServiceClass) => {
      return new (ServiceClass as new (
        context: QueryCtx,
        services: QueryServices,
      ) => EntriesQueryService)(context, serviceInstances);
    },
  );
};

export type MutationServices = {
  entryApproval: EntryApprovalService;
  entryRejection: EntryRejectionService;
  entryMutation: EntryMutationService;
  entryManagement: EntryManagementService;
};

export const createMutationServices = (context: MutationCtx): Services => {
  const queryServices = createQueryServices(context);
  const serviceInstances = { ...queryServices } as Services;
  const mutationInstances = createServiceInstances(
    mutationServices as Record<string, new (...args: unknown[]) => unknown>,
    (ServiceClass) => {
      return new (ServiceClass as new (
        context: MutationCtx,
        services: Services,
      ) => MutationService)(context, serviceInstances);
    },
  );
  return { ...serviceInstances, ...mutationInstances };
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
  const queryServices = createQueryServices(context);
  return createServiceInstances(
    userQueryServices as Record<string, new (...args: unknown[]) => unknown>,
    (ServiceClass) => {
      return new (ServiceClass as new (
        context: QueryCtx,
        services: QueryServices,
        userId: Id<"users">,
      ) => UserQueryService)(context, queryServices, userId);
    },
  );
};

export const createUserMutationServices = (
  context: MutationCtx,
  userId: Id<"users">,
): UserMutationServices => {
  const mutationServices = createMutationServices(context);
  return createServiceInstances(
    userMutationServices as Record<string, new (...args: unknown[]) => unknown>,
    (ServiceClass) => {
      return new (ServiceClass as new (
        context: MutationCtx,
        services: Services,
        userId: Id<"users">,
      ) => UserMutationService)(context, mutationServices, userId);
    },
  );
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
