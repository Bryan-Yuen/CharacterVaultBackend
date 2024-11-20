import { InputType, Field } from "type-graphql";
import NewPornstarInput from "./NewPornstarInput";
import { MaxLength, MinLength } from "class-validator";

@InputType()
class ImageUpdates {
  @Field()
  didChange: boolean;

  @Field()
  didDelete: boolean;
}

/*
@InputType()
class NewPornstarLinkObj {
  @Field()
  @MaxLength(100, {
    message: 'name is more than 90 characters',
  })
  pornstar_link_title: string;

  @Field()
  @MaxLength(255, {
    message: 'name is more than 90 characters',
  })
  pornstar_link_url: string;
}
*/

@InputType()
class EditPornstarLinkObjBackend {
  @Field()
  pornstar_link_id: number;

  @Field()
  @MaxLength(100, {
    message: 'name is more than 90 characters',
  })
  pornstar_link_title: string;

  @Field()
  @MaxLength(255, {
    message: 'name is more than 90 characters',
  })
  pornstar_link_url: string;
}

// i'll probably make a type folder called input types so i don't have to use different names
@InputType()
class UserTagIdEdit {
  @Field()
   user_tag_id: number;

}

@InputType()
class ModifiedPornstarTagEdit {
  @Field()
  tag_text: string

  @Field(() => UserTagIdEdit)
  user_tag: UserTagIdEdit
}

@InputType()
class LinkUpdates {
  @Field(() => [EditPornstarLinkObjBackend])
  edited_links: EditPornstarLinkObjBackend[];

  @Field(() => [Number])
  deleted_links_ids?: number[];

  @Field(() => [EditPornstarLinkObjBackend])
  new_links: EditPornstarLinkObjBackend[];
}

@InputType({ description: "update pornstar data" })
export default class EditPornstarInput implements Partial<NewPornstarInput> {
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

  @Field(() => [ModifiedPornstarTagEdit])
  pornstar_tags_obj?: ModifiedPornstarTagEdit[];

  @Field()
  pornstar_id: number;

  @Field(() => ImageUpdates)
  imageUpdate: ImageUpdates;

  @Field(() => LinkUpdates)
  pornstar_links_updates: LinkUpdates;
}