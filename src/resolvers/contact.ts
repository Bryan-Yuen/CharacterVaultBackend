// entities
import UserAccount from "../entities/UserAccount";
import { MyContext } from "../index";
// dependencies
import { Resolver, Mutation, Arg, Ctx, UseMiddleware } from "type-graphql";
import { GraphQLError } from "graphql";
// middleware
import isAuth from "../middleware/isAuth";
import rateLimit from "../middleware/rateLimit";
// config
import AppDataSource from "../config/db";
import logger from "../config/logger";
// emails
import sendHomePageContactEmail  from "../emails/contactFormEmail";
import sendSupportEmail from "../emails/supportFormEmail";
// input types
import ContactEmailInputType from "../inputTypes/ContactEmailInputType";
import SupportEmailInputType from "../inputTypes/SupportEmailInputType";

@Resolver()
export class ContactResolver {
  // contact form for when users on homepage, not logged in
  @Mutation(() => Boolean)
  @UseMiddleware(rateLimit(5, 60 * 60 * 24)) // max 5 emails per person/ip address per day
  async contactForm(
    @Arg("contactFormInput") { form_email, form_message }: ContactEmailInputType
  ): Promise<Boolean> {
    try {
      await sendHomePageContactEmail(form_email, form_message);
      return true;
    } catch (error) {
      logger.error("Error sending contact email", {
        resolver: "contactForm",
        form_email,
        form_message,
        error,
      });
      throw new GraphQLError("Internal server error.", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    }
  }

  // contact form for when user is logged in
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(5, 60 * 60)) // max 5 emails per hour
  async supportForm(
    @Arg("supportFormInput")
    { form_subject, form_message }: SupportEmailInputType,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    const userRepository = AppDataSource.getRepository(UserAccount);
    let user: UserAccount | null = null;
    try {
      user = await userRepository.findOneBy({
        user_id: req.session.userId,
      });
    } catch (error) {
      logger.error(`Error fetching user`, {
        resolver: "supportForm",
        user_id: req.session.userId,
        error,
      });
      throw new GraphQLError("Internal server error.", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    }
    if (!user) {
      logger.error(`user is null`, {
        resolver: "supportForm",
        user_id: req.session.userId,
      });
      throw new GraphQLError("User not found.", {
        extensions: {
          code: "EMAIL_NOT_REGISTERED",
        },
      });
    }

    try {
      await sendSupportEmail(
        user.user_email,
        user.user_email,
        form_subject,
        form_message
      );
    } catch (error) {
      logger.error("Error sending contact email", {
        resolver: "contactForm",
        user_id: req.session.userId,
        form_subject,
        form_message,
        error,
      });
      throw new GraphQLError("Internal server error.", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    }

    return true;
  }
}
