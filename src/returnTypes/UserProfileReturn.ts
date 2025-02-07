import { ObjectType, Field } from "type-graphql";
import UserAccount from "../entities/UserAccount";

@ObjectType()
export default class UserProfileReturn implements Partial<UserAccount> {
  @Field()
  user_username: string;

  @Field()
  user_email: string;

  @Field()
  user_is_interested: boolean;

  @Field()
  user_is_premium: boolean;
}
