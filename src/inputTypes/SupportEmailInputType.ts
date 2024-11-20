import { InputType, Field } from "type-graphql";
import { MinLength, MaxLength} from "class-validator";

@InputType({ description: "contact email input" })
export default class SupportEmailInputType {
  @Field()
  @MinLength(1, {
    message: "Subject cannot be blank",
  })
  @MaxLength(100, {
    message: "Subject cannot be more than 100 characters",
  })
  form_subject: string;

  @Field()
  @MinLength(1, {
    message: "Message cannot be blank",
  })
  @MaxLength(1000, {
    message: "Message cannot be more than 1000 characters",
  })
  form_message: string;
}
