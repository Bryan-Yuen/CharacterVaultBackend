import { InputType, Field } from "type-graphql";
import Actor from "../entities/Actor";
import { MaxLength } from "class-validator";

@InputType({ description: "update actor data" })
export default class GetActorInputType implements Partial<Actor>{
  @Field()
  @MaxLength(100, {
    message: 'Url slug cannot be more than 50 characters',
  })
  actor_url_slug: string;
}