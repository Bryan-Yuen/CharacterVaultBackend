// entities
import UserAccount from "../entities/UserAccount";
import UserTag from "../entities/UserTag";
import PornstarTag from "../entities/PornstarTag";
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
import { GraphQLError } from "graphql";
// config
import AppDataSource from "../config/db";
// input types
import AddUserTagInputType from "../inputTypes/AddUserTagInputType";
import DeleteUserTagInputType from "../inputTypes/DeleteUserTaginputType";
import EditUserTagInputType from "../inputTypes/EditUserTagInputType";
// middleware
import isAuth from "../middleware/isAuth";
import rateLimit from "../middleware/rateLimit";
// errors
import entityNullError from "../errors/entityNullError";
import findEntityError from "../errors/findEntityError";
import saveEntityError from "../errors/saveEntityError";
import unauthorizedEntityError from "../errors/unauthorizedEntityError";
import transactionFailedError from "../errors/transactionFailedError";

@Resolver(UserTag)
export class UserTagResolver {
  // adds new user tag for account
  // if we implement caching we need to return the id too.
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5)) // max 50 requests per 5 minutes
  async addUserTag(
    @Arg("newUserTag") { user_tag_text }: AddUserTagInputType,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    try {
      const userRepository = AppDataSource.getRepository(UserAccount);
      const user = await userRepository.findOne({
        where: {
          user_id: req.session.userId,
        },
        relations: ["userTags"],
      });
      if (!user)
        entityNullError(
          "addUserTag",
          "user",
          req.session.userId,
          req.session.userId
        );
      if (!user.userTags)
        entityNullError(
          "addUserTag",
          "userTags",
          req.session.userId,
          req.session.userId
        );

      const userTagExists = user.userTags.some(
        (tag) => tag.user_tag_text === user_tag_text
      );

      // expected error for tag already in account
      if (userTagExists) {
        throw new GraphQLError("Tag already exists for this user.", {
          extensions: {
            code: "TAG_ALREADY_EXISTS",
          },
        });
      }

      const userTag = new UserTag();

      userTag.user_tag_text = user_tag_text;
      userTag.user = user;

      const userTagRepository = AppDataSource.getRepository(UserTag);

      try {
        await userTagRepository.save(userTag);
      } catch (error) {
        saveEntityError(
          "addUserTag",
          "userTag",
          req.session.userId,
          userTag,
          error
        );
      }

      return true;
    } catch (error) {
      findEntityError(
        "addUserTag",
        "user",
        req.session.userId,
        req.session.userId,
        error
      );
    }
  }

  // edits user tag for account, will also change for all pornstars tags using this user tag
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5)) // max 50 requests per 5 minutes
  async editUserTag(
    @Arg("editUserTagInput")
    { user_tag_id, user_tag_text }: EditUserTagInputType,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    try {
      const userTagRepository = AppDataSource.getRepository(UserTag);
      const userTag = await userTagRepository.findOne({
        where: { user_tag_id: user_tag_id },
        relations: ["user", "user.userTags"],
      });
      // expected error if user deleted something and had another web page opened, but should be rare
      if (!userTag) {
        entityNullError(
          "editUserTag",
          "userTag",
          req.session.userId,
          user_tag_id
        );
      }
      if (!userTag.user) {
        entityNullError(
          "editUserTag",
          "user",
          req.session.userId,
          req.session.userId
        );
      }
      if (!userTag.user.userTags) {
        entityNullError(
          "editUserTag",
          "userTags",
          req.session.userId,
          req.session.userId
        );
      }
      if (userTag.user.user_id !== req.session.userId) {
        unauthorizedEntityError(
          "editUserTag",
          "userTag",
          req.session.userId,
          userTag.user.user_id,
          user_tag_id
        );
      }
      const userTagExists = userTag.user.userTags.some(
        (tag) => tag.user_tag_text === user_tag_text
      );

      // expected error for tag already in account
      if (userTagExists) {
        throw new GraphQLError("Tag already exists for this user.", {
          extensions: {
            code: "TAG_ALREADY_EXISTS",
          },
        });
      }

      userTag.user_tag_text = user_tag_text;

      try {
        await AppDataSource.transaction(async (transactionManager) => {
          await Promise.all([
            transactionManager.save(userTag),
            transactionManager
              .createQueryBuilder()
              .update(PornstarTag)
              .set({
                tag_text: user_tag_text,
              })
              .where("user_tag_id = :user_tag_id", {
                user_tag_id: user_tag_id,
              })
              .execute(),
          ]);
        });
      } catch (error) {
        // Handle errors and roll back if needed
        transactionFailedError(
          "editUserTag",
          "userTag",
          req.session.userId,
          user_tag_id,
          error
        );
      }

      return true;
    } catch (error) {
      findEntityError(
        "editUserTag",
        "userTag",
        req.session.userId,
        user_tag_id,
        error
      );
    }
  }

  // deletes user tag for account, will also delete in all pornstar tags using this tag
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5)) // max 50 requests per 5 minutes
  async deleteUserTag(
    @Arg("userTagId") { user_tag_id }: DeleteUserTagInputType,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    try {
      const userTagRepository = AppDataSource.getRepository(UserTag);
      const userTag = await userTagRepository.findOne({
        where: { user_tag_id: user_tag_id },
        relations: ["user"],
      });

      // expected error if user deleted something and had another web page opened, but should be rare
      if (!userTag) {
        entityNullError(
          "deleteUserTag",
          "userTag",
          req.session.userId,
          user_tag_id
        );
      }
      if (userTag.user.user_id !== req.session.userId) {
        unauthorizedEntityError(
          "deleteUserTag",
          "userTag",
          req.session.userId,
          userTag.user.user_id,
          user_tag_id
        );
      }

      try {
        await AppDataSource.transaction(async (transactionManager) => {
          await transactionManager
            .createQueryBuilder()
            .delete()
            .from(PornstarTag)
            .where("user_tag_id = :user_tag_id", { user_tag_id: user_tag_id })
            .execute();

          await transactionManager.remove(userTag);
        });
      } catch (error) {
        // Handle errors and roll back if needed
        transactionFailedError(
          "deleteUserTag",
          "userTag",
          req.session.userId,
          user_tag_id,
          error
        );
      }

      return true;
    } catch (error) {
      findEntityError(
        "deleteUserTag",
        "user",
        req.session.userId,
        user_tag_id,
        error
      );
    }
  }

  // returns all usertags for an account
  @Query(() => [UserTag])
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5)) // max 50 requests per 5 minutes
  async getUserTags(@Ctx() { req }: MyContext): Promise<UserTag[]> {
    try {
      const userRepository = AppDataSource.getRepository(UserAccount);

      const user = await userRepository.findOne({
        where: {
          user_id: req.session.userId,
        },
        relations: ["userTags"],
      });
      if (!user)
        entityNullError(
          "getUserTags",
          "user",
          req.session.userId,
          req.session.userId
        );
      if (!user.userTags)
        entityNullError(
          "getUserTags",
          "userTags",
          req.session.userId,
          req.session.userId
        );

      return user.userTags;
    } catch (error) {
      findEntityError(
        "getUserTags",
        "user",
        req.session.userId,
        req.session.userId,
        error
      );
    }
  }
}
