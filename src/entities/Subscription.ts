import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany } from "typeorm"
import { ObjectType, Field } from "type-graphql";
import { UserAccount } from "./UserAccount";
import { Invoice } from "./Invoice";

/*
If you don't specify a table name using the @Entity() 
decorator or other configuration options, TypeORM will 
automatically generate a table name based on the entity 
class name by converting it to snake_case (e.g., MyEntity 
  class will be mapped to a table named 'my_entity').
  */
@ObjectType()
@Entity()
export class Subscription {
    @Field()
    @PrimaryGeneratedColumn()
    subscription_id: number;

    @Field()
    @Column()
    subscription_start_date: Date;

    @Field()
    @Column()
    subscription_end_date: Date;

    @Field()
    @Column()
    billing_zip: string;

    @Field()
    @Column()
    authorize_subscription_id: string;

    @Field(() => UserAccount)
    @ManyToOne(() => UserAccount, user => user.subscriptions)
    @JoinColumn({ name: 'user_id' })
    user: UserAccount;

    @OneToMany(() => Invoice, (invoice) => invoice.subscription)
    invoices: Invoice[];
}