import {
  InputType,
  Field
} from "type-graphql";
import { MinLength, MaxLength } from "class-validator";
import Pornstar from "../entities/Pornstar";

@InputType()
class PornstarLinkObj {
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

@InputType({ description: "new pornstar data" })
export default class AddPornstarInputType implements Partial<Pornstar>{
  @Field()
  @MinLength(1, {
    message: 'Name cannot be blank',
  })
  @MaxLength(50, {
    message: 'Name cannot be more than 50 characters',
  })
  pornstar_name: string;

  // true means they want to upload a picture, false means they have no picture
  @Field()
  pornstar_picture: boolean;

 
  @Field(() => [String])
  pornstar_tags_text?: string[];

 /*
  @Field(() => [ModifiedPornstarTag])
  pornstar_tags_obj?: ModifiedPornstarTag[];
  */

  @Field(() => [PornstarLinkObj])
  pornstar_links_title_url?: PornstarLinkObj[];
}