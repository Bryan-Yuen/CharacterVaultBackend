import {
  InputType,
  Field,
} from "type-graphql";
import { UserTag } from "../entities/UserTag";

// i want to see how this implements work if i put something wrong or different
@InputType({ description: "edit user tag" })
export default class EditUserTagInputType implements Partial<UserTag >{
  @Field()
  user_tag_id: number;

  @Field()
  user_tag_text: string;
}