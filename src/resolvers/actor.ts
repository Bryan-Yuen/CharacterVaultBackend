// entities
import UserAccount from "../entities/UserAccount";
import Actor from "../entities/Actor";
import ActorTag from "../entities/ActorTag";
import UserLoginHistory from "../entities/UserLoginHistory";
import ActorLink from "../entities/ActorLink";
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
  createEncryptedPresignedUrlWithClient,
  deleteObjectWithClient,
} from "../config/s3";
import "dotenv/config";
// input types
import NewActorInputType from "../inputTypes/AddActorInputType";
import EditActorInputType from "../inputTypes/EditActorInputType";
import DeleteActorInputType from "../inputTypes/DeleteActorInputType";
import GetActorInputType from "../inputTypes/GetActorInputType";
// return types
import ActorWithTagsAndLinks from "../returnTypes/ActorWithTagsAndLinks";
import ActorWithTags from "../returnTypes/ActorWithTags";
import AddActorReturn from "../returnTypes/AddActorReturn";
import EditActorReturn from "../returnTypes/EditActorReturn";
// middleware
import isAuth from "../middleware/isAuth";
import rateLimit from "../middleware/rateLimit";
import versionChecker from "../middleware/versionChecker";
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

@Resolver(Actor)
export class ActorResolver {
  // adds a new actor with optional tags and links and also optionally returns an s3 url to upload if requested.
  @Mutation(() => AddActorReturn)
  @UseMiddleware(isAuth)
  @UseMiddleware(versionChecker)
  @UseMiddleware(rateLimit(50, 60 * 5)) // max 50 requests per 5 minutes
  async addactor(
    @Arg("addActorInput")
    {
      actor_name,
      actor_picture,
      actor_links_title_url,
      actor_tags_text,
    }: NewActorInputType,
    @Ctx() { req }: MyContext
  ): Promise<AddActorReturn> {
    try {
      const userRepository = AppDataSource.getRepository(UserAccount);
      const user = await userRepository.findOne({
        where: {
          user_id: req.session.userId,
        },
        // we need actors is to get the length to see if user is less than 25 actors
        relations: ["actors", "userLoginHistory", "userTags"],
      });
      if (user === null) {
        entityNullError(
          "addActor",
          "user",
          req.session.userId,
          req.session.userId
        );
      }
      if (user.actors === null) {
        entityNullError(
          "addActor",
          "user.actors",
          req.session.userId,
          req.session.userId
        );
      }
      if (user.userLoginHistory === null) {
        entityNullError(
          "addActor",
          "user.LoginHistory",
          req.session.userId,
          req.session.userId
        );
      }
      if (user.userTags === null) {
        entityNullError(
          "addActor",
          "user.userTags",
          req.session.userId,
          req.session.userId
        );
      }

      const actorNameExists = user.actors.some(
        (actor) => actor.actor_name === actor_name
      );

      // expected error for actor name already in account
      if (actorNameExists) {
        throw new GraphQLError("actor name already exists for this user.", {
          extensions: {
            code: "ACTOR_NAME_ALREADY_EXISTS",
          },
        });
      }

      /*
      // safeguard incase user bypass add button block and add actor page
      if (user.actors.length >= 25) {
        logger.error(
          `Unexpected user bypassed client side validation and reached add actor limit check`,
          {
            resolver: "addactor",
            user_id: req.session.userId,
          }
        );
        throw new GraphQLError("Max limit of 25 actors reached.", {
          extensions: {
            code: "actor_LIMIT_REACHED",
          },
        });
      }
        */

      /* this code if after closure of business*/
      if ((user.actors.length >= 25 && !user.user_is_premium) || (user.actors.length >= 1000) ) {
        logger.error(
          `Unexpected user bypassed client side validation and reached add actor limit check`,
          {
            resolver: "addactor",
            user_id: req.session.userId,
          }
        );
        throw new GraphQLError("Max limit of 25 actors reached for free user or over 1000 for premium.", {
          extensions: {
            code: "actor_LIMIT_REACHED",
          },
        });
      }

      // update user login history
      const userLoginHistoryRepository =
        AppDataSource.getRepository(UserLoginHistory);
      user.userLoginHistory.user_last_login_date_time = new Date();
      // no need for await statement because we don't care when it does it.
      userLoginHistoryRepository.save(user.userLoginHistory);

      const actor = new Actor();

      let secured_data = "";
      if (actor_picture) {
        const id = `${uuidv4()}-${req.session.userId}-${Date.now()}.jpg`;
        try {
          secured_data = await createEncryptedPresignedUrlWithClient({
            key: id,
          });
          actor.actor_picture_path = process.env.BUCKET_URL + id;
        } catch (error) {
          r2Error(
            "addActor",
            "createPresignedUrlWithClient",
            req.session.userId,
            error
          );
        }
      }
      actor.actor_name = actor_name;
      actor.user = user;
      actor.actor_url_slug = `${uuidv4()}-${
        req.session.userId
      }-${Date.now()}`;

      // we could do some next level promise.all if user has links and tags but that can be for later
      try {
        return await AppDataSource.transaction(async (transactionManager) => {
          const saveactor = await transactionManager.save(actor);

          if (actor_tags_text) {
            let newactorTags: ActorTag[] = [];

            for (let i = 0; i < actor_tags_text.length; i++) {
              // putting exclamation mark ! here even though the if statement on top should be enough
              const userTag = user.userTags.find(
                (tag) => tag.user_tag_text === actor_tags_text![i]
              );
              if (!userTag) {
                userTagNotFoundError("addactor", req.session.userId);
              }

              newactorTags[i] = new ActorTag();
              newactorTags[i].actor = saveactor;
              newactorTags[i].actor_tag_text = actor_tags_text[i];
              newactorTags[i].user_tag = userTag;
            }

            await transactionManager
              .createQueryBuilder()
              .insert()
              .into(ActorTag)
              .values(newactorTags)
              .execute();
          }

          if (actor_links_title_url) {
            let newactorLinks: ActorLink[] = [];

            for (let i = 0; i < actor_links_title_url.length; i++) {
              // we need at least one of them to have something. if both are empty skip
              if (
                actor_links_title_url[i].actor_link_title ||
                actor_links_title_url[i].actor_link_url
              ) {
                newactorLinks[i] = new ActorLink();
                newactorLinks[i].actor = saveactor;
                newactorLinks[i].actor_link_title =
                  actor_links_title_url[i].actor_link_title;
                newactorLinks[i].actor_link_url =
                  actor_links_title_url[i].actor_link_url;
              }
            }

            await transactionManager
              .createQueryBuilder()
              .insert()
              .into(ActorLink)
              .values(newactorLinks)
              .execute();
          }

          return {
            secured_data: secured_data,
            actor_url_slug: saveactor.actor_url_slug,
            actor_picture_path: saveactor.actor_picture_path,
          };
        });
      } catch (error) {
        // Handle errors and roll back if needed
        transactionFailedError(
          "addActor",
          "actor",
          req.session.userId,
          req.session.userId,
          error
        );
      }
    } catch (error) {
      findEntityError(
        "addActor",
        "user",
        req.session.userId,
        req.session.userId,
        error
      );
    }
  }

  // edits actor: name, picture, tags, and links and returns the updated pornsta
  @Mutation(() => EditActorReturn)
  @UseMiddleware(isAuth)
  @UseMiddleware(versionChecker)
  @UseMiddleware(rateLimit(50, 60 * 5)) // max 50 requests per 5 minutes
  async editActor(
    @Arg("editActorInput")
    {
      actor_url_slug,
      actor_name,
      actor_picture,
      imageUpdate,
      actor_tags_text,
      actor_links_updates,
    }: EditActorInputType,
    @Ctx() { req }: MyContext
  ): Promise<EditActorReturn> {
    try {
      const actorRepository = AppDataSource.getRepository(Actor);
      const actor = await actorRepository.findOne({
        where: {
          actor_url_slug: actor_url_slug,
          user: {
            user_id: req.session.userId,
          },
        },
        relations: ["user.userTags", "user.actors"],
      });
      // expected error if user deleted something and had another web page opened, but should be rare
      if (actor === null) {
        entityNullError(
          "editActor",
          "actor",
          req.session.userId,
          req.session.userId
        );
      }
      if (actor.user.userTags === null) {
        entityNullError(
          "editActor",
          "actor.user.userTags",
          req.session.userId,
          req.session.userId
        );
      }
      if (actor.user.actors === null) {
        entityNullError(
          "editActor",
          "actor.user.actors",
          req.session.userId,
          req.session.userId
        );
      }

      // only do this check if they changed the name. if no change we don't check
      if (actor.actor_name !== actor_name) {
        const actorNameExists = actor.user.actors.some(
          (actor) => actor.actor_name === actor_name
        );

        // expected error for actor name already in account
        if (actorNameExists) {
          throw new GraphQLError(
            "actor name already exists for this user.",
            {
              extensions: {
                code: "ACTOR_NAME_ALREADY_EXISTS",
              },
            }
          );
        }
      }

      actor.actor_name = actor_name;

      let secured_data = "";

      // scenario if user presses delete and has current picture in database
      if (
        imageUpdate.didDelete &&
        !actor_picture &&
        actor.actor_picture_path
      ) {
        const parts = actor.actor_picture_path.split("/");
        const objectKey = parts[parts.length - 1];
        try {
          await deleteObjectWithClient({ key: objectKey });
        } catch (error) {
          r2Error(
            "editActor",
            "deleteObjectWithClient",
            req.session.userId,
            error
          );
        }
        //in the future lets try to get this to be able to be null so our database is only null or picture string url;
        actor.actor_picture_path = "";
      }
      // scenario if user wants to update picture and had a picture before
      else if (
        actor.actor_picture_path &&
        imageUpdate.didChange &&
        actor_picture
      ) {
        /*
        const parts = actor.actor_picture_path.split("/");
        const objectKey = parts[parts.length - 1];

        // check and remove extra key after ?
        const updatedKey = objectKey.split("?")[0];
        try {
          secured_data = await createEncryptedPresignedUrlWithClient({
            key: updatedKey,
          });
        } catch (error) {
          r2Error(
            "editactor",
            "createPresignedUrlWithClient",
            req.session.userId,
            error
          );
        }
        //actor.actor_picture_path = url.split('?')[0] + "?" + id;
        const id = `${uuidv4()}-${req.session.userId}-${Date.now()}.jpg`;
        actor.actor_picture_path =
          process.env.BUCKET_URL +
          updatedKey +
          // adds a query to refresh cache
          "?" +
          id;
          */
        const parts = actor.actor_picture_path.split("/");
        const objectKey = parts[parts.length - 1];
        const id = `${uuidv4()}-${req.session.userId}-${Date.now()}.jpg`;
        try {
          await Promise.all([
            (secured_data = await createEncryptedPresignedUrlWithClient({
              key: id,
            })),
            await deleteObjectWithClient({ key: objectKey }),
          ]);
        } catch (error) {
          r2Error(
            "editActor",
            "createPresignedUrlWithClient or deleteObjectWithClient",
            req.session.userId,
            error
          );
        }
        actor.actor_picture_path = process.env.BUCKET_URL + id;
      }
      // if user is adding picture for first time
      else if (
        imageUpdate.didChange &&
        !actor.actor_picture_path &&
        actor_picture
      ) {
        const id = `${uuidv4()}-${req.session.userId}-${Date.now()}.jpg`;
        try {
          secured_data = await createEncryptedPresignedUrlWithClient({
            key: id,
          });
        } catch (error) {
          r2Error(
            "editactor",
            "createPresignedUrlWithClient",
            req.session.userId,
            error
          );
        }
        actor.actor_picture_path = process.env.BUCKET_URL + id;
      }

      try {
        return await AppDataSource.transaction(async (transactionManager) => {
          const updatedactor = await transactionManager.save(actor);

          if (actor_tags_text) {
            // delete the tags that are missing logic
            const actorTagRepository =
              transactionManager.getRepository(ActorTag);

            const oldactorTags = await actorTagRepository.findBy({
              actor: actor,
            });

            const oldactorTagsText = oldactorTags.map(
              (obj) => obj.actor_tag_text
            );

            const elementsToRemove = oldactorTags.filter(
              (element) =>
                !actor_tags_text.includes(element.actor_tag_text)
            );
            const elementsToRemoveTagIds = elementsToRemove.map(
              (obj) => obj.actor_tag_id
            );

            if (elementsToRemove.length > 0) {
              await transactionManager
                .createQueryBuilder()
                .delete()
                .from(ActorTag)
                .where("actor_tag_id IN (:...tags)", {
                  tags: elementsToRemoveTagIds,
                })
                .execute();
            }

            // add the new tags logic
            let newactorTags: ActorTag[] = [];

            const newTags = actor_tags_text.filter(
              (element) => !oldactorTagsText.includes(element)
            );

            for (let i = 0; i < newTags.length; i++) {
              const userTag = actor.user.userTags.find(
                (tag) => tag.user_tag_text === newTags[i]
              );
              if (!userTag) {
                userTagNotFoundError("editactor", req.session.userId);
              }
              newactorTags[i] = new ActorTag();
              newactorTags[i].actor = updatedactor;
              newactorTags[i].actor_tag_text = newTags[i];
              newactorTags[i].user_tag = userTag;
            }

            await transactionManager
              .createQueryBuilder()
              .insert()
              .into(ActorTag)
              .values(newactorTags)
              .execute();
          }

          //delete links
          if (
            actor_links_updates.deleted_links_ids &&
            actor_links_updates.deleted_links_ids.length > 0
          ) {
            const actorLinkRepository =
              transactionManager.getRepository(ActorLink);

            for (const link of actor_links_updates.deleted_links_ids) {
              const tempLink = await actorLinkRepository.findOne({
                where: { actor_link_id: link },
                relations: ["actor.user"],
              });
              if (tempLink === null) {
                entityNullError(
                  "editActor",
                  "actorLink",
                  req.session.userId,
                  link
                );
              }
              if (tempLink.actor.user.user_id !== req.session.userId) {
                unauthorizedEntityError(
                  "editActor",
                  "actorlink in delete",
                  req.session.userId,
                  tempLink.actor.user.user_id,
                  link
                );
              }
              await transactionManager.remove(tempLink);
            }
          }

          //edit links
          if (actor_links_updates.edited_links) {
            const actorLinkRepository =
              transactionManager.getRepository(ActorLink);

            for (const link of actor_links_updates.edited_links) {
              const tempLink = await actorLinkRepository.findOne({
                where: { actor_link_id: link.actor_link_id },
                relations: ["actor.user"],
              });
              if (tempLink === null) {
                entityNullError(
                  "editActor",
                  "actorLink in edit",
                  req.session.userId,
                  link.actor_link_id
                );
              }
              if (tempLink.actor.user.user_id !== req.session.userId) {
                unauthorizedEntityError(
                  "editActor",
                  "actorlink",
                  req.session.userId,
                  tempLink.actor.user.user_id,
                  link.actor_link_id
                );
              }

              // we need at least one of them to have something. if both are empty remove from database
              if (link.actor_link_title || link.actor_link_url) {
                tempLink.actor_link_title = link.actor_link_title;
                tempLink.actor_link_url = link.actor_link_url;
                await transactionManager.save(tempLink);
              } else await transactionManager.remove(tempLink);
            }
          }

          //add new links
          if (actor_links_updates.new_links) {
            let newactorLinks: ActorLink[] = [];
            for (let i = 0; i < actor_links_updates.new_links.length; i++) {
              // we need at least one of them to have something. if both are empty skip
              if (
                actor_links_updates.new_links[i].actor_link_title ||
                actor_links_updates.new_links[i].actor_link_url
              ) {
                newactorLinks[i] = new ActorLink();
                newactorLinks[i].actor = updatedactor;
                newactorLinks[i].actor_link_title =
                  actor_links_updates.new_links[i].actor_link_title;
                newactorLinks[i].actor_link_url =
                  actor_links_updates.new_links[i].actor_link_url;
              }
            }

            await transactionManager
              .createQueryBuilder()
              .insert()
              .into(ActorLink)
              .values(newactorLinks)
              .execute();
          }

          return {
            secured_data: secured_data,
            actor_picture_path: updatedactor.actor_picture_path,
          };
        });
      } catch (error) {
        // Handle errors and roll back if needed
        transactionFailedError(
          "editActor",
          "actor",
          req.session.userId,
          actor.actor_id,
          error
        );
      }
    } catch (error) {
      findEntityError(
        "editActor",
        "user",
        req.session.userId,
        req.session.userId,
        error
      );
    }
  }

  // deletes actor by removing image from s3, then tags and links, and finally the actor itself
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  @UseMiddleware(versionChecker)
  @UseMiddleware(rateLimit(50, 60 * 5)) // max 50 requests per 5 minutes
  async deleteActor(
    @Arg("deleteActorInput") { actor_url_slug }: DeleteActorInputType,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    try {
      const actorRepository = AppDataSource.getRepository(Actor);

      const actor = await actorRepository.findOne({
        where: {
          actor_url_slug: actor_url_slug,
          user: {
            user_id: req.session.userId,
          },
        },
      });
      // expected error if user deleted something and had another web page opened, but should be rare
      if (actor === null) {
        entityNullError(
          "deleteActor",
          "actor",
          req.session.userId,
          req.session.userId
        );
        // consider just returning true and letting user believe it was deleted from the action
        // return true;
      }

      if (actor.actor_picture_path) {
        const parts = actor.actor_picture_path.split("/");
        const objectKey = parts[parts.length - 1];
        try {
          await deleteObjectWithClient({ key: objectKey });
        } catch (error) {
          r2Error(
            "deleteActor",
            "deleteObjectWithClient",
            req.session.userId,
            error
          );
        }
      }

      // we already verified the actor id by verifying the session user id so we can safely delete
      try {
        return await AppDataSource.transaction(async (transactionManager) => {
          // delete actor tags
          await transactionManager
            .createQueryBuilder()
            .delete()
            .from(ActorTag)
            .where("actor_id = :actor_id", {
              actor_id: actor.actor_id,
            })
            .execute();

          // delete actor links
          await transactionManager
            .createQueryBuilder()
            .delete()
            .from(ActorLink)
            .where("actor_id = :actor_id", {
              actor_id: actor.actor_id,
            })
            .execute();

          // delete actor
          await transactionManager.remove(actor);
          return true;
        });
      } catch (error) {
        // Handle errors and roll back if needed
        transactionFailedError(
          "deleteActor",
          "actor",
          req.session.userId,
          actor.actor_id,
          error
        );
      }
    } catch (error) {
      findEntityError(
        "deleteActor",
        "actor",
        req.session.userId,
        req.session.userId,
        error
      );
    }
  }

  // need to return actor type with tags and links too
  @Query(() => ActorWithTagsAndLinks)
  @UseMiddleware(isAuth)
  @UseMiddleware(versionChecker)
  @UseMiddleware(rateLimit(50, 60 * 5)) // max 50 requests per 5 minutes
  async getActor(
    @Arg("getActorInput") { actor_url_slug }: GetActorInputType,
    @Ctx() { req }: MyContext
  ): Promise<ActorWithTagsAndLinks> {
    try {
      const actorRepository = AppDataSource.getRepository(Actor);
      const actor = await actorRepository.findOne({
        where: {
          actor_url_slug: actor_url_slug,
          user: {
            user_id: req.session.userId,
          },
        },
        relations: ["actor_tags", "actor_links"],
      });
      // expected error if user enters wrong slug for some reason or porntsar previously deleted
      if (actor === null) {
        entityNullError(
          "getActor",
          "actor",
          req.session.userId,
          req.session.userId
        );
      }
      if (actor.actor_tags === null) {
        entityNullError(
          "getActor",
          "actor",
          req.session.userId,
          req.session.userId
        );
      }
      if (actor.actor_links === null) {
        entityNullError(
          "getActor",
          "actor",
          req.session.userId,
          req.session.userId
        );
      }

      return actor;
    } catch (error) {
      findEntityError(
        "getActor",
        "actor",
        req.session.userId,
        req.session.userId,
        error
      );
    }
  }

  // returns actors and their associated actor tags texts in one object array.
  @Query(() => [ActorWithTags])
  @UseMiddleware(isAuth)
  @UseMiddleware(versionChecker)
  @UseMiddleware(rateLimit(50, 60 * 5)) // max 50 requests per 5 minutes
  async getAllActorsAndTags(
    @Ctx() { req }: MyContext
  ): Promise<ActorWithTags[]> {
    try {
      const userRepository = AppDataSource.getRepository(UserAccount);
      const user = await userRepository.findOne({
        where: {
          user_id: req.session.userId,
        },
        relations: ["actors", "actors.actor_tags"],
      });
      if (user === null) {
        entityNullError(
          "getAllActorsAndTags",
          "user",
          req.session.userId,
          req.session.userId
        );
      }
      if (user.actors === null) {
        entityNullError(
          "getAllActorsAndTags",
          "actors",
          req.session.userId,
          req.session.userId
        );
      }
      const restructuredactors: ActorWithTags[] = user.actors.map(
        (actor) => ({
          actor_url_slug: actor.actor_url_slug,
          actor_name: actor.actor_name,
          actor_picture_path: actor.actor_picture_path,
          actor_tags_text: actor.actor_tags.map(
            (actor_tag) => actor_tag.actor_tag_text
          ),
        })
      );

      return restructuredactors;
    } catch (error) {
      findEntityError(
        "getAllActorsAndTags",
        "actor",
        req.session.userId,
        req.session.userId,
        error
      );
    }
  }
}
