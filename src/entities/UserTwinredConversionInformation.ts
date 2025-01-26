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
export default class UserTwinredConversionInformation {
    @Field()
    @PrimaryGeneratedColumn()
    user_twinred_conversion_information_id: number;

    @Field({ nullable: true })
    @Column({ length: 64, nullable: true })
    campaign_id?: string;

    @Field({ nullable: true })
    @Column({ length: 64, nullable: true })
    placement_id?: string;

    @Field({ nullable: true })
    @Column({ length: 64, nullable: true })
    site_id?: string;

    @Field({ nullable: true })
    @Column({ length: 64, nullable: true })
    city?: string;

    @Field({ nullable: true })
    @Column({ length: 64, nullable: true })
    operating_system?: string;

    @Field({ nullable: true })
    @Column({ length: 128, nullable: true })
    site_name?: string;

    @Field(() => UserAccount)
    @OneToOne(() => UserAccount, user => user.userTwinredConversionInformation)
    @JoinColumn({ name: 'user_id' })
    user: UserAccount;
}