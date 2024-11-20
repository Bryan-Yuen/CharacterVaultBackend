import { MiddlewareFn } from "type-graphql";
import { MyContext } from "../index";

// this just makes sure the user is logged into an account before calling our requests
const isAuth: MiddlewareFn<MyContext> = async ({ context }, next) => {
  if (!context.req.session.userId) {
    throw new Error("not authenticated");
  }

  return next();
};

export default isAuth