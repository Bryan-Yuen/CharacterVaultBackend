import {
  InputType,
  Field,
} from "type-graphql";
import { UserTag } from "../entities/UserTag";

// i want to see how this implements work if i put something wrong or different
@InputType({ description: "delete user tag" })
export default class DeleteUserTagInput implements Partial<UserTag >{
  @Field()
  user_tag_id: number;
}