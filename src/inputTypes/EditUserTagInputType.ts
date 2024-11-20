import {
  InputType,
  Field,
} from "type-graphql";
import { MaxLength, MinLength } from "class-validator";
import UserTag  from "../entities/UserTag";

// i want to see how this implements work if i put something wrong or different
@InputType({ description: "edit user tag" })
export default class EditUserTagInputType implements Partial<UserTag >{
  @Field()
  user_tag_id: number;

  @Field()
  @MinLength(1, {
    message: "Tag cannot be blank",
  })
  @MaxLength(50, {
    message: "Tag cannot be more than 50 characters",
  })
  user_tag_text: string;
}