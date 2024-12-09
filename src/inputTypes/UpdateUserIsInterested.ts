import { InputType, Field } from "type-graphql";
import UserAccount from "../entities/UserAccount";

@InputType({ description: "Register User data" })
export default class UpdateUserIsInterestedInputType
  implements Partial<UserAccount>
{
  @Field()
  user_is_interested: boolean;
}
