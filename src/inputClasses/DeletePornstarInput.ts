import {
  InputType,
  Field
} from "type-graphql";
import { Pornstar } from "../entities/Pornstar";

// i want to see how this implements work if i put something wrong or different
@InputType({ description: "delete pornstar data" })
export default class DeletePornstarInput implements Partial<Pornstar>{
  @Field()
  pornstar_id: number;
}