import { MutationCtx, QueryCtx } from "../_generated/server";
import { QueryServices, Services } from "./services";

export abstract class QueryService {
  constructor(
    protected readonly context: QueryCtx,
    protected readonly services: QueryServices,
  ) {}
}

export abstract class MutationService {
  constructor(
    protected readonly context: MutationCtx,
    protected readonly services: Services,
  ) {}
}
