import { Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { QueryServices, MutationServices, Services } from "./services";

export abstract class QueryService {
  constructor(
    protected readonly context: QueryCtx,
    protected readonly services: QueryServices,
  ) {}
}

export abstract class MutationService extends QueryService {
  protected readonly queryServices: QueryServices;
  protected readonly mutationServices: MutationServices;

  constructor(
    protected readonly context: MutationCtx,
    protected readonly services: Services,
  ) {
    super(context, services);
    this.queryServices = services;
    this.mutationServices = services;
  }
}

export abstract class UserQueryService extends QueryService {
  constructor(
    protected readonly context: QueryCtx,
    protected readonly services: QueryServices,
    protected readonly userId: Id<"users">,
  ) {
    super(context, services);
  }
}

export abstract class UserMutationService extends MutationService {
  constructor(
    protected readonly context: MutationCtx,
    protected readonly services: Services,
    protected readonly userId: Id<"users">,
  ) {
    super(context, services);
  }
}
