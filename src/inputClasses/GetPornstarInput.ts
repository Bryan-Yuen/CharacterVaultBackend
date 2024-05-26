import { InputType, Field } from "type-graphql";
import { Pornstar } from "../entities/Pornstar";

@InputType({ description: "update pornstar data" })
export class GetPornstarInput implements Partial<Pornstar>{
  @Field()
  pornstar_id: number;
}