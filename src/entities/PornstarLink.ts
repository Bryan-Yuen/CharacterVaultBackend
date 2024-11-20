import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm"
import { ObjectType, Field } from "type-graphql";
import Pornstar from "./Pornstar";

/*
If you don't specify a table name using the @Entity() 
decorator or other configuration options, TypeORM will 
automatically generate a table name based on the entity 
class name by converting it to snake_case (e.g., MyEntity 
  class will be mapped to a table named 'my_entity').
  */
@ObjectType()
@Entity()
export default class PornstarLink {
    @Field()
    @PrimaryGeneratedColumn()
    pornstar_link_id: number;

    @Field({nullable: true})
    @Column({length: 100, nullable: true})
    pornstar_link_title?: string;

    @Field({nullable: true})
    @Column({length: 255, nullable: true})
    pornstar_link_url?: string;


    @Field(() => Pornstar)
    @ManyToOne(() => Pornstar, pornstar => pornstar.pornstar_links)
    @JoinColumn({ name: 'pornstar_id' })
    pornstar: Pornstar;
}