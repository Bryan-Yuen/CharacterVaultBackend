import {
  InputType,
  Field
} from "type-graphql";
import { MaxLength, Matches } from "class-validator";
import UserAccount from "../entities/UserAccount";

// if the input doesnt satisfy these conditions return error to user, no need to query database.
@InputType({ description: "forget password data" })
export default class ForgotPasswordInputType implements Partial<UserAccount>{
  @Field()
  @MaxLength(90, {
    message: 'Email is more than 90 characters',
  })
  @Matches(/^\S+@\S+\.\S+$/, {
    message: 'Invalid Email Format',
  })
  user_email: string;
}