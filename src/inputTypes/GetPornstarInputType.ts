import { InputType, Field } from "type-graphql";
import Pornstar from "../entities/Pornstar";
import { MaxLength } from "class-validator";

@InputType({ description: "update pornstar data" })
export default class GetPornstarInputType implements Partial<Pornstar>{
  @Field()
  @MaxLength(100, {
    message: 'Url slug cannot be more than 50 characters',
  })
  pornstar_url_slug: string;
}