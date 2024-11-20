import {
  InputType,
  Field,
} from "type-graphql";
import { MaxLength, MinLength } from "class-validator";
import Pornstar from "../entities/Pornstar";
import PornstarTag from "../entities/PornstarTag";

// i want to see how this implements work if i put something wrong or different
@InputType({ description: "new user tag" })
export default class PornstarTagInput implements Partial<PornstarTag >{
  @Field()
  @MinLength(1, {
    message: "Tag cannot be blank.",
  })
  @MaxLength(50, {
    message: "Tag cannot be more than 50 characters",
  })
  tag_text: string;

  @Field(() => Pornstar)
  pornstar: Pornstar;
}