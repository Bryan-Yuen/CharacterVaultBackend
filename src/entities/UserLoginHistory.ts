import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn} from "typeorm"
import { ObjectType, Field } from "type-graphql";
import UserAccount from "./UserAccount";


/*
If you don't specify a table name using the @Entity() 
decorator or other configuration options, TypeORM will 
automatically generate a table name based on the entity 
class name by converting it to snake_case (e.g., MyEntity 
  class will be mapped to a table named 'my_entity').
  */
@ObjectType()
@Entity()
export default class UserLoginHistory {
    @Field()
    @PrimaryGeneratedColumn()
    user_login_history_id: number;

    @Field()
    @Column()
    user_created_date_time: Date;

    @Field()
    @Column()
    user_last_login_date_time: Date;

    @Field(() => UserAccount)
    @OneToOne(() => UserAccount, user => user.userLoginHistory)
    @JoinColumn({ name: 'user_id' })
    user: UserAccount;
}