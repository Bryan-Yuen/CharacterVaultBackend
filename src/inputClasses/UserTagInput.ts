import {
  InputType,
  Field,
} from "type-graphql";
import { MaxLength } from "class-validator";
import { UserTag } from "../entities/UserTag";

// i want to see how this implements work if i put something wrong or different
@InputType({ description: "new user tag" })
export default class UserTagInput implements Partial<UserTag >{
  @Field()
  @MaxLength(50, {
    message: 'name is more than 90 characters',
  })
  user_tag_text: string;
}