import { InputType, Field } from "type-graphql";
import { Length} from "class-validator";

@InputType({ description: "contact email input" })
export default class SupportEmailInputType {
  @Field()
  @Length(1, 100, {
    message: "Subject is blank or more than 100 characters",
  })
  form_subject: string;

  @Field()
  @Length(1, 1000, {
    message: "Message is blank or more than 1000 characters",
  })
  form_message: string;
}
