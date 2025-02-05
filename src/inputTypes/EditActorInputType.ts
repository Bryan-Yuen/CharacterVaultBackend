import { InputType, Field } from "type-graphql";
import Actor from "../entities/Actor";
import { MaxLength, MinLength } from "class-validator";

@InputType()
class ImageUpdates {
  @Field()
  didChange: boolean;

  @Field()
  didDelete: boolean;
}

@InputType()
class EditActorLinkObj {
  @Field()
  actor_link_id: number;

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

@InputType()
class LinkUpdates {
  @Field(() => [EditActorLinkObj])
  edited_links: EditActorLinkObj[];

  @Field(() => [Number])
  deleted_links_ids?: number[];

  @Field(() => [EditActorLinkObj])
  new_links: EditActorLinkObj[];
}

@InputType({ description: "update actor data" })
export default class EditActorInputType implements Partial<Actor> {
  @Field()
  @MinLength(1, {
    message: 'Name cannot be blank',
  })
  @MaxLength(50, {
    message: 'Name cannot be more than 50 characters',
  })
  actor_name: string;

  @Field()
  actor_picture: boolean;

  // need to validate this
  @Field(() => [String])
  actor_tags_text?: string[];

  @Field()
  @MaxLength(100, {
    message: 'Url slug cannot be more than 50 characters',
  })
  actor_url_slug: string;

  @Field(() => ImageUpdates)
  imageUpdate: ImageUpdates;

  @Field(() => LinkUpdates)
  actor_links_updates: LinkUpdates;
}