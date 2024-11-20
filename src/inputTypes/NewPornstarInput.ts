import {
  InputType,
  Field
} from "type-graphql";
import { MinLength, MaxLength } from "class-validator";
import Pornstar from "../entities/Pornstar";

@InputType()
class PornstarLinkObj {
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

@InputType()
class UserTagId {
  @Field()
   user_tag_id: number;

}

@InputType()
class ModifiedPornstarTag {
  @Field()
  tag_text: string

  @Field(() => UserTagId)
  user_tag: UserTagId
}

// i want to see how this implements work if i put something wrong or different
@InputType({ description: "new pornstar data" })
export default class NewPornstarInput implements Partial<Pornstar>{
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

  /*
  @Field(() => [String])
  pornstar_tags?: string[];
  */
  @Field(() => [ModifiedPornstarTag])
  pornstar_tags_obj?: ModifiedPornstarTag[];

  @Field(() => [PornstarLinkObj])
  pornstar_links_title_url?: PornstarLinkObj[];
}