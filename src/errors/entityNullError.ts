import logger from "../config/logger";
import { GraphQLError } from "graphql";

export default function entityNullError(
  resolver: string,
  entity: string,
  user_id: number | undefined,
  entity_id: number | undefined,
): never {
  logger.error(`${entity} is null`, {
    resolver,
    user_id,
    entity_id,
  });
  throw new GraphQLError(`${entity} not found.`, {
    extensions: {
      code: `${entity.toUpperCase}_NOT_FOUND`,
    },
  });
}
