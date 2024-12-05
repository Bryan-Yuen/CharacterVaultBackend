import { MiddlewareFn } from "type-graphql";
import { MyContext } from "../index";
import { version } from "../../package.json";
import { GraphQLError } from "graphql";

// this just makes sure the user is logged into an account before calling our requests
const versionChecker: MiddlewareFn<MyContext> = async (
  { context: { req } },
  next
) => {
  const clientVersion = req.headers["client-version"] as string;
  if (!clientVersion) {
    throw new Error("Client version is missing");
  }

  // Extract major versions
  const clientMajorVersion = parseInt(clientVersion.split(".")[0], 10);
  const backendMajorVersion = parseInt(version.split(".")[0], 10);

  // Compare major versions
  if (clientMajorVersion < backendMajorVersion) {
    throw new GraphQLError(
      `Client version ${clientVersion} is incompatible with backend version ${version}.`,
      {
        extensions: { code: "VERSION_ERROR" },
      }
    );
  }

  return next();
};

export default versionChecker;
