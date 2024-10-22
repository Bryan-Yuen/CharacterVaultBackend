import { ObjectType, Field } from "type-graphql";

@ObjectType()
export class PornstarWithTags {
  @Field()
    pornstar_id: number;

    @Field()
    pornstar_name: string;

    /*
    @Field({nullable: true})
    @Column({length: 90, nullable: true})
    pornstar_picture_path: string | null;
    */
    @Field({nullable: true})
    pornstar_picture_path?: string;

    @Field(() => [String])
    pornstar_tags_text: string[];
}