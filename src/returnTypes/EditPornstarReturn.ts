import { ObjectType, Field } from "type-graphql";

@ObjectType()
export default class EditPornstarReturn{
    // considering doing a return string or null but will do empty string
    // encrypted s3 url
    @Field()
    secured_data: string

    @Field({nullable: true})
    pornstar_picture_path?: string
}