// entities
import UserAccount from "../entities/UserAccount";
import { MyContext } from "../index";
// dependencies
import { Resolver, Mutation, Arg, Ctx, UseMiddleware } from "type-graphql";
// middleware
import isAuth from "../middleware/isAuth";
import versionChecker from "../middleware/versionChecker";
import rateLimit from "../middleware/rateLimit";
// config
import AppDataSource from "../config/db";
// emails
import sendHomePageContactEmail from "../emails/contactFormEmail";
import sendSupportEmail from "../emails/supportFormEmail";
import sendFeedbackEmail from "../emails/feedbackFormEmail";
// input types
import ContactEmailInputType from "../inputTypes/ContactEmailInputType";
import SupportEmailInputType from "../inputTypes/SupportEmailInputType";
import FeedbackEmailInputType from "../inputTypes/FeedbackEmailInputType";
// errors
import entityNullError from "../errors/entityNullError";
import sendEmailError from "../errors/sendEmailError";
import findEntityError from "../errors/findEntityError";

@Resolver()
export class ContactResolver {
  // contact form for when users on homepage, not logged in
  @Mutation(() => Boolean)
  @UseMiddleware(versionChecker)
  @UseMiddleware(rateLimit(5, 60 * 60 * 24)) // max 5 emails per person/ip address per day
  async contactForm(
    @Arg("contactFormInput") { form_email, form_message }: ContactEmailInputType
  ): Promise<Boolean> {
    try {
      await sendHomePageContactEmail(form_email, form_message);
      return true;
    } catch (error) {
      sendEmailError(
        "contactForm",
        "contact email",
        "contact Form, no username",
        error,
        -1
      );
    }
  }

  // contact form for when user is logged in
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  @UseMiddleware(versionChecker)
  @UseMiddleware(rateLimit(5, 60 * 60)) // max 5 emails per hour
  async supportForm(
    @Arg("supportFormInput")
    { form_subject, form_message }: SupportEmailInputType,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    try {
      const userRepository = AppDataSource.getRepository(UserAccount);
      const user = await userRepository.findOneBy({
        user_id: req.session.userId,
      });
      if (user === null) {
        entityNullError(
          "supportForm",
          "user",
          req.session.userId,
          req.session.userId
        );
      }

      try {
        await sendSupportEmail(
          user.user_email,
          user.user_username,
          form_subject,
          form_message
        );
      } catch (error) {
        sendEmailError(
          "supportForm",
          "support email",
          user.user_username,
          error,
          req.session.userId
        );
      }

      return true;
    } catch (error) {
      findEntityError(
        "supportForm",
        "user",
        req.session.userId,
        req.session.userId,
        error
      );
    }
  }

  // feedback form for logged in users to send feedback
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  @UseMiddleware(versionChecker)
  @UseMiddleware(rateLimit(5, 60 * 60)) // max 5 emails per hour
  async feedbackForm(
    @Arg("feedbackFormInput")
    { form_subject, form_message }: FeedbackEmailInputType,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    try {
      const userRepository = AppDataSource.getRepository(UserAccount);
      const user = await userRepository.findOneBy({
        user_id: req.session.userId,
      });
      if (user === null) {
        entityNullError(
          "feedbackForm",
          "user",
          req.session.userId,
          req.session.userId
        );
      }

      try {
        await sendFeedbackEmail(
          user.user_email,
          user.user_username,
          form_subject,
          form_message
        );
      } catch (error) {
        sendEmailError(
          "feedbackForm",
          "feedback email",
          user.user_username,
          error,
          req.session.userId
        );
      }

      return true;
    } catch (error) {
      findEntityError(
        "feedbackForm",
        "user",
        req.session.userId,
        req.session.userId,
        error
      );
    }
  }
}
