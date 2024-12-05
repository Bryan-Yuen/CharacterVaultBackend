import {
  InputType,
  Field
} from "type-graphql";
import Pornstar from "../entities/Pornstar";
import { MaxLength } from "class-validator";

// i want to see how this implements work if i put something wrong or different
@InputType({ description: "delete pornstar data" })
export default class DeletePornstarInputType implements Partial<Pornstar>{
  @Field()
  @MaxLength(100, {
    message: 'Url slug cannot be more than 50 characters',
  })
  pornstar_url_slug: string;
}