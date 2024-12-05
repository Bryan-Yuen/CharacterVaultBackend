import { InputType, Field } from "type-graphql";
import { MaxLength,  Matches } from "class-validator";
import UserAccount from "../entities/UserAccount";

@InputType({ description: "Register User data" })
export default class ResendVerificationEmailInputType
  implements Partial<UserAccount>
{
  @Field()
  @MaxLength(90, {
    message: "Email is more than 90 characters",
  })
  @Matches(/^\S+@\S+\.\S+$/, {
    message: "Invalid Email Format",
  })
  user_email: string;
}
