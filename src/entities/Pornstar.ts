import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm"
import { ObjectType, Field } from "type-graphql";
import UserAccount  from "./UserAccount";
import PornstarTag from "./PornstarTag";
import PornstarLink from "./PornstarLink";

/*
If you don't specify a table name using the @Entity() 
decorator or other configuration options, TypeORM will 
automatically generate a table name based on the entity 
class name by converting it to snake_case (e.g., MyEntity 
  class will be mapped to a table named 'my_entity').
  */
@ObjectType()
@Entity()
export default class Pornstar {
    @Field()
    @PrimaryGeneratedColumn()
    pornstar_id: number;

    @Field()
    @Column({length: 50})
    pornstar_name: string;

    @Field({nullable: true})
    @Column({length: 90, nullable: true})
    pornstar_picture_path?: string;

    @Field(() => UserAccount)
    @ManyToOne(() => UserAccount, user => user.pornstars)
    @JoinColumn({ name: 'user_id' })
    user: UserAccount;

    @OneToMany(() => PornstarTag, (PornstarTag) => PornstarTag.pornstar)
    pornstar_tags: PornstarTag[];

    @OneToMany(() => PornstarLink, (PornstarLink) => PornstarLink.pornstar)
    pornstar_links: PornstarLink[];

}