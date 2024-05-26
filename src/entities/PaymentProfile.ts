import { Entity, Column, PrimaryGeneratedColumn, JoinColumn, OneToOne } from "typeorm"
import { ObjectType, Field } from "type-graphql";
import { UserAccount } from "./UserAccount";

/*
If you don't specify a table name using the @Entity() 
decorator or other configuration options, TypeORM will 
automatically generate a table name based on the entity 
class name by converting it to snake_case (e.g., MyEntity 
  class will be mapped to a table named 'my_entity').
  */
@ObjectType()
@Entity()
export class PaymentProfile {
    @Field()
    @PrimaryGeneratedColumn()
    payment_profile_id: number;

    @Field()
    @Column()
    authorize_customer_profile_id: string;

    @Field()
    @Column()
    authorize_customer_payment_id: string;

    @Field()
    @Column()
    last_4_credit_card_number: string;

    // will change to one to one
    @Field(() => UserAccount)
    @OneToOne(() => UserAccount, user => user.paymentProfile)
    //@OneToOne(() => UserAccount)
    @JoinColumn({ name: 'user_id' })
    user: UserAccount;
}