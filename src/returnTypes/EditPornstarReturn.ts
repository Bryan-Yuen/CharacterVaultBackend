import { ObjectType, Field } from "type-graphql";
//import { Pornstar } from "../entities/Pornstar";
//import { PornstarWithTags } from "./PornstarWithTags";

/*
If you don't specify a table name using the @Entity() 
decorator or other configuration options, TypeORM will 
automatically generate a table name based on the entity 
class name by converting it to snake_case (e.g., MyEntity 
  class will be mapped to a table named 'my_entity').
  */
@ObjectType()
export class EditPornstarReturn {
    // considering doing a return string or null but will do empty string
    @Field()
    s3Url: string

    @Field()
    pornstar_id: number

    @Field({nullable: true})
    pornstar_picture_path?: string
}