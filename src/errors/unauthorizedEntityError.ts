import logger from "../config/logger";
import { GraphQLError } from "graphql";

// user_id is the hackers id, unauthorized_user_id is the user the hacker is trying to access
export default function unauthorizedEntityError(
  resolver: string,
  entity: string,
  user_id: number | undefined,
  unauthorized_user_id: number | undefined,
  entity_id: number | undefined
): never {
  logger.error(
    `unauthorized access to ${entity} with user_id: ${user_id} and unauthorized_user_id: ${unauthorized_user_id}`,
    {
      resolver,
      user_id,
      unauthorized_user_id,
      entity_id,
    }
  );
  throw new GraphQLError("Unauthorized Access", {
    extensions: {
      code: "UNAUTHORIZED_ACCESS",
    },
  });
}
