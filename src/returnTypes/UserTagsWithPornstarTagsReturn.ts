import { ObjectType, Field } from "type-graphql";
import PornstarTag from "../entities/PornstarTag";

@ObjectType()
export default class UserTagsWithPornstarTagsReturn {
  @Field()
  user_tag_id: number;

  @Field()
  user_tag_text: string;

  @Field(() => [PornstarTag])
  pornstar_tags: PornstarTag[];
}
