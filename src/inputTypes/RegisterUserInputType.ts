import { InputType, Field } from "type-graphql";
import { MaxLength, MinLength, Matches } from "class-validator";
import UserAccount from "../entities/UserAccount";

@InputType({ description: "Register User data" })
export default class RegisterUserInputType
  implements Partial<UserAccount>
{
  @Field()
  @MinLength(4, {
    message: "Username is less than 4 characters",
  })
  @MaxLength(40, {
    message: "Username cannot be more than 40 characters",
  })
  @Matches(/^[a-z0-9]+$/i, {
    message: "Special characters in username not allowed",
  })
  user_username: string;

  @Field()
  @MaxLength(90, {
    message: "Email is more than 90 characters",
  })
  @Matches(/^\S+@\S+\.\S+$/, {
    message: "Invalid Email Format",
  })
  user_email: string;

  @Field()
  @MinLength(6, {
    message: "Password is less than 6 characters",
  })
  @MaxLength(64, {
    message: "Password cannot be more than 64 characters",
  })
  user_password: string;
}
