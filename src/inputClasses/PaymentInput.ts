import {
    InputType,
    Field
  } from "type-graphql";
  //import { MaxLength } from "class-validator";
  
  // I'm keeping these safeguards in place because, we will not even waste a query to the database
  // if the input don't even satisfy these conditions
  @InputType({ description: "payment data" })
  export default class PaymentInput {
    @Field()
    /*
    @MaxLength(16, {
      message: 'Password is less than 6 characters',
    })
    */
    cardNumber: string;

    // must be in format "0326"
    @Field()
    expirationDate: string;
  
    @Field()
    securityCode: string;

    @Field()
    zipCode: string;
  }