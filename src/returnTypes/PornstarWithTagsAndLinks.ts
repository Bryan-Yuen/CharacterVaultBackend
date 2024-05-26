import { ObjectType, Field } from "type-graphql";
import { Pornstar } from "../entities/Pornstar";
import { PornstarTag } from "../entities/PornstarTag";
import { PornstarLink } from "../entities/PornstarLink";

/*
If you don't specify a table name using the @Entity() 
decorator or other configuration options, TypeORM will 
automatically generate a table name based on the entity 
class name by converting it to snake_case (e.g., MyEntity 
  class will be mapped to a table named 'my_entity').
  */
@ObjectType()
export class PornstarWithTagsAndLinks extends Pornstar {
    @Field(() => [PornstarTag])
    pornstar_tags: PornstarTag[];

    @Field(() => [PornstarLink])
    pornstar_links: PornstarLink[];

}