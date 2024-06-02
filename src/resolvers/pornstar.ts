import { UserAccount } from '../entities/UserAccount';
import { Pornstar } from '../entities/Pornstar';
import { PornstarTag } from '../entities/PornstarTag';
import { Resolver, Mutation, Arg, Query, Ctx, UseMiddleware, } from 'type-graphql';
import AppDataSource from '../config/db';
import NewPornstarInput from '../inputClasses/NewPornstarInput';
//import PornstarTagInput from '../inputClasses/PornstarTagInput';
import { MyContext } from '../index';
import { GraphQLError } from 'graphql';
import { EditPornstarInput } from '../inputClasses/EditPornstarInput';
import DeletePornstarInput from '../inputClasses/DeletePornstarInput';
import { GetPornstarInput } from '../inputClasses/GetPornstarInput';
import { PornstarLink } from '../entities/PornstarLink';
import PornstarLinkInput from '../inputClasses/PornstarLinkInput';
import { PornstarWithTagsAndLinks } from '../returnTypes/PornstarWithTagsAndLinks';
import { PornstarWithTags } from '../returnTypes/PornstarWithTags';
import { S3UrlOrNull } from '../returnTypes/S3UrlOrNull';
import { UserTag } from '../entities/UserTag';
import { EditPornstarReturn } from '../returnTypes/EditPornstarReturn';
import { isAuth } from "../middleware/isAuth";
import { createPresignedUrlWithClient, deleteObjectWithClient } from '../config/s3';
import { v4 as uuidv4 } from 'uuid';
import {rateLimit} from "../middleware/rateLimit"

@Resolver(Pornstar)
export class PornstarResolver {
  @Mutation(() => S3UrlOrNull)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5))
  async addPornstar(
    @Arg('newPornstarInput') newPornstarInput: NewPornstarInput,
    @Ctx() { req }: MyContext
  ): Promise<S3UrlOrNull> {
    try {
      console.log('wat',newPornstarInput)
      // check if user bypass the frontend or just double checking
      const userRepository = AppDataSource.getRepository(UserAccount);
      console.log("add",req.session.userId)
      const user = await userRepository.findOne({
        where: {
          user_id: req.session.userId,
        },
        //user_id: req.session.userId,
        relations: ["pornstars","subscriptions"]
      },
      );
      console.log(user)
      if(!user) {
        throw new GraphQLError('User is not found.', {
          extensions: {
            code: 'USER_NOT_FOUND',
          },
        });
      }
      console.log(user.subscriptions.length)
      console.log("here")
      console.log(user.pornstars.length)
      if(user.subscriptions.length == 0 && user.pornstars.length >= 25)
      {
        throw new GraphQLError('Too much.', {
          extensions: {
            code: 'USER_NOT_FOUND',
          },
        });
      }
      else if(user.subscriptions.length > 0)
      {
        if((user.subscriptions[user.subscriptions.length - 1].subscription_end_date > new Date()) && user.pornstars.length >= 1000)
        {
          throw new GraphQLError('Too much.', {
            extensions: {
              code: 'USER_NOT_FOUND',
            },
          });
        }
      }
      const pornstarRepository = AppDataSource.getRepository(Pornstar);

      const pornstar = new Pornstar();

      pornstar.pornstar_name = newPornstarInput.pornstar_name;
      // generate new id with each call
      const id = uuidv4();
      var url = '';
      if (newPornstarInput.pornstar_picture) {
        url = await createPresignedUrlWithClient({ key: id });

        //pornstar.pornstar_picture_path = url.split('?')[0];
        pornstar.pornstar_picture_path = "https://pub-f8c29b76b6bc4836aac4b8dabb8b6b25.r2.dev/" + id
      }

      pornstar.user = user;

      const savePornstar = await pornstarRepository.save(pornstar);

      // omg we actually need the pornstar id, the await finally came into play.
      if (newPornstarInput.pornstar_tags_obj) {
        // type checks the string and make sure this is in the correct format
        let rowArray: any[] = [];
        for (let i = 0; i < newPornstarInput.pornstar_tags_obj.length; i++) {
          // need to typedef this, so easy to make typo, gotta be consistent

          const userTagRepository = AppDataSource.getRepository(UserTag);

          // think we need a where with session && check statement
          const userTag = await userTagRepository.findOneBy({
            user_tag_id: newPornstarInput.pornstar_tags_obj[i].user_tag.user_tag_id,
          });
          if (!userTag) {
            throw new GraphQLError('Pornstar not found.', {
              extensions: {
                code: 'PORNSTAR_NOT_FOUND',
              },
            });
          }

          rowArray[i] = {
            pornstar: savePornstar,
            tag_text: newPornstarInput.pornstar_tags_obj[i].tag_text,
            user_tag: userTag
          };
        }

        await AppDataSource.createQueryBuilder()
          .insert()
          .into(PornstarTag)
          .values(rowArray)
          .execute();
      }

      if (newPornstarInput.pornstar_links_title_url) {
        // type checks the string and make sure this is in the correct format
        let rowArray: PornstarLinkInput[] = [];
        for (let i = 0; i < newPornstarInput.pornstar_links_title_url.length; i++) {
          // need to typedef this, so easy to make typo, gotta be consistent
          rowArray[i] = {
            pornstar: savePornstar,
            pornstar_link_title:
              newPornstarInput.pornstar_links_title_url[i].pornstar_link_title,
            pornstar_link_url:
              newPornstarInput.pornstar_links_title_url[i].pornstar_link_url,
          };
        }

        await AppDataSource.createQueryBuilder()
          .insert()
          .into(PornstarLink)
          .values(rowArray)
          .execute();
      }
      console.log("this is saved ps", savePornstar)

      return {
        s3Url: url,
        pornstar_id: savePornstar.pornstar_id
      };
    } catch (err) {
      console.log(err);
      return err;
    }
  }

  // EZ CLAP
  @Query(() => [Pornstar])
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5))
  async getAllPornstars(@Ctx() { req }: MyContext): Promise<Pornstar[]> {
    console.log(req == null)
    const userRepository = AppDataSource.getRepository(UserAccount);
    const user = await userRepository.findOne({
      where: {
        //user_id: req.session.userId,
        user_id: 58
      },
      //user_id: req.session.userId,
      relations: ["pornstars"]
    });
    console.log(user)
    if(!user) {
      throw new GraphQLError('User is not found.', {
        extensions: {
          code: 'USER_NOT_FOUND',
        },
      });
    }
    console.log('im in get all pornstars');
    return user.pornstars;
  }

  // need to return pornstar type with tags and links too
  @Query(() => PornstarWithTagsAndLinks)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5))
  async getPornstar(
    @Arg('getPornstarInput') getPornstarInput: GetPornstarInput
  ): Promise<PornstarWithTagsAndLinks> {
    const pornstarRepository = AppDataSource.getRepository(Pornstar);

    const pornstar = await pornstarRepository.findOne({
      where: {
        pornstar_id: getPornstarInput.pornstar_id,
      },
      //user_id: req.session.userId,
      relations: ["pornstar_tags","pornstar_tags.user_tag","pornstar_links"]
    })
    if(!pornstar) {
      throw new GraphQLError('User is not found.', {
        extensions: {
          code: 'USER_NOT_FOUND',
        },
      });
    }
    console.log("getpornstar got triggered")
    console.log(pornstar)
    /*
      return {
        pornstar: pornstar,
        tags: pornstarTags,
        links: pornstarLinks
      };
      */
      return pornstar;
    }
  /*
  @Query(() => [PornstarTag])
  async getAllPornstarTags(@Ctx() { req }: MyContext): Promise<PornstarTag[]> {
    console.log('heybbb');
    const pornstarTagsRepository = AppDataSource.getRepository(PornstarTag);
    const userRepository = AppDataSource.getRepository(UserAccount);
    const user = await userRepository.findOneBy({
      user_id: req.session.userId,
    });
    let pornstarTags = null;
    if (user != null) {
      pornstarTags = await pornstarTagsRepository.find({
        where: {
          user: user,
        },
        // Include the 'pornstar' relation
        relations: ['pornstar'],
        // return results with tag id from oldest to newest
        order: {
          tag_id: 'ASC',
        },
      });
    } else {
      throw new GraphQLError('User is not found.', {
        extensions: {
          code: 'USER_NOT_FOUND',
        },
      });
    }
    return pornstarTags;
  }
  */

  // return both in an object
  @Query(() => [PornstarWithTags])
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5))
  async getAllPornstarsAndTags(@Ctx() { req }: MyContext): Promise<PornstarWithTags[]> {
    console.log('heybbb im in getall',req === null);
    console.log(req.session.userId)
    const userRepository = AppDataSource.getRepository(UserAccount);
    const user = await userRepository.findOne({
      where: {
        user_id: req.session.userId
        //user_id: 58
      },
      //user_id: req.session.userId,
      relations: ["pornstars","pornstars.pornstar_tags"]
    },
    );
    if(!user) {
      throw new GraphQLError('Pornstar is not found.', {
        extensions: {
          code: 'PORNSTAR_NOT_FOUND',
        },
      });
    }
    const restructuredPornstars : PornstarWithTags[] = user.pornstars.map(pornstar => ({
      pornstar_id: pornstar.pornstar_id,
      pornstar_name: pornstar.pornstar_name,
      pornstar_picture_path: pornstar.pornstar_picture_path,
      pornstar_tags_text: pornstar.pornstar_tags.map(pornstar_tag => pornstar_tag.tag_text) // Extracting only recipe names
    }));
    console.log("im in getall pornstar and tags")
    return restructuredPornstars;
  }


  @Mutation(() => EditPornstarReturn)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5))
  async editPornstar(
    @Arg('editPornstarInput') editPornstarInput: EditPornstarInput,
    @Ctx() { req }: MyContext
  ): Promise<EditPornstarReturn> {
    try {
      const pornstarRepository = AppDataSource.getRepository(Pornstar);
      const pornstar = await pornstarRepository.findOneBy({
        pornstar_id: editPornstarInput.pornstar_id,
      });
      if (!pornstar) {
        throw new GraphQLError('Pornstar not found.', {
          extensions: {
            code: 'PORNSTAR_NOT_FOUND',
          },
        });
      }
      //console.log("inputedit", editPornstarInput)
      pornstar.pornstar_name = editPornstarInput.pornstar_name;
      // generate new id with each call
      const id = uuidv4();
      var url = '';

      if (
        !editPornstarInput.imageUpdate.didChange &&
        !editPornstarInput.imageUpdate.didDelete
      ) {
        console.log('no change!');
      } else if (
        editPornstarInput.imageUpdate.didDelete &&
        !editPornstarInput.pornstar_picture
      ) {
        if (pornstar.pornstar_picture_path) {
          const parts = pornstar.pornstar_picture_path.split('/');
          const objectKey = parts[parts.length - 1];
          await deleteObjectWithClient({ key: objectKey });
        }
        pornstar.pornstar_picture_path = '';
        //delete pornstar.pornstar_picture_path;
        console.log('i got trigggered');
        // logic to delete picture from s3
      }
      // this works but the user has to update the cache.
      else if (
        pornstar.pornstar_picture_path &&
        editPornstarInput.imageUpdate.didChange
      ) {
        const parts = pornstar.pornstar_picture_path.split('/');
        const objectKey = parts[parts.length - 1];

        // check and remove extra key after ?
        const updatedKey = objectKey.split('?')[0]
        url = await createPresignedUrlWithClient({
          key: updatedKey,
        });
        console.log(parts)
        console.log(pornstar.pornstar_picture_path.split('?'))
        console.log('in edit');
        console.log("url",url)
        console.log(url.split('?')[0]);
        console.log(pornstar.pornstar_picture_path);
        //pornstar.pornstar_picture_path = url.split('?')[0] + "?" + id;
        pornstar.pornstar_picture_path = "https://pub-f8c29b76b6bc4836aac4b8dabb8b6b25.r2.dev/" + updatedKey + "?" + id;
      } else {
        url = await createPresignedUrlWithClient({ key: id });
        pornstar.pornstar_picture_path = "https://pub-f8c29b76b6bc4836aac4b8dabb8b6b25.r2.dev/" + id;
      }

      console.log(!req)
      const userRepository = AppDataSource.getRepository(UserAccount);
      const user = await userRepository.findOneBy({
        user_id: req.session.userId,
        //user_id: 58,
      });
      if (user == null) {
        throw new GraphQLError('User not found.', {
          extensions: {
            code: 'USER_NOT_FOUND',
          },
        });
      } else {
        pornstar.user = user;
      }
      const updatedPornstar = await pornstarRepository.save(pornstar);
      //console.log(pornstar);
      //console.log('in between');
      //console.log(updatedPornstar);

      // need a case if pornstar_tags is blank
      //console.log('checking tags');
      //console.log(editPornstarInput.pornstar_tags_obj);
      if (editPornstarInput.pornstar_tags_obj) {
        // type checks the string and make sure this is in the correct format
        let newTagEntities: any[] = [];
        const pornstarTagRepository = AppDataSource.getRepository(PornstarTag);
        const oldPornstarTags = await pornstarTagRepository.findBy({
          pornstar: pornstar,
        });
        const oldPornstarTagsText = oldPornstarTags.map((obj) => obj.tag_text);
        // text
        const newPornstarTags = editPornstarInput.pornstar_tags_obj;

        const elementsToRemove = oldPornstarTags.filter(
          (element) => !newPornstarTags.map((obj) => obj.tag_text).includes(element.tag_text)
        );
        const elementsToRemoveTagIds = elementsToRemove.map(
          (obj) => obj.tag_id
        );
        const elementsToAdd = newPornstarTags.filter(
          (element) => !oldPornstarTagsText.includes(element.tag_text)
        );

        if (elementsToRemove.length > 0) {
          await AppDataSource.createQueryBuilder()
            .delete()
            .from(PornstarTag)
            .where('tag_id IN (:...tags)', { tags: elementsToRemoveTagIds })
            .execute();
        }

        newTagEntities = elementsToAdd.map((tag) => ({
          pornstar: updatedPornstar,
          tag_text: tag.tag_text,
          user_tag: tag.user_tag
        }));

        await AppDataSource.createQueryBuilder()
          .insert()
          .into(PornstarTag)
          .values(newTagEntities)
          .execute();
      }

      //delete links
      if(editPornstarInput.pornstar_links_updates.deleted_links_ids)
      {
        if (editPornstarInput.pornstar_links_updates.deleted_links_ids.length > 0) {
          await AppDataSource.createQueryBuilder()
            .delete()
            .from(PornstarLink)
            .where('pornstar_link_id IN (:...ids)', { ids: editPornstarInput.pornstar_links_updates.deleted_links_ids })
            .execute();
        }
      }

      //edit links
      if(editPornstarInput.pornstar_links_updates.edited_links)
      {
        const pornstarLinkRepository = AppDataSource.getRepository(PornstarLink);
        let tempLink;
        let result;

        editPornstarInput.pornstar_links_updates.edited_links.forEach(async (link) => {
          tempLink = await pornstarLinkRepository.findOne({where: {pornstar_link_id:  link.pornstar_link_id},
            // Include the 'pornstar' relation
          relations: ["pornstar"]})
          if(!tempLink)
          {
            throw new GraphQLError('UserTag is not found.', {
              extensions: {
                code: 'USERTag_NOT_FOUND',
              },
            });
          }
          tempLink.pornstar_link_title = link.pornstar_link_title;
          tempLink.pornstar_link_url = link.pornstar_link_url;
          result = await pornstarLinkRepository.save(tempLink);
          console.log("resultttttt")
          console.log(result)
        })
      }

      //add new links
      //console.log("new links", editPornstarInput.pornstar_links_updates.new_links)
      //console.log(editPornstarInput)
      if(editPornstarInput.pornstar_links_updates.new_links)
      {
        let rowArray: PornstarLinkInput[] = [];
        for (let i = 0; i < editPornstarInput.pornstar_links_updates.new_links.length; i++) {
          // need to typedef this, so easy to make typo, gotta be consistent
          rowArray[i] = {
            pornstar: pornstar,
            pornstar_link_title:
            editPornstarInput.pornstar_links_updates.new_links[i].pornstar_link_title,
            pornstar_link_url:
            editPornstarInput.pornstar_links_updates.new_links[i].pornstar_link_url,
          };
        }

        await AppDataSource.createQueryBuilder()
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
        relations: ["pornstar_tags","pornstar_tags.user_tag","pornstar_links"]
      })
      if (!updatedPornstarWithTagsAndLinks) {
        throw new GraphQLError('Pornstar not found.', {
          extensions: {
            code: 'PORNSTAR_NOT_FOUND',
          },
        });
      }
      console.log("hax", {
        s3Url: url,
        pornstar_id: updatedPornstar.pornstar_id,
        pornstar_picture_path: updatedPornstar.pornstar_picture_path,
        pornstar: updatedPornstarWithTagsAndLinks
      })
      return {
        s3Url: url,
        pornstar_id: updatedPornstar.pornstar_id,
        pornstar_picture_path: updatedPornstar.pornstar_picture_path,
      };
    } catch (err) {
      console.log(err);
      return err;
    }
  }


  //consider if we need the context req to check if user is actually hte user before doing this request
  // same thing for edit because i think anyone can delete or edit, need to verify them with req.session.user_id
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  @UseMiddleware(rateLimit(50, 60 * 5))
  async deletePornstar(
    @Arg('deletePornstarInput') deletePornstarInput: DeletePornstarInput
  ): Promise<boolean> {
    try {
      console.log("ta",deletePornstarInput)
      const pornstarRepository = AppDataSource.getRepository(Pornstar);

      const pornstar = await pornstarRepository.findOneBy({
        pornstar_id: deletePornstarInput.pornstar_id,
      });
      if (!pornstar) {
        throw new GraphQLError('Pornstar not found.', {
          extensions: {
            code: 'PORNSTAR_NOT_FOUND',
          },
        });
      }
      if (pornstar.pornstar_picture_path) {
        const parts = pornstar.pornstar_picture_path.split('/');
        const objectKey = parts[parts.length - 1];
        await deleteObjectWithClient({ key: objectKey });
      }

      await AppDataSource.createQueryBuilder()
        .delete()
        .from(PornstarTag)
        .where('pornstar_id = :pornstar_id', {
          pornstar_id: deletePornstarInput.pornstar_id,
        })
        .execute();

        await AppDataSource.createQueryBuilder()
        .delete()
        .from(PornstarLink)
        .where('pornstar_id = :pornstar_id', {
          pornstar_id: deletePornstarInput.pornstar_id,
        })
        .execute();

      await pornstarRepository.remove(pornstar);
      return true;
    } catch (err) {
      console.log(err);
      return err;
    }
  }
}
