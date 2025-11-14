import { EntriesQueryService } from "./entries/EntriesQueryService";
import { EntryApprovalService } from "./entries/EntryApprovalService";
import { convex } from "../schema";
import { MutationCtx, QueryCtx } from "../_generated/server";

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
};

export const createMutationServices = (
  context: MutationCtx,
): MutationServices => {
  // eslint-disable-next-line
  let services: Services = createQueryServices(context) as any;
  services.entryApproval = new EntryApprovalService(context, services);
  return services;
};

export type Services = QueryServices & MutationServices;

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
