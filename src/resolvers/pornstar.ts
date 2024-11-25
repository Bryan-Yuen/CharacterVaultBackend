// entities
import UserAccount from "../entities/UserAccount";
import Pornstar from "../entities/Pornstar";
import PornstarTag from "../entities/PornstarTag";
import UserLoginHistory from "../entities/UserLoginHistory";
import PornstarLink from "../entities/PornstarLink";
import { MyContext } from "../index";
// dependencies
import {
  Resolver,
  Mutation,
  Arg,
  Query,
  Ctx,
  UseMiddleware,
} from "type-graphql";
import { v4 as uuidv4 } from "uuid";
import { GraphQLError } from "graphql";
// config
import AppDataSource from "../config/db";
import logger from "../config/logger";
import {
  createPresignedUrlWithClient,
  deleteObjectWithClient,
} from "../config/s3";
import "dotenv/config";
// input types
import NewPornstarInputType from "../inputTypes/AddPornstarInputType";
import EditPornstarInputType from "../inputTypes/EditPornstarInputType";
import DeletePornstarInputType from "../inputTypes/DeletePornstarInputType";
import GetPornstarInputType from "../inputTypes/GetPornstarInputType";
import PornstarWithTagsAndLinks from "../returnTypes/PornstarWithTagsAndLinks";
import PornstarWithTags from "../returnTypes/PornstarWithTags";
import AddPornstarReturn from "../returnTypes/AddPornstarReturn";
import EditPornstarReturn from "../returnTypes/EditPornstarReturn";
// middleware
import isAuth from "../middleware/isAuth";
import rateLimit from "../middleware/rateLimit";
// errors
import entityNullError from "../errors/entityNullError";
import findEntityError from "../errors/findEntityError";
//import saveEntityError from "../errors/saveEntityError";
import r2Error from "../errors/r2Error";
import unauthorizedEntityError from "../errors/unauthorizedEntityError";
import transactionFailedError from "../errors/transactionFailedError";
import userTagNotFoundError from "../errors/userTagNotFound";

if (!process.env.BUCKET_URL) {
  throw new Error("BUCKET_URL environment variable is not defined");
}

@Resolver(Pornstar)
export class PornstarResolver {
  // adds a new pornstar with optional tags and links and also optionally returns an s3 url to upload if requested.
  @Mutation(() => AddPornstarReturn)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5)) // max 50 requests per 5 minutes
  async addPornstar(
    @Arg("addPornstarInput")
    {
      pornstar_name,
      pornstar_picture,
      pornstar_links_title_url,
      pornstar_tags_text,
    }: NewPornstarInputType,
    @Ctx() { req }: MyContext
  ): Promise<AddPornstarReturn> {
    try {
      const userRepository = AppDataSource.getRepository(UserAccount);
      const user = await userRepository.findOne({
        where: {
          user_id: req.session.userId,
        },
        // we need pornstars is to get the length to see if user is less than 25 pornstars
        relations: ["pornstars", "userLoginHistory", "userTags"],
      });
      if (user === null) {
        entityNullError(
          "addPornstar",
          "user",
          req.session.userId,
          req.session.userId
        );
      }
      if (user.pornstars === null) {
        entityNullError(
          "addPornstar",
          "user.pornstars",
          req.session.userId,
          req.session.userId
        );
      }
      if (user.userLoginHistory === null) {
        entityNullError(
          "addPornstar",
          "user.LoginHistory",
          req.session.userId,
          req.session.userId
        );
      }
      if (user.userTags === null) {
        entityNullError(
          "addPornstar",
          "user.userTags",
          req.session.userId,
          req.session.userId
        );
      }

      // safeguard incase user bypass add button block and add pornstar page
      if (user.pornstars.length >= 25) {
        logger.error(
          `Unexpected user bypassed client side validation and reached add pornstar limit check`,
          {
            resolver: "addPornstar",
            user_id: req.session.userId,
          }
        );
        throw new GraphQLError("Max limit of 25 pornstars reached.", {
          extensions: {
            code: "PORNSTAR_LIMIT_REACHED",
          },
        });
      }

      // update user login history
      const userLoginHistoryRepository =
        AppDataSource.getRepository(UserLoginHistory);
      user.userLoginHistory.user_last_login_date_time = new Date();
      // no need for await statement because we don't care when it does it.
      userLoginHistoryRepository.save(user.userLoginHistory);

      const pornstar = new Pornstar();

      pornstar.pornstar_name = pornstar_name;
      pornstar.user = user;

      let url = "";
      if (pornstar_picture) {
        const id = `${uuidv4()}-${req.session.userId}-${Date.now()}`;
        try {
          url = await createPresignedUrlWithClient({ key: id });
          pornstar.pornstar_picture_path = process.env.BUCKET_URL + id;
        } catch (error) {
          r2Error(
            "addPornstar",
            "createPresignedUrlWithClient",
            req.session.userId,
            error
          );
        }
      }

      // we could do some next level promise.all if user has links and tags but that can be for later
      try {
        return await AppDataSource.transaction(async (transactionManager) => {
          const savePornstar = await transactionManager.save(pornstar);

          if (pornstar_tags_text) {
            let newPornstarTags: PornstarTag[] = [];

            for (let i = 0; i < pornstar_tags_text.length; i++) {
              // putting exclamation mark ! here even though the if statement on top should be enough
              const userTag = user.userTags.find(
                (tag) => tag.user_tag_text === pornstar_tags_text![i]
              );
              if (!userTag) {
                userTagNotFoundError("addPornstar", req.session.userId);
              }

              newPornstarTags[i] = new PornstarTag();
              newPornstarTags[i].pornstar = savePornstar;
              newPornstarTags[i].tag_text = pornstar_tags_text[i];
              newPornstarTags[i].user_tag = userTag;
            }

            await transactionManager
              .createQueryBuilder()
              .insert()
              .into(PornstarTag)
              .values(newPornstarTags)
              .execute();
          }

          if (pornstar_links_title_url) {
            let newPornstarLinks: PornstarLink[] = [];

            for (let i = 0; i < pornstar_links_title_url.length; i++) {
              newPornstarLinks[i] = new PornstarLink();
              newPornstarLinks[i].pornstar = savePornstar;
              newPornstarLinks[i].pornstar_link_title =
                pornstar_links_title_url[i].pornstar_link_title;
              newPornstarLinks[i].pornstar_link_url =
                pornstar_links_title_url[i].pornstar_link_url;
            }

            await transactionManager
              .createQueryBuilder()
              .insert()
              .into(PornstarLink)
              .values(newPornstarLinks)
              .execute();
          }

          return {
            s3Url: url,
            pornstar_id: savePornstar.pornstar_id,
          };
        });
      } catch (error) {
        // Handle errors and roll back if needed
        transactionFailedError(
          "addPornstar",
          "pornstar",
          req.session.userId,
          req.session.userId,
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

  // edits pornstar: name, picture, tags, and links and returns the updated pornsta
  @Mutation(() => EditPornstarReturn)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5)) // max 50 requests per 5 minutes
  async editPornstar(
    @Arg("editPornstarInput")
    {
      pornstar_id,
      pornstar_name,
      pornstar_picture,
      imageUpdate,
      pornstar_tags_text,
      pornstar_links_updates,
    }: EditPornstarInputType,
    @Ctx() { req }: MyContext
  ): Promise<EditPornstarReturn> {
    try {
      const pornstarRepository = AppDataSource.getRepository(Pornstar);
      const pornstar = await pornstarRepository.findOne({
        where: {
          pornstar_id: pornstar_id,
          user: {
            user_id: req.session.userId
          },
        },
        relations: ["user.userTags"],
      });
      // expected error if user deleted something and had another web page opened, but should be rare
      if (pornstar === null) {
        entityNullError(
          "editPornstar",
          "pornstar",
          req.session.userId,
          pornstar_id
        );
      }
      if (pornstar.user.userTags === null) {
        entityNullError(
          "editPornstar",
          "pornstar.user.userTags",
          req.session.userId,
          pornstar_id
        );
      }
      pornstar.pornstar_name = pornstar_name;

      let url = "";

      // scenario if user presses delete and has current picture in database
      if (
        imageUpdate.didDelete &&
        !pornstar_picture &&
        pornstar.pornstar_picture_path
      ) {
        const parts = pornstar.pornstar_picture_path.split("/");
        const objectKey = parts[parts.length - 1];
        try {
          await deleteObjectWithClient({ key: objectKey });
        } catch (error) {
          r2Error(
            "editPornstar",
            "deleteObjectWithClient",
            req.session.userId,
            error
          );
        }
        //in the future lets try to get this to be able to be null so our database is only null or picture string url;
        pornstar.pornstar_picture_path = "";
      }
      // this works but the user has to update the cache.
      // scenario if user wants to update picture and had a picture before
      else if (
        pornstar.pornstar_picture_path &&
        imageUpdate.didChange &&
        pornstar_picture
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
          r2Error(
            "editPornstar",
            "createPresignedUrlWithClient",
            req.session.userId,
            error
          );
        }
        //pornstar.pornstar_picture_path = url.split('?')[0] + "?" + id;
        const id = `${uuidv4()}-${req.session.userId}-${Date.now()}`;
        pornstar.pornstar_picture_path =
          process.env.BUCKET_URL +
          updatedKey +
          // adds a query to refresh cache
          "?" +
          id;
      }
      // if user is adding picture for first time
      else if (
        imageUpdate.didChange &&
        !pornstar.pornstar_picture_path &&
        pornstar_picture
      ) {
        const id = `${uuidv4()}-${req.session.userId}-${Date.now()}`;
        try {
          url = await createPresignedUrlWithClient({ key: id });
        } catch (error) {
          r2Error(
            "editPornstar",
            "createPresignedUrlWithClient",
            req.session.userId,
            error
          );
        }
        pornstar.pornstar_picture_path = process.env.BUCKET_URL + id;
      }

      try {
        return await AppDataSource.transaction(async (transactionManager) => {
          const updatedPornstar = await transactionManager.save(pornstar);

          if (pornstar_tags_text) {
            // delete the tags that are missing logic
            const pornstarTagRepository =
              transactionManager.getRepository(PornstarTag);

            const oldPornstarTags = await pornstarTagRepository.findBy({
              pornstar: pornstar,
            });

            const oldPornstarTagsText = oldPornstarTags.map(
              (obj) => obj.tag_text
            );

            const elementsToRemove = oldPornstarTags.filter(
              (element) => !pornstar_tags_text.includes(element.tag_text)
            );
            const elementsToRemoveTagIds = elementsToRemove.map(
              (obj) => obj.tag_id
            );

            if (elementsToRemove.length > 0) {
              await transactionManager
                .createQueryBuilder()
                .delete()
                .from(PornstarTag)
                .where("tag_id IN (:...tags)", { tags: elementsToRemoveTagIds })
                .execute();
            }

            // add the new tags logic
            let newPornstarTags: PornstarTag[] = [];

            const newTags = pornstar_tags_text.filter(
              (element) => !oldPornstarTagsText.includes(element)
            );

            for (let i = 0; i < newTags.length; i++) {
              const userTag = pornstar.user.userTags.find(
                (tag) => tag.user_tag_text === newTags[i]
              );
              if (!userTag) {
                userTagNotFoundError("editPornstar", req.session.userId);
              }
              newPornstarTags[i] = new PornstarTag();
              newPornstarTags[i].pornstar = updatedPornstar;
              newPornstarTags[i].tag_text = newTags[i];
              newPornstarTags[i].user_tag = userTag;
            }

            await transactionManager
              .createQueryBuilder()
              .insert()
              .into(PornstarTag)
              .values(newPornstarTags)
              .execute();
          }

          //delete links
          if (
            pornstar_links_updates.deleted_links_ids &&
            pornstar_links_updates.deleted_links_ids.length > 0
          ) {
            const pornstarLinkRepository =
              transactionManager.getRepository(PornstarLink);

            for (const link of pornstar_links_updates.deleted_links_ids) {
              const tempLink = await pornstarLinkRepository.findOne({
                where: { pornstar_link_id: link },
                relations: ["pornstar.user"],
              });
              if (tempLink === null) {
                entityNullError(
                  "editPornstar",
                  "pornstarLink",
                  req.session.userId,
                  link
                );
              }
              if (tempLink.pornstar.user.user_id !== req.session.userId) {
                unauthorizedEntityError(
                  "editPornstar",
                  "pornstarlink in delete",
                  req.session.userId,
                  tempLink.pornstar.user.user_id,
                  link
                );
              }
              await transactionManager.remove(tempLink);
            }
          }

          //edit links
          if (pornstar_links_updates.edited_links) {
            const pornstarLinkRepository =
              transactionManager.getRepository(PornstarLink);

            for (const link of pornstar_links_updates.edited_links) {
              const tempLink = await pornstarLinkRepository.findOne({
                where: { pornstar_link_id: link.pornstar_link_id },
                relations: ["pornstar.user"],
              });
              if (tempLink === null) {
                entityNullError(
                  "editPornstar",
                  "pornstarLink in edit",
                  req.session.userId,
                  link.pornstar_link_id
                );
              }
              if (tempLink.pornstar.user.user_id !== req.session.userId) {
                unauthorizedEntityError(
                  "editPornstar",
                  "pornstarlink",
                  req.session.userId,
                  tempLink.pornstar.user.user_id,
                  link.pornstar_link_id
                );
              }

              tempLink.pornstar_link_title = link.pornstar_link_title;
              tempLink.pornstar_link_url = link.pornstar_link_url;
              await transactionManager.save(tempLink);
            }
          }

          //add new links
          if (pornstar_links_updates.new_links) {
            let newPornstarLinks: PornstarLink[] = [];
            for (let i = 0; i < pornstar_links_updates.new_links.length; i++) {
              newPornstarLinks[i] = new PornstarLink();
              newPornstarLinks[i].pornstar = updatedPornstar;
              newPornstarLinks[i].pornstar_link_title =
                pornstar_links_updates.new_links[i].pornstar_link_title;
              newPornstarLinks[i].pornstar_link_url =
                pornstar_links_updates.new_links[i].pornstar_link_url;
            }

            await transactionManager
              .createQueryBuilder()
              .insert()
              .into(PornstarLink)
              .values(newPornstarLinks)
              .execute();
          }

          /*
          const updatedPornstarWithTagsAndLinks =
            await pornstarRepository.findOne({
              where: {
                pornstar_id: pornstar_id,
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
          */
          return {
            s3Url: url,
            pornstar_picture_path: updatedPornstar.pornstar_picture_path,
          };
        });
      } catch (error) {
        // Handle errors and roll back if needed
        transactionFailedError(
          "editPornstar",
          "pornstar",
          req.session.userId,
          pornstar_id,
          error
        );
      }
    } catch (error) {
      findEntityError(
        "editPornstar",
        "user",
        req.session.userId,
        req.session.userId,
        error
      );
    }
  }

  // deletes pornstar by removing image from s3, then tags and links, and finally the pornstar itself
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5)) // max 50 requests per 5 minutes
  async deletePornstar(
    @Arg("deletePornstarInput") { pornstar_id }: DeletePornstarInputType,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    try {
      const pornstarRepository = AppDataSource.getRepository(Pornstar);

      const pornstar = await pornstarRepository.findOne({
        where: {
          pornstar_id: pornstar_id,
          user: {
            user_id: req.session.userId
          },
        },
      });
      // expected error if user deleted something and had another web page opened, but should be rare
      if (pornstar === null) {
        entityNullError(
          "deletePornstar",
          "pornstar",
          req.session.userId,
          req.session.userId
        );
      }

      if (pornstar.pornstar_picture_path) {
        const parts = pornstar.pornstar_picture_path.split("/");
        const objectKey = parts[parts.length - 1];
        try {
          await deleteObjectWithClient({ key: objectKey });
        } catch (error) {
          r2Error(
            "deletePornstar",
            "deleteObjectWithClient",
            req.session.userId,
            error
          );
        }
      }

      // we already verified the pornstar id by verifying the session user id so we can safely delete
      try {
        return await AppDataSource.transaction(async (transactionManager) => {
          // delete pornstar tags
          await transactionManager
            .createQueryBuilder()
            .delete()
            .from(PornstarTag)
            .where("pornstar_id = :pornstar_id", {
              pornstar_id: pornstar_id,
            })
            .execute();

          // delete pornstar links
          await transactionManager
            .createQueryBuilder()
            .delete()
            .from(PornstarLink)
            .where("pornstar_id = :pornstar_id", {
              pornstar_id: pornstar_id,
            })
            .execute();

          // delete pornstar
          await transactionManager.remove(pornstar);
          return true;
        });
      } catch (error) {
        // Handle errors and roll back if needed
        transactionFailedError(
          "deletePornstar",
          "pornstar",
          req.session.userId,
          pornstar_id,
          error
        );
      }
    } catch (error) {
      findEntityError(
        "deletePornstar",
        "pornstar",
        req.session.userId,
        pornstar_id,
        error
      );
    }
  }

  // need to return pornstar type with tags and links too
  @Query(() => PornstarWithTagsAndLinks)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5)) // max 50 requests per 5 minutes
  async getPornstar(
    @Arg("getPornstarInput") { pornstar_id }: GetPornstarInputType,
    @Ctx() { req }: MyContext
  ): Promise<PornstarWithTagsAndLinks> {
    const pornstarRepository = AppDataSource.getRepository(Pornstar);

    const pornstar = await pornstarRepository.findOne({
      where: {
        pornstar_id: pornstar_id,
        user: {
          user_id: req.session.userId
        },
      },
      relations: ["pornstar_tags", "pornstar_links"],
    });
    if (pornstar === null) {
      entityNullError(
        "getPornstar",
        "pornstar",
        req.session.userId,
        pornstar_id
      );
    }
    if (pornstar.pornstar_tags === null) {
      entityNullError(
        "getPornstar",
        "pornstar",
        req.session.userId,
        pornstar_id
      );
    }
    if (pornstar.pornstar_links === null) {
      entityNullError(
        "getPornstar",
        "pornstar",
        req.session.userId,
        pornstar_id
      );
    }

    return pornstar;
  }

  // returns pornstars and their associated pornstar tags texts in one object array.
  @Query(() => [PornstarWithTags])
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5)) // max 50 requests per 5 minutes
  async getAllPornstarsAndTags(
    @Ctx() { req }: MyContext
  ): Promise<PornstarWithTags[]> {
    const userRepository = AppDataSource.getRepository(UserAccount);
    const user = await userRepository.findOne({
      where: {
        user_id: req.session.userId,
      },
      relations: ["pornstars", "pornstars.pornstar_tags"],
    });
    if (user === null) {
      entityNullError(
        "getAllPornstarsAndTags",
        "user",
        req.session.userId,
        req.session.userId
      );
    }
    if (user.pornstars === null) {
      entityNullError(
        "getAllPornstarsAndTags",
        "pornstars",
        req.session.userId,
        req.session.userId
      );
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

    return restructuredPornstars;
  }
}
