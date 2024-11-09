import { UserAccount } from "../entities/UserAccount";
import { Resolver, Mutation, Arg, Ctx,UseMiddleware, } from "type-graphql";
import AppDataSource from "../config/db";
import { MyContext } from "../index";
import { GraphQLError } from "graphql"
import { isAuth } from "../middleware/isAuth";
//import {rateLimit} from "../middleware/rateLimit"
//import { sendLoggedInContactEmail } from "../config/mailJet";
import { sendHomePageContactEmail } from "../emails/contactFormEmail";
import { sendSupportEmail } from "../emails/supportFormEmail";
import ContactEmailInputType from "../inputTypes/ContactEmailInputType";
import SupportEmailInputType from "../inputTypes/SupportEmailInputType";

@Resolver(UserAccount)
export class ContactResolver {
    // contact form for when users on homepage, not logged in
  @Mutation(() => Boolean)
  // only 3 emails per person/ip address per day
  //@UseMiddleware(rateLimit(3, 60 * 60 * 24))
  async contactForm(
    @Arg("contactFormInput") {form_email, form_message}: ContactEmailInputType
  ): Promise<Boolean> {
    try {
      await sendHomePageContactEmail(form_email, form_message)
      return true;
    } catch (error) {
      console.error("Error sending contact message", error);
      throw new GraphQLError("Internal server error.", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    }
  }

  // contact form for when user is logged in
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  // 5 emails per hour for logged in users
  //@UseMiddleware(rateLimit(5, 60 * 60))
  async supportForm(
    @Arg("supportFormInput") {form_subject, form_message}: SupportEmailInputType,@Ctx() { req }: MyContext
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

      await sendSupportEmail(user.user_email, user.user_email, form_subject, form_message)

      return true;
    } catch (error) {
      console.error("Error sending support message", error);
      throw new GraphQLError("Internal server error.", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    }
  }
}
