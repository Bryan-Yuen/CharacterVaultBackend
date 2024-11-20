import { ObjectType, Field } from "type-graphql";
import  UserTag  from "../entities/UserTag";
import  PornstarTag  from "../entities/PornstarTag";

@ObjectType()
export default class UserTagWithPornstarTagTest extends UserTag {
    @Field(() => [PornstarTag])
    pornstar_tags: PornstarTag[];
}