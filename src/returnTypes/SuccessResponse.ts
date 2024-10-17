import { ObjectType, Field } from "type-graphql";

@ObjectType()
export class SuccessResponse {
  @Field()
  message: string;

  @Field()
  success: boolean;
}