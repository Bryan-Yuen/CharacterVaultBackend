// entities
import UserAccount from "../entities/UserAccount";
import UserTag from "../entities/UserTag";
import ActorTag from "../entities/ActorTag";
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
// return types
import AddUserTagReturn from "../returnTypes/AddUserTagReturn";
import EditUserTagReturn from "../returnTypes/EditUserTagReturn";
import UserTagsWithActorTagsReturn from "../returnTypes/UserTagsWithActorTagsReturn";
// middleware
import isAuth from "../middleware/isAuth";
import rateLimit from "../middleware/rateLimit";
import versionChecker from "../middleware/versionChecker";
// errors
import entityNullError from "../errors/entityNullError";
import findEntityError from "../errors/findEntityError";
import saveEntityError from "../errors/saveEntityError";
import transactionFailedError from "../errors/transactionFailedError";

@Resolver(UserTag)
export class UserTagResolver {
  // adds new user tag for account
  @Mutation(() => AddUserTagReturn)
  @UseMiddleware(isAuth)
  @UseMiddleware(versionChecker)
  @UseMiddleware(rateLimit(50, 60 * 5)) // max 50 requests per 5 minutes
  async addUserTag(
    @Arg("newUserTag") { user_tag_text }: AddUserTagInputType,
    @Ctx() { req }: MyContext
  ): Promise<AddUserTagReturn> {
    try {
      const userRepository = AppDataSource.getRepository(UserAccount);
      const user = await userRepository.findOne({
        where: {
          user_id: req.session.userId,
        },
        relations: ["userTags"],
      });
      if (user === null)
        entityNullError(
          "addUserTag",
          "user",
          req.session.userId,
          req.session.userId
        );
      if (user.userTags === null)
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
        const saveUsertag = await userTagRepository.save(userTag);
        return {
          user_tag_id : saveUsertag.user_tag_id
        }
      } catch (error) {
        saveEntityError(
          "addUserTag",
          "userTag",
          req.session.userId,
          userTag,
          error
        );
      }
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

  // edits user tag for account, will also change for all actors tags using this user tag
  @Mutation(() => EditUserTagReturn)
  @UseMiddleware(isAuth)
  @UseMiddleware(versionChecker)
  @UseMiddleware(rateLimit(50, 60 * 5)) // max 50 requests per 5 minutes
  async editUserTag(
    @Arg("editUserTagInput")
    { user_tag_id, user_tag_text }: EditUserTagInputType,
    @Ctx() { req }: MyContext
  ): Promise<EditUserTagReturn> {
    try {
      const userTagRepository = AppDataSource.getRepository(UserTag);
      const userTag = await userTagRepository.findOne({
        where: {
          user_tag_id: user_tag_id,
          user: {
            user_id: req.session.userId,
          },
        },
        relations: ["user.userTags"],
      });
      // expected error if user deleted something and had another web page opened, but should be rare
      if (userTag === null) {
        entityNullError(
          "editUserTag",
          "userTag",
          req.session.userId,
          user_tag_id
        );
      }
      // if the user put the same as current, just return and save resources.
      if (userTag.user_tag_text === user_tag_text) {
        return {
          user_tag_id: userTag.user_tag_id,
        };
      }
      if (userTag.user.userTags === null) {
        entityNullError(
          "editUserTag",
          "userTags",
          req.session.userId,
          req.session.userId
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
        return await AppDataSource.transaction(async (transactionManager) => {
          const saveUserTag = await transactionManager.save(userTag);

          // Update actorTag
          await transactionManager
            .createQueryBuilder()
            .update(ActorTag)
            .set({
              actor_tag_text: user_tag_text,
            })
            .where("user_tag_id = :user_tag_id", {
              user_tag_id: user_tag_id,
            })
            .execute();
      
          // Return the user_tag_id from saveUserTag
          return {
            user_tag_id: saveUserTag.user_tag_id,
          };
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

  // deletes user tag for account, will also delete in all actor tags using this tag
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  @UseMiddleware(versionChecker)
  @UseMiddleware(rateLimit(50, 60 * 5)) // max 50 requests per 5 minutes
  async deleteUserTag(
    @Arg("userTagId") { user_tag_id }: DeleteUserTagInputType,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    try {
      const userTagRepository = AppDataSource.getRepository(UserTag);
      const userTag = await userTagRepository.findOne({
        where: {
          user_tag_id: user_tag_id,
          user: {
            user_id: req.session.userId,
          },
        },
      });

      // expected error if user deleted something and had another web page opened, but should be rare
      if (userTag === null) {
        entityNullError(
          "deleteUserTag",
          "userTag",
          req.session.userId,
          user_tag_id
        );
      }

      try {
        await AppDataSource.transaction(async (transactionManager) => {
          await transactionManager
            .createQueryBuilder()
            .delete()
            .from(ActorTag)
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
  @Query(() => [UserTagsWithActorTagsReturn])
  @UseMiddleware(isAuth)
  @UseMiddleware(versionChecker)
  @UseMiddleware(rateLimit(50, 60 * 5)) // max 50 requests per 5 minutes
  async getUserTags(@Ctx() { req }: MyContext): Promise<UserTagsWithActorTagsReturn[]> {
    try {
      const userRepository = AppDataSource.getRepository(UserAccount);

      const user = await userRepository.findOne({
        where: {
          user_id: req.session.userId,
        },
        relations: ["userTags","userTags.actor_tags"],
      });
      if (user === null)
        entityNullError(
          "getUserTags",
          "user",
          req.session.userId,
          req.session.userId
        );
      if (user.userTags === null)
        entityNullError(
          "getUserTags",
          "userTags",
          req.session.userId,
          req.session.userId
        );
        console.log(user.userTags)
        /*
        for (var i = 0; i < user.userTags.length; i++)
        {
          console.log(user.userTags[i].actor_tags)
        }
          */
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
