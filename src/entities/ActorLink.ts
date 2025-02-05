import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ObjectType, Field } from "type-graphql";
import Actor from "./Actor";

/*
If you don't specify a table name using the @Entity() 
decorator or other configuration options, TypeORM will 
automatically generate a table name based on the entity 
class name by converting it to snake_case (e.g., MyEntity 
  class will be mapped to a table named 'my_entity').
  */
@ObjectType()
@Entity()
export default class ActorLink {
  @Field()
  @PrimaryGeneratedColumn()
  actor_link_id: number;

  @Field({ nullable: true })
  @Column({ length: 100, nullable: true })
  actor_link_title?: string;

  @Field({ nullable: true })
  @Column({ length: 255, nullable: true })
  actor_link_url?: string;

  @Field(() => Actor)
  @ManyToOne(() => Actor, (actor) => actor.actor_links)
  @JoinColumn({ name: "actor_id" })
  actor: Actor;
}
