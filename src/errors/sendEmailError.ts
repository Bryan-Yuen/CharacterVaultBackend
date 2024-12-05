import logger from "../config/logger";
import { GraphQLError } from "graphql";

export default function sendEmailError(
  resolver: string,
  email_type: string,
  email: string,
  error: any,
  user_id?: number | undefined
): never {
  if (error instanceof GraphQLError) {
    throw error;
  }
  logger.error(`${email_type} failed to send for email: ${email}`, {
    resolver,
    email_type,
    email,
    error,
    user_id: user_id || undefined
  });
  throw new GraphQLError("Internal server error.", {
    extensions: { code: "INTERNAL_SERVER_ERROR" },
  });
}