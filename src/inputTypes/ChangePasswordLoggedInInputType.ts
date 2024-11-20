import { InputType, Field } from "type-graphql";
import { MinLength, MaxLength} from "class-validator";

@InputType({ description: "Register User data" })
export default class ChangePasswordLoggedInInputType
{
  @Field()
  @MinLength(6, {
    message: "Current password is less than 6 characters",
  })
  @MaxLength(64, {
    message: "Current password cannot be more than 64 characters",
  })
  current_password: string;

  @Field()
  @MinLength(6, {
    message: "New password is less than 6 characters",
  })
  @MaxLength(64, {
    message: "New password cannot be more than 64 characters",
  })
  new_password: string;
}
