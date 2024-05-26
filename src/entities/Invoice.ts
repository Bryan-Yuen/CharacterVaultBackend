import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm"
import { ObjectType, Field } from "type-graphql";
import { UserAccount } from "./UserAccount";
import { Subscription } from "./Subscription";

/*
If you don't specify a table name using the @Entity() 
decorator or other configuration options, TypeORM will 
automatically generate a table name based on the entity 
class name by converting it to snake_case (e.g., MyEntity 
  class will be mapped to a table named 'my_entity').
  */
@ObjectType()
@Entity()
export class Invoice {
    @Field()
    @PrimaryGeneratedColumn()
    invoice_id: number;

    @Field()
    @Column()
    billing_start_date: Date;

    @Field()
    @Column()
    billing_end_date: Date;

    @Field()
    @Column()
    billing_total: number;

    @Field(() => Subscription)
    @ManyToOne(() => Subscription, subscription => subscription.invoices)
    @JoinColumn({ name: 'subscription_id' })
    subscription: Subscription;

    @Field(() => UserAccount)
    @ManyToOne(() => UserAccount, user => user.invoices)
    @JoinColumn({ name: 'user_id' })
    user: UserAccount;
}