import { InputType, Field } from "type-graphql";
import { Length, MaxLength, Matches } from "class-validator";

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
  @Length(1, 1000, {
    message: "Message is blank or more than 1000 characters",
  })
  form_message: string;
}
