import { UserAccount } from "../entities/UserAccount";
import { Pornstar } from "../entities/Pornstar";
import { PornstarTag } from "../entities/PornstarTag";
import {
  Resolver,
  Mutation,
  Arg,
  Query,
  Ctx,
  UseMiddleware,
} from "type-graphql";
import AppDataSource from "../config/db";
import NewPornstarInput from "../inputClasses/NewPornstarInput";
//import PornstarTagInput from '../inputClasses/PornstarTagInput';
import { MyContext } from "../index";
import { GraphQLError } from "graphql";
import { EditPornstarInput } from "../inputClasses/EditPornstarInput";
import DeletePornstarInput from "../inputClasses/DeletePornstarInput";
import { GetPornstarInput } from "../inputClasses/GetPornstarInput";
import { PornstarLink } from "../entities/PornstarLink";
import PornstarLinkInput from "../inputClasses/PornstarLinkInput";
import { PornstarWithTagsAndLinks } from "../returnTypes/PornstarWithTagsAndLinks";
import { PornstarWithTags } from "../returnTypes/PornstarWithTags";
import { AddPornstarReturn } from "../returnTypes/AddPornstarReturn";
import { UserTag } from "../entities/UserTag";
import { EditPornstarReturn } from "../returnTypes/EditPornstarReturn";
import { isAuth } from "../middleware/isAuth";
import {
  createPresignedUrlWithClient,
  deleteObjectWithClient,
} from "../config/s3";
import { v4 as uuidv4 } from "uuid";
import { rateLimit } from "../middleware/rateLimit";

type pornstarTag = {
  pornstar: Pornstar;
  tag_text: string;
  user_tag: UserTag;
};

@Resolver(Pornstar)
export class PornstarResolver {
  @Mutation(() => AddPornstarReturn)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5))
  async addPornstar(
    @Arg("newPornstarInput") newPornstarInput: NewPornstarInput,
    @Ctx() { req }: MyContext
  ): Promise<AddPornstarReturn> {
    console.log("new pornrstar input", newPornstarInput);
    const userRepository = AppDataSource.getRepository(UserAccount);
    const user = await userRepository.findOne({
      where: {
        user_id: req.session.userId,
        //user_id: 58,
      },
      //user_id: req.session.userId,
      relations: ["pornstars"],
    });
    if (!user) {
      throw new GraphQLError("User is not found.", {
        extensions: {
          code: "USER_NOT_FOUND",
        },
      });
    }

    // safeguard incase user bypass add button block and add pornstar page
    if (user.pornstars.length >= 25) {
      throw new GraphQLError("Max limit of 25 pornstars reached.", {
        extensions: {
          code: "PORNSTAR_LIMIT_REACHED",
        },
      });
    }

    //const pornstarRepository = AppDataSource.getRepository(Pornstar);

    const pornstar = new Pornstar();

    pornstar.pornstar_name = newPornstarInput.pornstar_name;
    // generate new id with each call
    console.log("id");
    //const id = uuidv4();
    const id = `${uuidv4()}-${req.session.userId}-${Date.now()}`;
    console.log(id);
    var url = "";
    if (newPornstarInput.pornstar_picture) {
      try {
        url = await createPresignedUrlWithClient({ key: id });
      } catch (error) {
        console.error("Error creating presigned URL:", error);
        throw new GraphQLError("Failed to generate presigned URL.", {
          extensions: { code: "PRESIGNED_URL_ERROR" },
        });
      }
      pornstar.pornstar_picture_path =
        "https://pub-f8c29b76b6bc4836aac4b8dabb8b6b25.r2.dev/" + id;
    }

    pornstar.user = user;

    try {
      return await AppDataSource.transaction(async (transactionManager) => {
        const savePornstar = await transactionManager.save(pornstar);

        if (newPornstarInput.pornstar_links_title_url) {
          let rowArray: PornstarLinkInput[] = [];
          for (
            let i = 0;
            i < newPornstarInput.pornstar_links_title_url.length;
            i++
          ) {
            rowArray[i] = {
              pornstar: savePornstar,
              pornstar_link_title:
                newPornstarInput.pornstar_links_title_url[i]
                  .pornstar_link_title,
              pornstar_link_url:
                newPornstarInput.pornstar_links_title_url[i].pornstar_link_url,
            };
          }

          await transactionManager
            .createQueryBuilder()
            .insert()
            .into(PornstarLink)
            .values(rowArray)
            .execute();
        }

        // omg we actually need the pornstar id, the await finally came into play.
        if (newPornstarInput.pornstar_tags_obj) {
          let rowArray: pornstarTag[] = [];
          const userTagRepository = AppDataSource.getRepository(UserTag);

          for (let i = 0; i < newPornstarInput.pornstar_tags_obj.length; i++) {
            const userTag = await userTagRepository.findOne({
              where: {
                user_tag_id:
                  newPornstarInput.pornstar_tags_obj[i].user_tag.user_tag_id,
              },
              relations: ["user"],
            });
            if (!userTag) {
              throw new GraphQLError("User tag not found.", {
                extensions: {
                  code: "USER_TAG_NOT_FOUND",
                },
              });
            }
            // checks just to make sure user didn't add another user's usertag in their data
            if (userTag.user.user_id !== req.session.userId) {
              throw new GraphQLError("Unauthorized user tag's user id.", {
                extensions: {
                  code: "UNAUTHORIZED_USER_TAG_ACCESS",
                },
              });
            }

            rowArray[i] = {
              pornstar: savePornstar,
              tag_text: newPornstarInput.pornstar_tags_obj[i].tag_text,
              user_tag: userTag,
            };
          }

          await transactionManager
            .createQueryBuilder()
            .insert()
            .into(PornstarTag)
            .values(rowArray)
            .execute();
        }

        return {
          s3Url: url,
          pornstar_id: savePornstar.pornstar_id,
        };
      });
    } catch (error) {
      // Handle errors and roll back if needed
      console.error("Transaction failed:", error);
      throw new GraphQLError("Failed to add pornstar.", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    }
  }

  // need to return pornstar type with tags and links too
  @Query(() => PornstarWithTagsAndLinks)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5))
  async getPornstar(
    @Arg("getPornstarInput") getPornstarInput: GetPornstarInput
  ): Promise<PornstarWithTagsAndLinks> {
    const pornstarRepository = AppDataSource.getRepository(Pornstar);

    const pornstar = await pornstarRepository.findOne({
      where: {
        pornstar_id: getPornstarInput.pornstar_id,
      },
      //user_id: req.session.userId,
      relations: ["pornstar_tags", "pornstar_tags.user_tag", "pornstar_links"],
    });
    if (!pornstar) {
      throw new GraphQLError("Pornstar not found.", {
        extensions: {
          code: "PORNSTAR_NOT_FOUND",
        },
      });
    }

    return pornstar;
  }

  // return both in an object
  @Query(() => [PornstarWithTags])
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5))
  async getAllPornstarsAndTags(
    @Ctx() { req }: MyContext
  ): Promise<PornstarWithTags[]> {
    console.log("heybbb im in getall", req === null);
    console.log(req.session.userId);
    const userRepository = AppDataSource.getRepository(UserAccount);
    const user = await userRepository.findOne({
      where: {
        user_id: req.session.userId,
        //user_id: 58
      },
      //user_id: req.session.userId,
      relations: ["pornstars", "pornstars.pornstar_tags"],
    });
    if (!user) {
      throw new GraphQLError("User not found.", {
        extensions: {
          code: "USER_NOT_FOUND",
        },
      });
    }
    const restructuredPornstars: PornstarWithTags[] = user.pornstars.map(
      (pornstar) => ({
        pornstar_id: pornstar.pornstar_id,
        pornstar_name: pornstar.pornstar_name,
        pornstar_picture_path: pornstar.pornstar_picture_path,
        pornstar_tags_text: pornstar.pornstar_tags.map(
          (pornstar_tag) => pornstar_tag.tag_text
        ),
      })
    );
    console.log("im in getall pornstar and tags");
    return restructuredPornstars;
  }

  @Mutation(() => EditPornstarReturn)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5))
  async editPornstar(
    @Arg("editPornstarInput") editPornstarInput: EditPornstarInput,
    @Ctx() { req }: MyContext
  ): Promise<EditPornstarReturn> {
      const pornstarRepository = AppDataSource.getRepository(Pornstar);
      const pornstar = await pornstarRepository.findOne({
        where: {
          pornstar_id: editPornstarInput.pornstar_id,
          //user_id: 58,
        },
        //user_id: req.session.userId,
        relations: ["user"],
      });
      if (!pornstar) {
        throw new GraphQLError("Pornstar not found.", {
          extensions: {
            code: "PORNSTAR_NOT_FOUND",
          },
        });
      }
      if (pornstar.user.user_id !== req.session.userId) {
        throw new GraphQLError("Unauthorized pornstar's user id.", {
          extensions: {
            code: "UNAUTHORIZED_PORNSTAR_ACCESS",
          },
        });
      }
      pornstar.pornstar_name = editPornstarInput.pornstar_name;

      var url = "";

      // scenario if user presses delete and has current picture in database
      if (
        editPornstarInput.imageUpdate.didDelete &&
        !editPornstarInput.pornstar_picture &&
        pornstar.pornstar_picture_path
      ) {
        const parts = pornstar.pornstar_picture_path.split("/");
        const objectKey = parts[parts.length - 1];
        try {
          await deleteObjectWithClient({ key: objectKey });
        } catch (error) {
          console.error("Error deleting r2 picture object:", error);
          throw new GraphQLError("Failed to delete r2 picture object.", {
            extensions: { code: "R2_OBJECT_DELETE_ERROR" },
          });
        }
        //delete pornstar.pornstar_picture_path;
        pornstar.pornstar_picture_path = "";
      }
      // this works but the user has to update the cache.
      // scenario if user wants to update picture and had a picture before
      else if (
        pornstar.pornstar_picture_path &&
        editPornstarInput.imageUpdate.didChange &&
        editPornstarInput.pornstar_picture
      ) {
        const parts = pornstar.pornstar_picture_path.split("/");
        const objectKey = parts[parts.length - 1];

        // check and remove extra key after ?
        const updatedKey = objectKey.split("?")[0];
        try {
          url = await createPresignedUrlWithClient({
            key: updatedKey,
          });
        } catch (error) {
          console.error("Error creating presigned URL:", error);
          throw new GraphQLError("Failed to generate presigned URL.", {
            extensions: { code: "PRESIGNED_URL_ERROR" },
          });
        }
        //pornstar.pornstar_picture_path = url.split('?')[0] + "?" + id;
        const id = `${uuidv4()}-${req.session.userId}-${Date.now()}`;
        pornstar.pornstar_picture_path =
          "https://pub-f8c29b76b6bc4836aac4b8dabb8b6b25.r2.dev/" +
          updatedKey +
          "?" +
          id;
      }
      // if user is adding picture for first time
      else if (
        editPornstarInput.imageUpdate.didChange &&
        !pornstar.pornstar_picture_path
      ) {
        const id = `${uuidv4()}-${req.session.userId}-${Date.now()}`;
        try {
          url = await createPresignedUrlWithClient({ key: id });
        } catch (error) {
          console.error("Error creating presigned URL:", error);
          throw new GraphQLError("Failed to generate presigned URL.", {
            extensions: { code: "PRESIGNED_URL_ERROR" },
          });
        }
        pornstar.pornstar_picture_path =
          "https://pub-f8c29b76b6bc4836aac4b8dabb8b6b25.r2.dev/" + id;
      }

      
      try {
        return await AppDataSource.transaction(async (transactionManager) => {
      const updatedPornstar = await transactionManager.save(pornstar);

      if (editPornstarInput.pornstar_tags_obj) {
        // type checks the string and make sure this is in the correct format
        let newTagEntities: any[] = [];
        const pornstarTagRepository = transactionManager.getRepository(PornstarTag);
        const oldPornstarTags = await pornstarTagRepository.findBy({
          pornstar: pornstar,
        });
        const oldPornstarTagsText = oldPornstarTags.map((obj) => obj.tag_text);
        // text
        const newPornstarTags = editPornstarInput.pornstar_tags_obj;

        const elementsToRemove = oldPornstarTags.filter(
          (element) =>
            !newPornstarTags
              .map((obj) => obj.tag_text)
              .includes(element.tag_text)
        );
        const elementsToRemoveTagIds = elementsToRemove.map(
          (obj) => obj.tag_id
        );
        const elementsToAdd = newPornstarTags.filter(
          (element) => !oldPornstarTagsText.includes(element.tag_text)
        );

        if (elementsToRemove.length > 0) {
          await transactionManager.createQueryBuilder()
            .delete()
            .from(PornstarTag)
            .where("tag_id IN (:...tags)", { tags: elementsToRemoveTagIds })
            .execute();
        }

        newTagEntities = elementsToAdd.map((tag) => ({
          pornstar: updatedPornstar,
          tag_text: tag.tag_text,
          user_tag: tag.user_tag,
        }));

        await transactionManager.createQueryBuilder()
          .insert()
          .into(PornstarTag)
          .values(newTagEntities)
          .execute();
      }

      //delete links
      if (editPornstarInput.pornstar_links_updates.deleted_links_ids) {
        if (
          editPornstarInput.pornstar_links_updates.deleted_links_ids.length > 0
        ) {
          await transactionManager.createQueryBuilder()
            .delete()
            .from(PornstarLink)
            .where("pornstar_link_id IN (:...ids)", {
              ids: editPornstarInput.pornstar_links_updates.deleted_links_ids,
            })
            .execute();
        }
      }

      //edit links
      if (editPornstarInput.pornstar_links_updates.edited_links) {
        const pornstarLinkRepository =
        transactionManager.getRepository(PornstarLink);
        let tempLink;
        let result;

        editPornstarInput.pornstar_links_updates.edited_links.forEach(
          async (link) => {
            tempLink = await pornstarLinkRepository.findOne({
              where: { pornstar_link_id: link.pornstar_link_id },
              // Include the 'pornstar' relation
              relations: ["pornstar"],
            });
            if (!tempLink) {
              throw new GraphQLError("UserTag is not found.", {
                extensions: {
                  code: "USERTag_NOT_FOUND",
                },
              });
            }
            tempLink.pornstar_link_title = link.pornstar_link_title;
            tempLink.pornstar_link_url = link.pornstar_link_url;
            result = await transactionManager.save(tempLink);
            console.log("resultttttt");
            console.log(result);
          }
        );
      }

      //add new links
      //console.log("new links", editPornstarInput.pornstar_links_updates.new_links)
      //console.log(editPornstarInput)
      if (editPornstarInput.pornstar_links_updates.new_links) {
        let rowArray: PornstarLinkInput[] = [];
        for (
          let i = 0;
          i < editPornstarInput.pornstar_links_updates.new_links.length;
          i++
        ) {
          // need to typedef this, so easy to make typo, gotta be consistent
          rowArray[i] = {
            pornstar: pornstar,
            pornstar_link_title:
              editPornstarInput.pornstar_links_updates.new_links[i]
                .pornstar_link_title,
            pornstar_link_url:
              editPornstarInput.pornstar_links_updates.new_links[i]
                .pornstar_link_url,
          };
        }

        await transactionManager.createQueryBuilder()
          .insert()
          .into(PornstarLink)
          .values(rowArray)
          .execute();
      }

      const updatedPornstarWithTagsAndLinks = await pornstarRepository.findOne({
        where: {
          pornstar_id: editPornstarInput.pornstar_id,
        },
        //user_id: req.session.userId,
        relations: [
          "pornstar_tags",
          "pornstar_tags.user_tag",
          "pornstar_links",
        ],
      });
      if (!updatedPornstarWithTagsAndLinks) {
        throw new GraphQLError("Pornstar not found.", {
          extensions: {
            code: "PORNSTAR_NOT_FOUND",
          },
        });
      }
      console.log("hax", {
        s3Url: url,
        pornstar_id: updatedPornstar.pornstar_id,
        pornstar_picture_path: updatedPornstar.pornstar_picture_path,
        pornstar: updatedPornstarWithTagsAndLinks,
      });
      return {
        s3Url: url,
        pornstar_id: updatedPornstar.pornstar_id,
        pornstar_picture_path: updatedPornstar.pornstar_picture_path,
      };
    });
    } catch (error) {
      // Handle errors and roll back if needed
      console.error("Transaction failed:", error);
      throw new GraphQLError("Failed to edit pornstar.", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    }
}

  //consider if we need the context req to check if user is actually hte user before doing this request
  // same thing for edit because i think anyone can delete or edit, need to verify them with req.session.user_id
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5))
  async deletePornstar(
    @Arg("deletePornstarInput") deletePornstarInput: DeletePornstarInput,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    console.log("ta", deletePornstarInput);
    const pornstarRepository = AppDataSource.getRepository(Pornstar);

    const pornstar = await pornstarRepository.findOne({
      where: {
        pornstar_id: deletePornstarInput.pornstar_id,
        //user_id: 58,
      },
      //user_id: req.session.userId,
      relations: ["user"],
    });
    if (!pornstar) {
      throw new GraphQLError("Pornstar not found.", {
        extensions: {
          code: "PORNSTAR_NOT_FOUND",
        },
      });
    }
    if (pornstar.user.user_id !== req.session.userId) {
      throw new GraphQLError("Unauthorized pornstar's user id.", {
        extensions: {
          code: "UNAUTHORIZED_PORNSTAR_ACCESS",
        },
      });
    }
    if (pornstar.pornstar_picture_path) {
      const parts = pornstar.pornstar_picture_path.split("/");
      const objectKey = parts[parts.length - 1];
      try {
        await deleteObjectWithClient({ key: objectKey });
      } catch (error) {
        console.error("Error deleting r2 picture object:", error);
        throw new GraphQLError("Failed to delete r2 picture object.", {
          extensions: { code: "R2_OBJECT_DELETE_ERROR" },
        });
      }
    }

    try {
      return await AppDataSource.transaction(async (transactionManager) => {
        await transactionManager
          .createQueryBuilder()
          .delete()
          .from(PornstarTag)
          .where("pornstar_id = :pornstar_id", {
            pornstar_id: deletePornstarInput.pornstar_id,
          })
          .execute();

        await transactionManager
          .createQueryBuilder()
          .delete()
          .from(PornstarLink)
          .where("pornstar_id = :pornstar_id", {
            pornstar_id: deletePornstarInput.pornstar_id,
          })
          .execute();

        await transactionManager.remove(pornstar);
        return true;
      });
    } catch (error) {
      // Handle errors and roll back if needed
      console.error("Transaction failed:", error);
      throw new GraphQLError("Failed to delete pornstar.", {
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
    }
  }
}
