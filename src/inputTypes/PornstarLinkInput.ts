import {
  InputType,
  Field,
} from "type-graphql";
import { MaxLength } from "class-validator";
import Pornstar  from "../entities/Pornstar";
import PornstarLink from "../entities/PornstarLink";

// i want to see how this implements work if i put something wrong or different
@InputType({ description: "new user tag" })
export default class PornstarLinkInput implements Partial<PornstarLink >{
  @Field()
  @MaxLength(100, {
    message: 'Title is longer than 100 characters',
  })
  pornstar_link_title: string;

  @Field()
  @MaxLength(255, {
    message: 'Url is longer than 255 characters',
  })
  pornstar_link_url: string;

  @Field(() => Pornstar)
  pornstar: Pornstar;
}