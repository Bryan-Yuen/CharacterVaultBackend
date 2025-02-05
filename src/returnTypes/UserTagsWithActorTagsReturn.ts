import { ObjectType, Field } from "type-graphql";
import ActorTag from "../entities/ActorTag";

@ObjectType()
export default class UserTagsWithActorTagsReturn {
  @Field()
  user_tag_id: number;

  @Field()
  user_tag_text: string;

  @Field(() => [ActorTag])
  actor_tags: ActorTag[];
}
