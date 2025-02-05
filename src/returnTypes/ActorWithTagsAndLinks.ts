import { ObjectType, Field } from "type-graphql";
import Actor from "../entities/Actor";
import ActorTag from "../entities/ActorTag";
import ActorLink from "../entities/ActorLink";

@ObjectType()
export default class ActorWithTagsAndLinks extends Actor {
  @Field(() => [ActorTag])
  actor_tags: ActorTag[];

  @Field(() => [ActorLink])
  actor_links: ActorLink[];
}
