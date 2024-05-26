import {
  InputType,
  Field
} from "type-graphql";
import { MaxLength, MinLength, Length, Matches } from "class-validator";

@InputType({ description: "Register User data" })
export default class RegisterUserInput {
  @Field()
  @Length(4, 30, {
    message: 'Username is less than 4 characters or more than 30'
  })
  @Matches(/^[a-z0-9]+$/i, {
    message: 'Special characters in username not allowed',
  })
  user_username: string;

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
    message: 'Password is less than 6 characters',
  })
  user_password: string;
}