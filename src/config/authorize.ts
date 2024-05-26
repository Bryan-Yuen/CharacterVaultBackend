import { APIContracts } from "authorizenet";
import "dotenv/config";

if (!process.env.NAME) {
  throw new Error("NAME environment variable is not defined");
}
if (!process.env.TRANSACTION_KEY) {
  throw new Error("TRANSACTION_KEY environment variable is not defined");
}

var merchantAuthenticationType = new APIContracts.MerchantAuthenticationType();
merchantAuthenticationType.setName(process.env.NAME);
merchantAuthenticationType.setTransactionKey(process.env.TRANSACTION_KEY);

export default merchantAuthenticationType
