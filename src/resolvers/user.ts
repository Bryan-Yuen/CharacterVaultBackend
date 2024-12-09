// entities
import UserAccount from "../entities/UserAccount";
import UserLoginHistory from "../entities/UserLoginHistory";
import { MyContext } from "../index";
// dependencies
import {
  Resolver,
  Mutation,
  Arg,
  Ctx,
  Query,
  UseMiddleware,
} from "type-graphql";
import bcrypt from "bcrypt";
import { GraphQLError } from "graphql";
import { v4 as uuidv4 } from "uuid";
// config
import AppDataSource from "../config/db";
import logger from "../config/logger";
// input types
import RegisterUserInputType from "../inputTypes/RegisterUserInputType";
import LoginUserInputType from "../inputTypes/LoginUserInputType";
import ForgotPasswordInputType from "../inputTypes/ForgotPasswordInputType";
import ChangePasswordInputType from "../inputTypes/ChangePasswordInputType";
import ChangePasswordLoggedInInputType from "../inputTypes/ChangePasswordLoggedInInputType";
import ChangeEmailInputType from "../inputTypes/ChangeEmailInputType";
import ConfirmChangeEmailInputType from "../inputTypes/ConfirmChangeEmailInputType";
import ConfirmEmailAddressInputType from "../inputTypes/ConfirmEmailAddressInputType";
import UpdateUserIsInterestedInputType from "../inputTypes/UpdateUserIsInterested";
// return types
import UserProfileReturn from "../returnTypes/UserProfileReturn";
// middleware
import isAuth from "../middleware/isAuth";
import rateLimit from "../middleware/rateLimit";
import versionChecker from "../middleware/versionChecker";
// emails
import sendForgotPasswordEmail from "../emails/forgotPasswordEmail";
//import sendWelcomeEmail from "../emails/welcomeEmail";
import sendChangeEmailAddressEmail from "../emails/changeEmailAddressEmail";
import sendEmailVerificationEmail from "../emails/emailVerificationEmail";
// errors
import entityNullError from "../errors/entityNullError";
import findEntityError from "../errors/findEntityError";
import saveEntityError from "../errors/saveEntityError";
import sendEmailError from "../errors/sendEmailError";
import redisError from "../errors/redisError";

@Resolver(UserAccount)
export class UserResolver {
  // checks if user is logged in when they land on an authentication page for the first time or refresh on an authentication page.
  // also updates their login history with the current time.
  @Query(() => Boolean)
  // rate limit here just in case someone use bot to spam refresh.
  @UseMiddleware(rateLimit(50, 60 * 5)) // max 50 requests per 5 minutes
  async checkIfLoggedin(@Ctx() { req }: MyContext): Promise<Boolean> {
    try {
      console.log("im in checkifloggedin", req.session.userId);
      if (req.session.userId) {
        const userRepository = AppDataSource.getRepository(UserAccount);
        const user = await userRepository.findOne({
          where: {
            user_id: req.session.userId,
          },
          relations: ["userLoginHistory"],
        });
        if (user === null) {
          entityNullError(
            "checkIfLoggedin",
            "user",
            req.session.userId,
            req.session.userId
          );
        }
        if (user.userLoginHistory === null) {
          entityNullError(
            "checkIfLoggedin",
            "userLoginHistory",
            req.session.userId,
            req.session.userId
          );
        }

        const userLoginHistoryRepository =
          AppDataSource.getRepository(UserLoginHistory);
        user.userLoginHistory.user_last_login_date_time = new Date();
        try {
          await userLoginHistoryRepository.save(user.userLoginHistory);
        } catch (error) {
          saveEntityError(
            "checkIfLoggedin",
            "userLoginHistory",
            req.session.userId,
            user.userLoginHistory,
            error
          );
        }

        // this user.user_is_verified is just for if user clicks on email confirm link in incognito tab and then they go back to regular browser and refresh email-verification page
        if (req.session.verified || user.user_is_verified) return true;
        else return false;
      } else return false;
    } catch (error) {
      findEntityError(
        "checkIfLoggedin",
        "user",
        req.session.userId,
        req.session.userId,
        error
      );
    }
  }

  // registers new user
  @Mutation(() => Boolean)
  @UseMiddleware(versionChecker)
  //@UseMiddleware(rateLimit(10, 60 * 60 * 24)) // max 10 requests per day per ip
  async registerUser(
    @Arg("registerUserData")
    { user_username, user_email, user_password }: RegisterUserInputType,
    @Ctx() { req, redis }: MyContext
  ): Promise<Boolean> {
    try {
      const userRepository = AppDataSource.getRepository(UserAccount);
      const userLoginHistoryRepository =
        AppDataSource.getRepository(UserLoginHistory);

      const [userEmailExists, userUsernameExists] = await Promise.all([
        userRepository.findOneBy({ user_email: user_email }),
        userRepository.findOneBy({
          user_username: user_username,
        }),
      ]);

      // expected error for email already exists
      if (userEmailExists) {
        throw new GraphQLError(
          "Registration failed. Email is already in use.",
          {
            extensions: { code: "EMAIL_EXISTS" },
          }
        );
      }

      // expected error for username already exists
      if (userUsernameExists) {
        throw new GraphQLError("Registration failed. Username already taken", {
          extensions: { code: "USERNAME_TAKEN" },
        });
      }

      // hash password
      const hashedPassword = await bcrypt.hash(user_password, 10);
      const user = new UserAccount();
      user.user_username = user_username;
      user.user_email = user_email;
      user.user_password = hashedPassword;

      try {
        const saveUser = await AppDataSource.manager.save(user);

        req.session.userId = saveUser.user_id;

        const userLoginHistory = new UserLoginHistory();
        userLoginHistory.user_created_date_time = new Date();
        userLoginHistory.user_last_login_date_time = new Date();
        userLoginHistory.user = saveUser;

        try {
          await userLoginHistoryRepository.save(userLoginHistory);
        } catch (error) {
          saveEntityError(
            "registerUser",
            "userLoginHistory",
            req.session.userId,
            userLoginHistory,
            error
          );
        }
      } catch (error) {
        saveEntityError(
          "registerUser",
          "user",
          req.session.userId,
          user,
          error
        );
      }

      /*
      try {
        await sendWelcomeEmail(
          user_username,
          user_email
        );
      } catch (error) {
        // not going to throw error here because not sending email is not that important. will just log it
        logger.error(
          `welcome email failed to send for email: ${user_email}`,
          {
            resolver: "registerUser",
            email_type: "welcome email",
            user_id: req.session.userId,
            email: user_email,
            error,
          }
        );
      }
        */
      const token = uuidv4();

      try {
        await redis.set(
          token,
          JSON.stringify({
            user_id: user.user_id,
          }),
          "EX",
          1000 * 60 * 60 * 24 * 3
        ); // 3 days

        const changeEmailUrl = `${process.env.DEVELOPMENT_URL}/email-verified?token=${token}`;

        try {
          await sendEmailVerificationEmail(
            user.user_username,
            user.user_email,
            changeEmailUrl
          );
        } catch (error) {
          sendEmailError(
            "registerUser",
            "email verification email",
            user_email,
            error,
            req.session.userId
          );
        }
      } catch (error) {
        redisError("registerUser", "SET", error, -1);
      }

      return true;
    } catch (error) {
      // either one of the find by username or email caused the error
      findEntityError(
        "registerUser",
        "user",
        req.session.userId,
        req.session.userId,
        error
      );
    }
  }

  // logins current user
  @Mutation(() => Boolean)
  @UseMiddleware(versionChecker)
  @UseMiddleware(rateLimit(20, 60 * 5)) // max 20 login attempts per 5 minutes
  async loginUser(
    @Arg("loginUserData") { user_email, user_password }: LoginUserInputType,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    try {
      const userRepository = AppDataSource.getRepository(UserAccount);
      const user = await userRepository.findOneBy({
        user_email: user_email,
      });

      // expected error, when user tries to log in with unregistered email
      if (user === null) {
        throw new GraphQLError("Email is not registered.", {
          extensions: {
            code: "EMAIL_NOT_REGISTERED",
          },
        });
      }

      const match = await bcrypt.compare(user_password, user.user_password);
      // expected error, when user enteres incorrect password
      if (!match) {
        throw new GraphQLError("Invalid email and password combination.", {
          extensions: {
            code: "INCORRECT_PASSWORD",
          },
        });
      } else {
        // stores id in session cookie
        req.session.userId = user.user_id;
        if (!user.user_is_verified) {
          throw new GraphQLError("Email is not verified.", {
            extensions: {
              code: "EMAIL_NOT_VERIFIED",
            },
          });
        }
        req.session.verified = true;
        return true;
      }
    } catch (error) {
      findEntityError(
        "loginUser",
        "user",
        req.session.userId,
        req.session.userId,
        error
      );
    }
  }

  // logs user out and clears session cookie
  @Mutation(() => Boolean)
  //@UseMiddleware(isAuth)
  @UseMiddleware(versionChecker)
  @UseMiddleware(rateLimit(20, 60 * 5)) // max 20 requests per 5 minutes
  async logoutUser(@Ctx() { req, res }: MyContext): Promise<Boolean> {
    return new Promise((resolve) =>
      // destroys session data on server side
      req.session.destroy((error) => {
        if (error) {
          logger.error(`Error logging out for user_id: ${req.session.userId}`, {
            resolver: "logoutUser",
            user_id: req.session.userId,
            error,
          });
          resolve(false);
          return;
        }
        // clears cookie on client side
        res.clearCookie("fap");
        console.log("i have cleared session logout");
        resolve(true);
      })
    );
  }

  // sends a reset password email with url and token link
  @Mutation(() => Boolean)
  //@UseMiddleware(rateLimit(10, 60 * 60 * 24)) // max 10 emails a day
  async forgotPassword(
    @Arg("forgotPasswordInput") { user_email }: ForgotPasswordInputType,
    @Ctx() { redis }: MyContext
  ): Promise<Boolean> {
    try {
      const userRepository = AppDataSource.getRepository(UserAccount);
      const user = await userRepository.findOneBy({
        user_email: user_email,
      });
      // expected error if user enters an email that is not registered
      if (user === null) {
        throw new GraphQLError("Email does not exist.", {
          extensions: {
            code: "EMAIL_NOT_REGISTERED",
          },
        });
      }

      const token = uuidv4();

      try {
        // expires in 1 hour
        await redis.set(token, user.user_id, "EX", 1000 * 60 * 60);
        try {
          const changePasswordUrl = `${process.env.DEVELOPMENT_URL}/change-password?token=${token}`;
          await sendForgotPasswordEmail(
            user.user_username,
            user_email,
            changePasswordUrl
          );
        } catch (error) {
          sendEmailError(
            "forgotPassword",
            "reset password email",
            user_email,
            error
          );
        }
      } catch (error) {
        redisError("forgotPassword", "SET", error);
      }

      return true;
    } catch (error) {
      if (error instanceof GraphQLError) {
        throw error;
      }
      logger.error("Error fetching user", {
        resolver: "forgotPassword",
        user_email: user_email,
        error,
      });
      throw new GraphQLError("Internal server error.", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    }
  }

  // resets password using the link from email with token
  @Mutation(() => Boolean)
  @UseMiddleware(rateLimit(20, 60 * 5)) // max 20 login attempts per 5 minutes
  async changePassword(
    @Arg("changePasswordInput")
    { new_password, token }: ChangePasswordInputType,
    @Ctx() { redis }: MyContext
  ): Promise<Boolean> {
    try {
      const userId = await redis.get(token);
      // expected error if user waited too long and clicked on link
      if (userId === null) {
        throw new GraphQLError("Token Expired.", {
          extensions: {
            code: "TOKEN_EXPIRED",
          },
        });
      }

      const userIdNum = parseInt(userId);

      const userRepository = AppDataSource.getRepository(UserAccount);
      try {
        const user = await userRepository.findOneBy({
          user_id: userIdNum,
        });
        if (user === null) {
          entityNullError("changePassword", "user", userIdNum, userIdNum);
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        user.user_password = hashedPassword;

        try {
          // these 2 executions don't depend on one another so will batch them.
          await Promise.all([userRepository.save(user), redis.del(token)]);
        } catch (error) {
          saveEntityError(
            "changePassword",
            "user or redis del in promise.all",
            userIdNum,
            user,
            error
          );
        }
      } catch (error) {
        findEntityError("changePassword", "user", userIdNum, userIdNum, error);
      }

      return true;
    } catch (error) {
      redisError("changePassword", "GET", error);
    }
  }

  // gets user's username and email
  @Query(() => UserProfileReturn)
  @UseMiddleware(isAuth)
  @UseMiddleware(versionChecker)
  @UseMiddleware(rateLimit(50, 60 * 5)) // max 50 requests per 5 minutes
  async getUserProfile(@Ctx() { req }: MyContext): Promise<UserProfileReturn> {
    try {
      const userRepository = AppDataSource.getRepository(UserAccount);
      const user = await userRepository.findOneBy({
        user_id: req.session.userId,
      });
      if (user === null) {
        entityNullError(
          "getUserProfile",
          "user",
          req.session.userId,
          req.session.userId
        );
      } else {
        return {
          user_username: user.user_username,
          user_email: user.user_email,
          user_is_interested: user.user_is_interested
        };
      }
    } catch (error) {
      findEntityError(
        "getUserProfile",
        "user",
        req.session.userId,
        req.session.userId,
        error
      );
    }
  }

  // make sure to do some input validation on the input class file
  // changes user's password when they are already logged in
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  @UseMiddleware(versionChecker)
  @UseMiddleware(rateLimit(25, 60 * 60)) // max 25 requests every hour
  async changePasswordLoggedIn(
    @Arg("changePasswordLoggedInInput")
    { current_password, new_password }: ChangePasswordLoggedInInputType,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    try {
      const userRepository = AppDataSource.getRepository(UserAccount);
      const user = await userRepository.findOneBy({
        user_id: req.session.userId,
      });
      if (user === null) {
        entityNullError(
          "changePasswordLoggedIn",
          "user",
          req.session.userId,
          req.session.userId
        );
      }
      const match = await bcrypt.compare(current_password, user.user_password);
      // expected error if user enters wrong current password
      if (!match) {
        throw new GraphQLError("Current password is incorrect.", {
          extensions: {
            code: "INCORRECT_PASSWORD",
          },
        });
      }

      const hashedPassword = await bcrypt.hash(new_password, 10);
      user.user_password = hashedPassword;

      try {
        await userRepository.save(user);
      } catch (error) {
        saveEntityError(
          "changePasswordLoggedIn",
          "user",
          req.session.userId,
          user,
          error
        );
      }
      // const keys = await redis.scan(0, 'MATCH', '*')

      return true;
    } catch (error) {
      findEntityError(
        "changePasswordLoggedIn ",
        "user",
        req.session.userId,
        req.session.userId,
        error
      );
    }
  }

  // changes the user's email when they are logged in by sending confirmation email
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  @UseMiddleware(versionChecker)
  @UseMiddleware(rateLimit(10, 60 * 60 * 24)) // max 10 emails per day
  async changeEmail(
    @Arg("changeEmailInput") { user_email }: ChangeEmailInputType,
    @Ctx() { req, redis }: MyContext
  ): Promise<Boolean> {
    try {
      const userRepository = AppDataSource.getRepository(UserAccount);
      const user = await userRepository.findOneBy({
        user_id: req.session.userId,
      });
      if (user === null) {
        entityNullError(
          "changeEmail",
          "user",
          req.session.userId,
          req.session.userId
        );
      }
      const userEmailExists = await userRepository.findOneBy({
        user_email: user_email,
      });
      if (userEmailExists) {
        throw new GraphQLError("Error. Email is already in use.", {
          extensions: { code: "EMAIL_EXISTS" },
        });
      }
      const token = uuidv4();

      try {
        await redis.set(
          token,
          JSON.stringify({
            user_id: user.user_id,
            user_new_email: user_email,
          }),
          "EX",
          1000 * 60 * 60 * 24 * 3
        ); // 3 days

        const changeEmailUrl = `${process.env.DEVELOPMENT_URL}/confirm-new-email?token=${token}`;

        try {
          await sendChangeEmailAddressEmail(
            user.user_username,
            user_email,
            changeEmailUrl
          );
        } catch (error) {
          sendEmailError(
            "changeEmail",
            "change email address email",
            user_email,
            error,
            req.session.userId
          );
        }
      } catch (error) {
        redisError("changeEmail", "SET", error, req.session.userId);
      }

      return true;
    } catch (error) {
      findEntityError(
        "changeEmail",
        "user",
        req.session.userId,
        req.session.userId,
        error
      );
    }
  }

  // confirms the email change request and updates the database when user clicks on link with active token
  @Mutation(() => Boolean)
  @UseMiddleware(rateLimit(20, 60 * 5)) // max 20 requests per 5 minutes
  async confirmChangeEmail(
    @Arg("confirmChangeEmailInput") { token }: ConfirmChangeEmailInputType,
    @Ctx() { redis }: MyContext
  ): Promise<Boolean> {
    try {
      const userObj = await redis.get(token);
      // expected error if user took too long to click on email and token expired
      if (userObj === null) {
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
      if (user === null) {
        entityNullError(
          "confirmChangeEmail",
          "user",
          userInfo.user_id,
          userInfo.user_id
        );
      }

      user.user_email = userInfo.user_new_email;

      try {
        // these 2 executions don't depend on one another so will batch them.
        await Promise.all([userRepository.save(user), redis.del(token)]);
      } catch (error) {
        saveEntityError(
          "confirmChangeEmail",
          "user or redis del in promise.all",
          userInfo.user_id,
          user,
          error
        );
      }

      return true;
    } catch (error) {
      redisError("confirmChangeEmail", "GET", error);
    }
  }

  // confirms the email verification request and updates the database when user clicks on link with active token
  @Mutation(() => Boolean)
  @UseMiddleware(rateLimit(20, 60 * 5)) // max 20 requests per 5 minutes
  async confirmEmailAddress(
    @Arg("confirmEmailAddressInput") { token }: ConfirmEmailAddressInputType,
    @Ctx() { req, redis }: MyContext
  ): Promise<Boolean> {
    try {
      const userObj = await redis.get(token);
      // expected error if user took too long to click on email and token expired
      if (userObj === null) {
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
      if (user === null) {
        entityNullError(
          "confirmEmailAddress",
          "user",
          userInfo.user_id,
          userInfo.user_id
        );
      }

      user.user_is_verified = true;

      try {
        // these 2 executions don't depend on one another so will batch them.
        await Promise.all([userRepository.save(user), redis.del(token)]);
      } catch (error) {
        saveEntityError(
          "confirmEmailAddress",
          "user or redis del in promise.all",
          userInfo.user_id,
          user,
          error
        );
      }

      // if they are still logged in AS SAME USER AS TOKEN, we set them as verified in session
      if (req.session.userId === user.user_id) req.session.verified = true;
      // else they can just log back in normally and get the verified status in session there.

      return true;
    } catch (error) {
      redisError("confirmEmailAddress", "GET", error);
    }
  }

  // resends the email confirmation email provided they are logged in
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  @UseMiddleware(versionChecker)
  @UseMiddleware(rateLimit(1, 60 * 5)) // max 1 email every 5 minutes
  async resendVerificationEmail(
    @Ctx() { req, redis }: MyContext
  ): Promise<Boolean> {
    try {
      const userRepository = AppDataSource.getRepository(UserAccount);
      const user = await userRepository.findOneBy({
        user_id: req.session.userId,
      });
      if (user === null) {
        entityNullError(
          "resendVerificationEmail",
          "user",
          req.session.userId,
          req.session.userId
        );
      }
      // expected error if user already clicked on link in email and for some reason decideid to click resend email.
      if (user.user_is_verified) {
        throw new GraphQLError("User is already verified.", {
          extensions: { code: "ALREADY_VERIFIED" },
        });
      }
      const token = uuidv4();

      try {
        await redis.set(
          token,
          JSON.stringify({
            user_id: user.user_id,
          }),
          "EX",
          1000 * 60 * 60 * 24 * 3
        ); // 3 days

        const changeEmailUrl = `${process.env.DEVELOPMENT_URL}/email-verified?token=${token}`;

        try {
          await sendEmailVerificationEmail(
            user.user_username,
            user.user_email,
            changeEmailUrl
          );
        } catch (error) {
          sendEmailError(
            "registerUser",
            "email verification email",
            user.user_email,
            error,
            req.session.userId
          );
        }
      } catch (error) {
        redisError("registerUser", "SET", error, -1);
      }

      return true;
    } catch (error) {
      findEntityError(
        "changeEmail",
        "user",
        req.session.userId,
        req.session.userId,
        error
      );
    }
  }

  // updates if user is interested
  @Mutation(() => Boolean)
  @UseMiddleware(versionChecker)
  @UseMiddleware(rateLimit(50, 60 * 5)) // max 50 requests per 5 minutes
  async updateUserIsInterested(
    @Arg("updateUserIsInterestedInput")
    { user_is_interested }: UpdateUserIsInterestedInputType,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    try {
      const userRepository = AppDataSource.getRepository(UserAccount);
      const user = await userRepository.findOneBy({
        user_id: req.session.userId,
      });
      if (user === null) {
        entityNullError(
          "updateUserInterested",
          "user",
          req.session.userId,
          req.session.userId
        );
      }
      console.log("im in userinter", user_is_interested)

      user.user_is_interested = user_is_interested;
      await AppDataSource.manager.save(user);
      return true;
    } catch (error) {
      findEntityError(
        "updateUserInterested",
        "user",
        req.session.userId,
        req.session.userId,
        error
      );
    }
  }
}
