import { ObjectType, Field } from "type-graphql";

@ObjectType()
export default class EditActorReturn{
    // considering doing a return string or null but will do empty string
    // encrypted s3 url
    @Field()
    secured_data: string

    @Field({nullable: true})
    actor_picture_path?: string
}