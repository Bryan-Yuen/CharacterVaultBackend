import {
  InputType,
  Field
} from "type-graphql";
import { MaxLength, MinLength, Matches } from "class-validator";
import UserAccount from "../entities/UserAccount";

// if the input doesnt satisfy these conditions return error to user, no need to query database.
@InputType({ description: "Login User data" })
export default class LoginUserInputType implements Partial<UserAccount>{
  @Field()
  @MaxLength(90, {
    message: 'Email is more than 90 characters',
  })
  @Matches(/^\S+@\S+\.\S+$/, {
    message: 'Invalid Email Format',
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