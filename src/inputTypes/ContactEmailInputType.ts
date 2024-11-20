import { InputType, Field } from "type-graphql";
import { MinLength, MaxLength, Matches } from "class-validator";

@InputType({ description: "contact email input" })
export default class ContactEmailInputType {
  @Field()
  @MaxLength(90, {
    message: 'Email is more than 90 characters',
  })
  @Matches(/^\S+@\S+\.\S+$/, {
    message: 'Invalid Email Format',
  })
  form_email: string;

  @Field()
  @MinLength(1, {
    message: "Message cannot be blank",
  })
  @MaxLength(1000, {
    message: "Message cannot be more than 1000 characters",
  })
  form_message: string;
}
