import { Entity, Column, PrimaryGeneratedColumn, OneToMany, OneToOne} from "typeorm"
import { ObjectType, Field } from "type-graphql";
import Actor  from "./Actor";
import UserTag  from "./UserTag";
import UserLoginHistory from "./UserLoginHistory";
import UserTwinredConversionInformation from "./UserTwinredConversionInformation";

/*
If you don't specify a table name using the @Entity() 
decorator or other configuration options, TypeORM will 
automatically generate a table name based on the entity 
class name by converting it to snake_case (e.g., MyEntity 
  class will be mapped to a table named 'my_entity').
  */
@ObjectType()
@Entity()
export default class UserAccount {
    @Field()
    @PrimaryGeneratedColumn()
    user_id: number;

    @Field()
    @Column({length: 24})
    user_username: string;

    @Field()
    @Column({length: 90})
    user_email: string;

    @Field()
    @Column({length: 60})
    user_password: string;

    @Field()
    @Column()
    user_is_verified: boolean;

    @Field()
    @Column()
    user_is_interested: boolean;

    @Field()
    @Column()
    user_is_premium: boolean;

    @OneToMany(() => Actor, (actor) => actor.user)
    actors: Actor[];

    @OneToOne(() => UserLoginHistory, (userLoginHistory) => userLoginHistory.user)
    userLoginHistory: UserLoginHistory;

    @OneToOne(() => UserTwinredConversionInformation, (userTwinredConversionInformation) => userTwinredConversionInformation.user)
    userTwinredConversionInformation: UserTwinredConversionInformation;

    @OneToMany(() => UserTag, (userTag) => userTag.user)
    userTags: UserTag[];
}