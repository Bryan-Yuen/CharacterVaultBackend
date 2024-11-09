import { UserAccount } from "../entities/UserAccount";
import { UserTag } from "../entities/UserTag";
import { PornstarTag } from "../entities/PornstarTag";
import {
  Resolver,
  Mutation,
  Arg,
  Ctx,
  Query,
  UseMiddleware,
} from "type-graphql";
import AppDataSource from "../config/db";
import { MyContext } from "../index";
import { GraphQLError } from "graphql";
import AddUserTagInputType from "../inputTypes/AddUserTagInputType";
import DeleteUserTagInputType from "../inputTypes/DeleteUserTaginputType";
import EditUserTagInputType from "../inputTypes/EditUserTagInputType";
import { isAuth } from "../middleware/isAuth";
import { rateLimit } from "../middleware/rateLimit";

@Resolver(UserTag)
export class UserTagResolver {
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5))
  async addUserTag(
    @Arg("newUserTag") { user_tag_text }: AddUserTagInputType,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    const userRepository = AppDataSource.getRepository(UserAccount);
    let user: UserAccount | null = null;
    try {
      user = await userRepository.findOne({
        where: {
          user_id: req.session.userId,
          //user_id: 58,
        },
        //user_id: req.session.userId,
        relations: ["userTags"],
      });
    } catch (error) {
      console.error("Error fetching user", error);
      throw new GraphQLError("Internal server error.", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    }
    if (!user) {
      throw new GraphQLError("User not found.", {
        extensions: {
          code: "USER_NOT_FOUND",
        },
      });
    }

    const userTagExists = user.userTags.some(
      (tag) => tag.user_tag_text === user_tag_text
    );

    if (userTagExists) {
      throw new GraphQLError("Tag already exists for this user.", {
        extensions: {
          code: "TAG_ALREADY_EXISTS",
        },
      });
    }
    console.log("userTags", user.userTags);

    const userTag = new UserTag();

    userTag.user_tag_text = user_tag_text;
    userTag.user = user;

    const userTagRepository = AppDataSource.getRepository(UserTag);

    try {
      await userTagRepository.save(userTag);
    } catch (error) {
      console.error("Error saving userTag", error);
      throw new GraphQLError("Internal server error.", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    }

    // return usertag if you want to use cache
    return true;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5))
  async editUserTag(
    @Arg("editUserTagInput")
    { user_tag_id, user_tag_text }: EditUserTagInputType,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    const userTagRepository = AppDataSource.getRepository(UserTag);
    let userTag: UserTag | null = null;
    try {
      userTag = await userTagRepository.findOne({
        where: { user_tag_id: user_tag_id },
        relations: ["user", "user.userTags"],
      });
    } catch (error) {
      console.error("Error fetching user tag:", error);
      throw new GraphQLError("Internal server error.", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    }
    console.log("what is usertag", userTag);
    if (!userTag) {
      throw new GraphQLError("UserTag is not found.", {
        extensions: {
          code: "USERTag_NOT_FOUND",
        },
      });
    }
    if (userTag.user.user_id !== req.session.userId) {
      throw new GraphQLError("Unauthorized user tag's user id.", {
        extensions: {
          code: "UNAUTHORIZED_USERTAG_ACCESS",
        },
      });
    }
    const userTagExists = userTag.user.userTags.some(
      (tag) => tag.user_tag_text === user_tag_text
    );

    if (userTagExists) {
      throw new GraphQLError("Tag already exists for this user.", {
        extensions: {
          code: "TAG_ALREADY_EXISTS",
        },
      });
    }

    console.log("work?", userTag.user.userTags);

    userTag.user_tag_text = user_tag_text;
    // maybe do this in transaction
    try {
      return await AppDataSource.transaction(async (transactionManager) => {
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

        return true;
      });
    } catch (error) {
      // Handle errors and roll back if needed
      console.error("Transaction failed:", error);
      throw new GraphQLError("Failed to edit usertag.", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    }
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5))
  async deleteUserTag(
    @Arg("userTagId") { user_tag_id }: DeleteUserTagInputType,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    // saw ben awad's just check if its has that && req.session.userId
    const userTagRepository = AppDataSource.getRepository(UserTag);
    let userTag: UserTag | null = null;
    try {
      userTag = await userTagRepository.findOne({
        where: { user_tag_id: user_tag_id },
        relations: ["user"],
      });
    } catch (error) {
      console.error("Error fetching user tag:", error);
      throw new GraphQLError("Internal server error.", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    }

    if (!userTag) {
      throw new GraphQLError("UserTag is not found.", {
        extensions: {
          code: "USERTag_NOT_FOUND",
        },
      });
    }
    if (userTag.user.user_id !== req.session.userId) {
      throw new GraphQLError("Unauthorized user tag's user id.", {
        extensions: {
          code: "UNAUTHORIZED_USERTAG_ACCESS",
        },
      });
    }

    try {
      return await AppDataSource.transaction(async (transactionManager) => {
        await transactionManager
          .createQueryBuilder()
          .delete()
          .from(PornstarTag)
          .where("user_tag_id = :user_tag_id", { user_tag_id: user_tag_id })
          .execute();

        await transactionManager.remove(userTag);

        return true;
      });
    } catch (error) {
      // Handle errors and roll back if needed
      console.error("Transaction failed:", error);
      throw new GraphQLError("Failed to delete usertag.", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    }
  }

  @Query(() => [UserTag])
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5))
  async getUserTags(@Ctx() { req }: MyContext): Promise<UserTag[]> {
    const userRepository = AppDataSource.getRepository(UserAccount);

    let user: UserAccount | null = null;
    try {
      user = await userRepository.findOne({
        where: {
          user_id: req.session.userId,
          //user_id: 58,
        },
        //user_id: req.session.userId,
        relations: ["userTags"],
      });
    } catch (error) {
      console.error("Error fetching user", error);
      throw new GraphQLError("Internal server error.", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    }
    if (!user) {
      throw new GraphQLError("User not found.", {
        extensions: {
          code: "USER_NOT_FOUND",
        },
      });
    }
    return user.userTags;
  }
}
