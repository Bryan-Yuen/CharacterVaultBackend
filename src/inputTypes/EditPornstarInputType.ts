import { InputType, Field } from "type-graphql";
import Pornstar from "../entities/Pornstar";
import { MaxLength, MinLength } from "class-validator";

@InputType()
class ImageUpdates {
  @Field()
  didChange: boolean;

  @Field()
  didDelete: boolean;
}

@InputType()
class EditPornstarLinkObj {
  @Field()
  pornstar_link_id: number;

  @Field()
  @MaxLength(255, {
    message: 'title is more than 255 characters',
  })
  pornstar_link_title: string;

  @Field()
  @MaxLength(255, {
    message: 'url is more than 255 characters',
  })
  pornstar_link_url: string;
}

@InputType()
class LinkUpdates {
  @Field(() => [EditPornstarLinkObj])
  edited_links: EditPornstarLinkObj[];

  @Field(() => [Number])
  deleted_links_ids?: number[];

  @Field(() => [EditPornstarLinkObj])
  new_links: EditPornstarLinkObj[];
}

@InputType({ description: "update pornstar data" })
export default class EditPornstarInputType implements Partial<Pornstar> {
  @Field()
  @MinLength(1, {
    message: 'Name cannot be blank',
  })
  @MaxLength(50, {
    message: 'Name cannot be more than 50 characters',
  })
  pornstar_name: string;

  @Field()
  pornstar_picture: boolean;

  // need to validate this
  @Field(() => [String])
  pornstar_tags_text?: string[];

  @Field()
  @MaxLength(100, {
    message: 'Url slug cannot be more than 50 characters',
  })
  pornstar_url_slug: string;

  @Field(() => ImageUpdates)
  imageUpdate: ImageUpdates;

  @Field(() => LinkUpdates)
  pornstar_links_updates: LinkUpdates;
}