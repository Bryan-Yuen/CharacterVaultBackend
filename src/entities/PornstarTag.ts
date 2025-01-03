import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ObjectType, Field } from "type-graphql";
import Pornstar from "./Pornstar";
import UserTag from "./UserTag";
/*
If you don't specify a table name using the @Entity() 
decorator or other configuration options, TypeORM will 
automatically generate a table name based on the entity 
class name by converting it to snake_case (e.g., MyEntity 
  class will be mapped to a table named 'my_entity').
  */
@ObjectType()
@Entity()
export default class PornstarTag {
  @Field()
  @PrimaryGeneratedColumn()
  pornstar_tag_id: number;

  @Field()
  @Column({ length: 50 })
  pornstar_tag_text: string;

  @Field(() => Pornstar)
  @ManyToOne(() => Pornstar, (pornstar) => pornstar.pornstar_tags)
  @JoinColumn({ name: "pornstar_id" })
  pornstar: Pornstar;

  @Field(() => UserTag)
  @ManyToOne(() => UserTag, (user_tag) => user_tag.pornstar_tags)
  @JoinColumn({ name: "user_tag_id" })
  user_tag: UserTag;
}
