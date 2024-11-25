import logger from "../config/logger";
import { GraphQLError } from "graphql";

export default function userTagNotFoundError(
  resolver: string,
  user_id: number | undefined,
): never {
  logger.error(`Usertag not found within new pornstar tags`, {
    resolver,
    user_id,
  });
  throw new GraphQLError(`Error with tags.`, {
    extensions: {
      code: `ERROR_WITH_TAGS`,
    },
  });
}
