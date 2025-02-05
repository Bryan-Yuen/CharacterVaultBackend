import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { ObjectType, Field } from "type-graphql";
import UserAccount from "./UserAccount";
import ActorTag from "./ActorTag";
import ActorLink from "./ActorLink";

/*
If you don't specify a table name using the @Entity() 
decorator or other configuration options, TypeORM will 
automatically generate a table name based on the entity 
class name by converting it to snake_case (e.g., MyEntity 
  class will be mapped to a table named 'my_entity').
  */
@ObjectType()
@Entity()
export default class Actor {
  @Field()
  @PrimaryGeneratedColumn()
  actor_id: number;

  @Field()
  @Column({ length: 50 })
  actor_name: string;

  @Field({ nullable: true })
  @Column({ length: 90, nullable: true })
  actor_picture_path?: string;

  @Field()
  @Column({ length: 100 })
  actor_url_slug: string;

  @Field(() => UserAccount)
  @ManyToOne(() => UserAccount, (user) => user.actors)
  @JoinColumn({ name: "user_id" })
  user: UserAccount;

  @OneToMany(() => ActorTag, (actorTag) => actorTag.actor)
  actor_tags: ActorTag[];

  @OneToMany(() => ActorLink, (actorLink) => actorLink.actor)
  actor_links: ActorLink[];
}
