import {
  InputType,
  Field
} from "type-graphql";
import { MaxLength, MinLength, Matches } from "class-validator";

// I'm keeping these safeguards in place because, we will not even waste a query to the database
// if the input don't even satisfy these conditions
@InputType({ description: "Login User data" })
export default class LoginUserInput {
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