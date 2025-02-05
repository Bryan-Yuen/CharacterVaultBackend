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

/*
If you don't specify a table name using the @Entity() 
decorator or other configuration options, TypeORM will 
automatically generate a table name based on the entity 
class name by converting it to snake_case (e.g., MyEntity 
  class will be mapped to a table named 'my_entity').
  */
@ObjectType()
@Entity()
export default class UserTag {
  @Field()
  @PrimaryGeneratedColumn()
  user_tag_id: number;

  @Field()
  @Column({ length: 50 })
  user_tag_text: string;

  @Field(() => UserAccount)
  @ManyToOne(() => UserAccount, (user) => user.userTags)
  @JoinColumn({ name: "user_id" })
  user: UserAccount;

  @OneToMany(() => ActorTag, (actorTag) => actorTag.user_tag, {
    cascade: true,
  })
  actor_tags: ActorTag[];
}
