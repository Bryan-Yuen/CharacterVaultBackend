import { InputType, Field } from "type-graphql";
import { MaxLength, MinLength } from "class-validator";

@InputType({ description: "Register User data" })
export default class ChangePasswordInputType
{
  @Field()
  @MinLength(1, {
    message: "Token cannot be blank.",
  })
  @MaxLength(100, {
    message: "Token is more than 100 characters",
  })
  token: string;

  @Field()
  @MinLength(6, {
    message: "Password is less than 6 characters",
  })
  @MaxLength(64, {
    message: "Password cannot be more than 64 characters",
  })
  new_password: string;
}
