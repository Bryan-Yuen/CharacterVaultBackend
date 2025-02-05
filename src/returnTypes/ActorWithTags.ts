import { ObjectType, Field } from "type-graphql";

@ObjectType()
export default class ActorWithTags {
  @Field()
    actor_url_slug: string;

    @Field()
    actor_name: string;

    /*
    @Field({nullable: true})
    @Column({length: 90, nullable: true})
    pornstar_picture_path: string | null;
    */
    @Field({nullable: true})
    actor_picture_path?: string;

    @Field(() => [String])
    actor_tags_text: string[];
}