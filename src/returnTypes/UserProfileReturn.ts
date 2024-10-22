import { ObjectType, Field } from "type-graphql";
import { UserAccount } from "../entities/UserAccount";

@ObjectType()
export class UserProfileReturn implements Partial<UserAccount>{
  @Field()
    user_username: string;

    @Field()
    user_email: string;
}