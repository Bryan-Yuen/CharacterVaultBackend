import { ObjectType, Field } from "type-graphql";
import { registerEnumType } from "type-graphql";
import { Subscription } from "../entities/Subscription";

/*
If you don't specify a table name using the @Entity() 
decorator or other configuration options, TypeORM will 
automatically generate a table name based on the entity 
class name by converting it to snake_case (e.g., MyEntity 
  class will be mapped to a table named 'my_entity').
  */

enum Subscription_Status {
  ACTIVE_SUBSCRIPTION = "ACTIVE_SUBSCRIPTION",
  NO_SUBSCRIPTION = "NO_SUBSCRIPTION",
  CANCELLING_SUBSCRIPTION = "CANCELLING_SUBSCRIPTION",
}

registerEnumType(Subscription_Status, {
    name: "Subscription_Status", // Mandatory
    description: "subscription states", // Optional
  });

@ObjectType()
export class SubscriptionInformation implements Partial<Subscription>{
  @Field(() => Subscription_Status)
  subscription_status: Subscription_Status;

  @Field()
  number_of_pornstars: number;

  @Field({nullable: true})
  subscription_next_billing_date?: Date;

  @Field({nullable: true})
  subscription_end_date?: Date;

  @Field({nullable: true})
  user_last_four_credit_card_number?: string;
}
