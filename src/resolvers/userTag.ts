import { UserAccount } from "../entities/UserAccount";
import { UserTag } from "../entities/UserTag";
import { PornstarTag } from "../entities/PornstarTag";
import { Resolver, Mutation, Arg, Ctx, Query,UseMiddleware } from "type-graphql";
import AppDataSource from "../config/db";
import { MyContext } from "../index";
import { GraphQLError } from "graphql";
import UserTagInput from "../inputClasses/UserTagInput";
import DeleteUserTagInput from "../inputClasses/DeleteUserTaginput";
import EditUserTagInput from "../inputClasses/EditUserTagInput";
import { isAuth } from "../middleware/isAuth";
import {rateLimit} from "../middleware/rateLimit"
//test
//import { UserTagWithPornstarTagTest } from "../returnTypes/UserTagWithPornstarTagTest";

@Resolver(UserTag)
export class UserTagResolver {
  @Mutation(() => UserTag)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5))
  async addUserTag(
    @Arg("newUserTag") { user_tag_text }: UserTagInput,
    @Ctx() { req }: MyContext
  ): Promise<UserTag> {
    try {
      // user's can only add to their account by linking the tag with session user id
      const userRepository = AppDataSource.getRepository(UserAccount);
      const user = await userRepository.findOneBy({
        user_id: req.session.userId,
      });
      if (!user) {
        throw new GraphQLError("User not found.", {
          extensions: {
            code: "USER_NOT_FOUND",
          },
        });
      }
      const userTagRepository = AppDataSource.getRepository(UserTag);

      const userTag = new UserTag();

      userTag.user_tag_text = user_tag_text;
      userTag.user = user;

      await userTagRepository.save(userTag);

      return userTag;
    } catch (err) {
      console.log(err);
      return err;
    }
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5))
  async editUserTag(
    @Arg("editUserTagInput") editUserTagInput: EditUserTagInput,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    try {
      const userTagRepository = AppDataSource.getRepository(UserTag);
      const userTag = await userTagRepository.findOne({
        where: { user_tag_id: editUserTagInput.user_tag_id },
        relations: ["user"],
      });
      if (!userTag) {
        throw new GraphQLError("UserTag is not found.", {
          extensions: {
            code: "USERTag_NOT_FOUND",
          },
        });
      }
      if (userTag.user.user_id !== req.session.userId) {
        throw new GraphQLError("UserTag is not found.", {
          extensions: {
            code: "USERTag_NOT_FOUND",
          },
        });
      }

      userTag.user_tag_text = editUserTagInput.user_tag_text;
      await userTagRepository.save(userTag);

      await AppDataSource.createQueryBuilder()
        .update(PornstarTag)
        .set({
          tag_text: editUserTagInput.user_tag_text,
        })
        .where("user_tag_id = :user_tag_id", {
          user_tag_id: editUserTagInput.user_tag_id,
        })
        .execute();

      return true;
    } catch (err) {
      console.log(err);
      return err;
    }
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5))
  async deleteUserTag(
    @Arg("userTagId") { user_tag_id }: DeleteUserTagInput,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    try {
      // saw ben awad's just check if its has that && req.session.userId
      const userTagRepository = AppDataSource.getRepository(UserTag);
      const userTag = await userTagRepository.findOne({
        where: { user_tag_id: user_tag_id },
        relations: ["user"],
      });

      if (!userTag) {
        throw new GraphQLError("UserTag is not found.", {
          extensions: {
            code: "USERTag_NOT_FOUND",
          },
        });
      }
      if (userTag.user.user_id !== req.session.userId) {
        throw new GraphQLError("UserTag is not found.", {
          extensions: {
            code: "USERTag_NOT_FOUND",
          },
        });
      }

      await AppDataSource.createQueryBuilder()
        .delete()
        .from(PornstarTag)
        .where("user_tag_id = :user_tag_id", { user_tag_id: user_tag_id })
        .execute();

      await userTagRepository.remove(userTag);

      return true;
    } catch (err) {
      console.log(err);
      return err;
    }
  }


  @Query(() => [UserTag])
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5))
  async getUserTags(@Ctx() { req }: MyContext): Promise<UserTag[]> {
    const userRepository = AppDataSource.getRepository(UserAccount);

    const user = await userRepository.findOne({
      where: { user_id: req.session.userId },
      relations: ["userTags"],
    });
    if (!user) {
      throw new GraphQLError("User not found.", {
        extensions: {
          code: "USER_NOT_FOUND",
        },
      });
    }
    return user.userTags;
  }


  /*
  @Query(() => [UserTagWithPornstarTagTest])
  async getUserTags(@Ctx() { req }: MyContext): Promise<UserTagWithPornstarTagTest[]> {
    console.log(!req)
    const userRepository = AppDataSource.getRepository(UserAccount);

    const user = await userRepository.findOne({
      where: { user_id: 58 },
      //where: { user_id: req.session.userId },
      relations: ["userTags", "userTags.pornstar_tags"],
    });
    if (!user) {
      throw new GraphQLError("User not found.", {
        extensions: {
          code: "USER_NOT_FOUND",
        },
      });
    }
    console.log("what is usertag")
    console.log(user.userTags)
    return user.userTags;
  }
  */
}
