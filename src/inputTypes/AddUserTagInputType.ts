import { InputType, Field } from "type-graphql";
import { Matches, MinLength, MaxLength } from "class-validator";
import UserTag from "../entities/UserTag";

// i want to see how this implements work if i put something wrong or different
@InputType({ description: "new user tag" })
export default class AddUserTagInputType implements Partial<UserTag> {
  @Field()
  @MinLength(1, {
    message: "Tag cannot be blank.",
  })
  @MaxLength(50, {
    message: "Tag cannot be more than 50 characters",
  })
  @Matches(/^[a-z]+$/, {
    message: "Lowercase only.",
  })
  user_tag_text: string;
}
