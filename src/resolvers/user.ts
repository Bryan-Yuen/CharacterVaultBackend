import { UserAccount } from "../entities/UserAccount";
import {
  Resolver,
  Mutation,
  Arg,
  Ctx,
  Query,
  UseMiddleware,
} from "type-graphql";
import AppDataSource from "../config/db";
import bcrypt from "bcrypt";
import { GraphQLError } from "graphql";
import RegisterUserInput from "../inputTypes/RegisterUserInput";
import LoginUserInput from "../inputTypes/LoginUserInput";
import { UserProfileReturn } from "../returnTypes/UserProfileReturn";
import { UserLoginHistory } from "../entities/UserLoginHistory";
import { SuccessResponse } from "../returnTypes/SuccessResponse";
import { MyContext } from "../index";
import { v4 as uuidv4 } from "uuid";
import { isAuth } from "../middleware/isAuth";
import { rateLimit } from "../middleware/rateLimit";
import { sendForgotPasswordEmail } from "../emails/forgotPasswordEmail";
import { sendWelcomeEmail } from "../emails/welcomeEmail";
import { sendChangeEmailAddressEmail } from "../emails/changeEmailAddressEmail";

@Resolver(UserAccount)
export class UserResolver {
  // might need a rate limit here just in case someone use bot to spam refresh althought this is a cheap operation
  @Query(() => Boolean)
  async checkIfLoggedin(@Ctx() { req }: MyContext): Promise<Boolean> {
    console.log("im in checkifloggedin", req.session.userId);
    if (req.session.userId) return true;
    else return false;
  }

  @Mutation(() => SuccessResponse)
  @UseMiddleware(rateLimit(10, 60 * 60 * 24))
  async registerUser(
    @Arg("registerUserData") registerUserData: RegisterUserInput,
    @Ctx() { req }: MyContext
  ): Promise<SuccessResponse> {
    const userRepository = AppDataSource.getRepository(UserAccount);
    const userLoginHistoryRepository =
      AppDataSource.getRepository(UserLoginHistory);

    try {
      const [userEmailExists, userUsernameExists] = await Promise.all([
        userRepository.findOneBy({ user_email: registerUserData.user_email }),
        userRepository.findOneBy({
          user_username: registerUserData.user_username,
        }),
      ]);

      if (userEmailExists) {
        throw new GraphQLError(
          "Registration failed. Email is already in use.",
          {
            extensions: { code: "EMAIL_EXISTS" },
          }
        );
      }

      if (userUsernameExists) {
        throw new GraphQLError("Registration failed. Username already taken", {
          extensions: { code: "USERNAME_TAKEN" },
        });
      }

      const hashedPassword = await bcrypt.hash(
        registerUserData.user_password,
        10
      );
      const user = new UserAccount();
      user.user_username = registerUserData.user_username;
      user.user_email = registerUserData.user_email;
      user.user_password = hashedPassword;

      const saveUser = await AppDataSource.manager.save(user);

      req.session.userId = saveUser.user_id;

      const userLoginHistory = new UserLoginHistory();
      userLoginHistory.user_created_date_time = new Date();
      userLoginHistory.user_last_login_date_time = new Date();
      userLoginHistory.user = saveUser;

      await userLoginHistoryRepository.save(userLoginHistory);

      //return user;
      await sendWelcomeEmail(
        registerUserData.user_username,
        registerUserData.user_email
      );
      return {
        message: "User registration successful!",
        success: true,
      };
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      } else {
        console.error("Unexpected error during registration:", error);
        throw new GraphQLError("Internal server error during registration.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    }
  }

  //return payload
  @Mutation(() => SuccessResponse)
  // rate limit 25 times in 1 hour seems fair
  @UseMiddleware(rateLimit(25, 60 * 60))
  async loginUser(
    @Arg("loginUserData") loginUserData: LoginUserInput,
    @Ctx() { req }: MyContext
  ): Promise<SuccessResponse> {
    try {
      const userRepository = AppDataSource.getRepository(UserAccount);
      const user = await userRepository.findOneBy({
        user_email: loginUserData.user_email,
      });
      if (user === null) {
        throw new GraphQLError("Email is not registered.", {
          extensions: {
            code: "EMAIL_NOT_REGISTERED",
          },
        });
      }
      const match = await bcrypt.compare(
        loginUserData.user_password,
        user.user_password
      );
      if (!match) {
        console.log("im in incorrect");
        throw new GraphQLError("Invalid email and password combination.", {
          extensions: {
            code: "INCORRECT_PASSWORD",
          },
        });
      } else {
        console.log("checking user_id", user.user_id);
        req.session.userId = user.user_id;
        return {
          message: "User login successful!",
          success: true,
        };
      }
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      } else {
        console.error("Unexpected error during registration:", error);
        throw new GraphQLError("Internal server error during registration.", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
    }
  }

  //return payload
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5))
  async logoutUser(@Ctx() { req, res }: MyContext): Promise<Boolean> {
    return new Promise((resolve) =>
      req.session.destroy((err) => {
        res.clearCookie("fap");
        if (err) {
          console.log(err);
          resolve(false);
          return;
        }

        resolve(true);
      })
    );
  }

  @Mutation(() => Boolean)
  // this sends an email so only limiting to 10 emails a day
  //@UseMiddleware(rateLimit(10, 60 * 60 * 24))
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { redis }: MyContext
  ): Promise<Boolean> {
    try {
      const userRepository = AppDataSource.getRepository(UserAccount);
      const userEmail = await userRepository.findOneBy({
        user_email: email,
      });
      if (userEmail === null) {
        throw new GraphQLError("Email does not exist.", {
          extensions: {
            code: "EMAIL_NOT_REGISTERED",
          },
        });
      }
      console.log(userEmail);
      const token = uuidv4();

      // expires in 1 hour
      await redis.set(token, userEmail.user_id, "EX", 1000 * 60 * 60);

      const changePasswordUrl = `http://192.168.0.208:3000/change-password?token=${token}`;
      await sendForgotPasswordEmail(userEmail.user_username, changePasswordUrl);
      //sendForgotPasswordEmail(changePasswordUrl);
      return true;
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      } else {
        console.error("Unexpected error during reset password link:", error);
        throw new GraphQLError(
          "Internal server error during reset password link.",
          {
            extensions: { code: "INTERNAL_SERVER_ERROR" },
          }
        );
      }
    }
  }

  @Mutation(() => Boolean)
  @UseMiddleware(rateLimit(50, 60 * 5))
  async changePassword(
    @Arg("token") token: string,
    @Arg("newPassword") newPassword: string,
    @Ctx() { redis }: MyContext
  ): Promise<Boolean> {
    try {
      const userId = await redis.get(token);
      if (!userId) {
        throw new GraphQLError("Token Expired.", {
          extensions: {
            code: "TOKEN_EXPIRED",
          },
        });
      }

      const userIdNum = parseInt(userId);

      const userRepository = AppDataSource.getRepository(UserAccount);
      const user = await userRepository.findOneBy({
        user_id: userIdNum,
      });

      //check if user still exists
      if (!user) {
        throw new GraphQLError("User no longer exists.", {
          extensions: {
            code: "TOKEN_EXPIRED",
          },
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.user_password = hashedPassword;

      // this will be in a seperate resolver and will be updated every time the user hits the dashboard page
      // this might not be needed just on dashboard page
      //user.user_last_login_date_time = new Date();

      await userRepository.save(user);
      await redis.del(token);

      return true;
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      } else {
        console.error("Unexpected error during change password:", error);
        throw new GraphQLError(
          "Internal server error during change password.",
          {
            extensions: { code: "INTERNAL_SERVER_ERROR" },
          }
        );
      }
    }
  }

  @Query(() => UserProfileReturn)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5))
  async getUserProfile(@Ctx() { req }: MyContext): Promise<UserProfileReturn> {
    const userRepository = AppDataSource.getRepository(UserAccount);
    const user = await userRepository.findOneBy({
      user_id: req.session.userId,
    });
    if (user) {
      return {
        user_username: user.user_username,
        user_email: user.user_email,
      };
    } else {
      throw new GraphQLError("User is not found.", {
        extensions: {
          code: "USER_NOT_FOUND",
        },
      });
    }
  }

  // make sure to do some input validation on the input class file
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(25, 60 * 60))
  async changePasswordLoggedIn(
    @Arg("currentPassword") currentPassword: string,
    @Arg("newPassword") newPassword: string,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    try {
      const userRepository = AppDataSource.getRepository(UserAccount);
      const user = await userRepository.findOneBy({
        user_id: req.session.userId,
      });
      //check if user still exists
      if (!user) {
        throw new GraphQLError("User no longer exists.", {
          extensions: {
            code: "TOKEN_EXPIRED",
          },
        });
      }
      const match = await bcrypt.compare(currentPassword, user.user_password);
      console.log(match);
      if (!match) {
        throw new GraphQLError("Invalid email and username combination.", {
          extensions: {
            code: "INCORRECT_PASSWORD",
          },
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.user_password = hashedPassword;

      // this will be in a seperate resolver and will be updated every time the user hits the dashboard page
      // this might not be needed just on dashboard page
      //user.user_last_login_date_time = new Date();

      await userRepository.save(user);
      /*
      const keys = await redis.scan(0, 'MATCH', '*')

      return new Promise((resolve) =>
      req.session.destroy((err) => {
        res.clearCookie("fap");
        if (err) {
          console.log(err);
          resolve(false);
          return;
        }

        resolve(true);
      })
    );
    */

      return true;
    } catch (err) {
      console.log(err);
      return err;
    }
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  // this sends an email so 10 times per day
  @UseMiddleware(rateLimit(10, 60 * 60 * 24))
  async changeEmail(
    @Arg("newEmail") newEmail: string,
    @Ctx() { req, redis }: MyContext
  ): Promise<Boolean> {
    try {
      console.log("hi?");
      console.log(newEmail);
      const userRepository = AppDataSource.getRepository(UserAccount);
      const user = await userRepository.findOneBy({
        user_id: req.session.userId,
      });
      if (user === null) {
        throw new GraphQLError("Email does not exist.", {
          extensions: {
            code: "EMAIL_DOES_NOT_EXISTS",
          },
        });
      }
      console.log(user);
      const token = uuidv4();

      await redis.set(
        token,
        JSON.stringify({
          user_id: user.user_id,
          user_new_email: newEmail,
        }),
        "EX",
        1000 * 60 * 60 * 24 * 3
      ); // 3 days

      const changeEmailUrl = `http://192.168.0.208:3000/confirm-new-email?token=${token}`;

      sendChangeEmailAddressEmail(user.user_username, changeEmailUrl);
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  @Mutation(() => UserAccount)
  @UseMiddleware(rateLimit(50, 60 * 5))
  async confirmChangeEmail(
    @Arg("token") token: string,
    @Ctx() { redis }: MyContext
  ): Promise<UserAccount> {
    try {
      console.log("suo", token);
      const userObj = await redis.get(token);
      if (!userObj) {
        throw new GraphQLError("Token Expired.", {
          extensions: {
            code: "TOKEN_EXPIRED",
          },
        });
      }

      const userInfo = JSON.parse(userObj);

      const userRepository = AppDataSource.getRepository(UserAccount);
      const user = await userRepository.findOneBy({
        user_id: userInfo.user_id,
      });

      //check if user still exists
      if (!user) {
        throw new GraphQLError("User no longer exists.", {
          extensions: {
            code: "TOKEN_EXPIRED",
          },
        });
      }

      user.user_email = userInfo.user_new_email;

      // this will be in a seperate resolver and will be updated every time the user hits the dashboard page
      // this might not be needed just on dashboard page
      //user.user_last_login_date_time = new Date();

      const updatedUser = await userRepository.save(user);
      await redis.del(token);

      return updatedUser;
    } catch (err) {
      console.log(err);
      return err;
    }
  }
}
