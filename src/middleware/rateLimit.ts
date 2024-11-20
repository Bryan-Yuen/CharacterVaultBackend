import { MiddlewareFn } from "type-graphql";
import { MyContext } from "../index";

//const ONE_DAY = 60 * 60 * 24

const rateLimit: (limit?: number, seconds?: number) => MiddlewareFn<MyContext> = (limit = 100, seconds = 60 * 60 * 24) => async ({ context: { req, redis }, info }, next) => {
  const key = `rate-limit:${info.fieldName}:${req.ip}`;

  // Lua script to increment the counter and set the expiration atomically
  const luaScript = `
    local current = redis.call("INCR", KEYS[1])
    if current == 1 then
      redis.call("EXPIRE", KEYS[1], ARGV[1])
    end
    return current
  `;

  try {
    // Execute the Lua script atomically
    const current = await redis.eval(luaScript, 1, key, seconds);

    // Check if the limit has been exceeded
    if (typeof current !== 'number') {
      throw new Error('Unexpected result from rate limit script');
    }

    // Check if the limit has been exceeded
    if (current > limit + 1) {
      throw new Error("Maximum number of requests reached");
    }

    return next();
  } catch (error) {
    // Handle any errors
    console.error("Rate limit error:", error);
    throw new Error("Rate limit error occurred");
  }
};

/*
export const rateLimit: (limit? : number) => MiddlewareFn<MyContext> = (limit = 50) => async ({ context : {req , redis} , info} , next) => {
  const key = `rate-limit:${info.fieldName}:${req.ip}`

  const current = await redis.incr(key)
  if (current > limit) {
    throw new Error("too much")
  }
  else if (current === 1){
    await redis.expire(key, ONE_DAY)
  }


  return next();
};
*/

export default rateLimit