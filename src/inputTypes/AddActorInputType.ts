import {
  InputType,
  Field
} from "type-graphql";
import { MinLength, MaxLength } from "class-validator";
import Actor from "../entities/Actor";

@InputType()
class ActorLinkObj {
  @Field()
  @MaxLength(255, {
    message: 'title is more than 255 characters',
  })
  actor_link_title: string;

  @Field()
  @MaxLength(255, {
    message: 'url is more than 255 characters',
  })
  actor_link_url: string;
}

@InputType({ description: "new actor data" })
export default class AddActorInputType implements Partial<Actor>{
  @Field()
  @MinLength(1, {
    message: 'Name cannot be blank',
  })
  @MaxLength(50, {
    message: 'Name cannot be more than 50 characters',
  })
  actor_name: string;

  // true means they want to upload a picture, false means they have no picture
  @Field()
  actor_picture: boolean;

 
  @Field(() => [String])
  actor_tags_text?: string[];

 /*
  @Field(() => [ModifiedactorTag])
  actor_tags_obj?: ModifiedactorTag[];
  */

  @Field(() => [ActorLinkObj])
  actor_links_title_url?: ActorLinkObj[];
}