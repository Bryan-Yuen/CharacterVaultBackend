import { InputType, Field } from "type-graphql";
import { MaxLength,  MinLength } from "class-validator";

@InputType({ description: "Register User data" })
export default class ConfirmEmailAddressInputType
{
  @Field()
  @MinLength(1, {
    message: "Token cannot be blank.",
  })
  @MaxLength(100, {
    message: "Token is more than 100 characters",
  })
  token: string;

}
