import { UserAccount } from "../entities/UserAccount";
import { Resolver, Mutation, Arg, Ctx,UseMiddleware, } from "type-graphql";
import AppDataSource from "../config/db";
import { MyContext } from "../index";
import { GraphQLError } from "graphql"
import { isAuth } from "../middleware/isAuth";
import {rateLimit} from "../middleware/rateLimit"
import { sendLoggedInContactEmail } from "../config/mailJet";
import { sendHomePageContactEmail } from "../emails/contactFormEmail";

@Resolver(UserAccount)
export class ContactResolver {

    // in the input class they must have email or else throw error
    // messsage too
    // contact form for when users on homepage, not logged in
  @Mutation(() => Boolean)
  // only 3 emails per user per day
  @UseMiddleware(rateLimit(3, 60 * 60 * 24))
  async contactForm(
    @Arg("email") email: string,
    @Arg("message") message: string
  ): Promise<Boolean> {
    try {
      await sendHomePageContactEmail(email, message)
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  // contact form for when user is logged in
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  // 5 emails per hour for logged in users
  @UseMiddleware(rateLimit(5, 60 * 60))
  async supportForm(
    @Arg("subject") subject: string,
    @Arg("message") message: string,@Ctx() { req }: MyContext
  ): Promise<Boolean> {
    try {
      const userRepository = AppDataSource.getRepository(UserAccount);
      const user = await userRepository.findOneBy({
        user_id: req.session.userId,
      });
      if (!user) {
        throw new GraphQLError("User not found.", {
          extensions: {
            code: "EMAIL_NOT_REGISTERED",
          },
        });
      }

       sendLoggedInContactEmail(user.user_email, subject, message)

      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }
}
