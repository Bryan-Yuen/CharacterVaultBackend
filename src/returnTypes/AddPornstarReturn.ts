import { ObjectType, Field } from "type-graphql";

@ObjectType()
export default class AddPornstarReturn {
    // considering doing a return string or null but will do empty string
    @Field()
    s3Url: string

    @Field()
    pornstar_url_slug: string

    @Field({nullable: true})
    pornstar_picture_path?: string
}