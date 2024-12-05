import { ObjectType, Field } from "type-graphql";

@ObjectType()
export default class EditUserTagReturn {
    // considering doing a return string or null but will do empty string
    @Field()
    user_tag_id: number;
}