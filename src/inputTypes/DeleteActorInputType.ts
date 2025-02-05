import {
  InputType,
  Field
} from "type-graphql";
import Actor from "../entities/Actor";
import { MaxLength } from "class-validator";

// i want to see how this implements work if i put something wrong or different
@InputType({ description: "delete actor data" })
export default class DeleteActorInputType implements Partial<Actor>{
  @Field()
  @MaxLength(100, {
    message: 'Url slug cannot be more than 50 characters',
  })
  actor_url_slug: string;
}