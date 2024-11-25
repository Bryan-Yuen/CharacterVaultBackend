import { InputType, Field } from "type-graphql";
import Pornstar from "../entities/Pornstar";

@InputType({ description: "update pornstar data" })
export default class GetPornstarInputType implements Partial<Pornstar>{
  @Field()
  pornstar_id: number;
}