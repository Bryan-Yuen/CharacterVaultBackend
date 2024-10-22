import { ObjectType, Field } from "type-graphql";

@ObjectType()
export class AddPornstarReturn {
    // considering doing a return string or null but will do empty string
    @Field()
    s3Url: string

    @Field()
    pornstar_id: number

    @Field({nullable: true})
    pornstar_picture_path?: string
}