import { ObjectType, Field } from "type-graphql";
//import { Pornstar } from "../entities/Pornstar";
//import { PornstarTag } from "../entities/PornstarTag";

/*
If you don't specify a table name using the @Entity() 
decorator or other configuration options, TypeORM will 
automatically generate a table name based on the entity 
class name by converting it to snake_case (e.g., MyEntity 
  class will be mapped to a table named 'my_entity').
  */
@ObjectType()
export class PornstarWithTags {
  @Field()
    pornstar_id: number;

    @Field()
    pornstar_name: string;

    /*
    @Field({nullable: true})
    @Column({length: 90, nullable: true})
    pornstar_picture_path: string | null;
    */
    @Field({nullable: true})
    pornstar_picture_path?: string;

    @Field(() => [String])
    pornstar_tags_text: string[];
}