import { ObjectType, Field } from "type-graphql";

@ObjectType()
export default class AddUserTagReturn {
    // considering doing a return string or null but will do empty string
    @Field()
    user_tag_id: number;
}