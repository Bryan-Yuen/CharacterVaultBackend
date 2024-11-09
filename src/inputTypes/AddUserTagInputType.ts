import { InputType, Field } from "type-graphql";
import { Length, Matches } from "class-validator";
import { UserTag } from "../entities/UserTag";

// i want to see how this implements work if i put something wrong or different
@InputType({ description: "new user tag" })
export default class AddUserTagInputType implements Partial<UserTag> {
  @Field()
  @Length(1, 50, {
    message: "Tag is blank or more than 50 characters",
  })
  @Matches(/^[a-z]+$/, {
    message: "Lowercase only.",
  })
  user_tag_text: string;
}
