import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ObjectType, Field } from "type-graphql";
import Actor from "./Actor";
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
export default class ActorTag {
  @Field()
  @PrimaryGeneratedColumn()
  actor_tag_id: number;

  @Field()
  @Column({ length: 50 })
  actor_tag_text: string;

  @Field(() => Actor)
  @ManyToOne(() => Actor, (actor) => actor.actor_tags)
  @JoinColumn({ name: "actor_id" })
  actor: Actor;

  @Field(() => UserTag)
  @ManyToOne(() => UserTag, (user_tag) => user_tag.actor_tags)
  @JoinColumn({ name: "user_tag_id" })
  user_tag: UserTag;
}
