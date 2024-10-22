import { ObjectType, Field } from "type-graphql";
import { Pornstar } from "../entities/Pornstar";
import { PornstarTag } from "../entities/PornstarTag";
import { PornstarLink } from "../entities/PornstarLink";

@ObjectType()
export class PornstarWithTagsAndLinks extends Pornstar {
    @Field(() => [PornstarTag])
    pornstar_tags: PornstarTag[];

    @Field(() => [PornstarLink])
    pornstar_links: PornstarLink[];

}