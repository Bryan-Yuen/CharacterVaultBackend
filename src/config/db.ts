import { DataSource } from "typeorm";
import UserAccount from "../entities/UserAccount";
import Pornstar from "../entities/Pornstar";
import PornstarTag from "../entities/PornstarTag";
import UserTag from "../entities/UserTag";
import PornstarLink from "../entities/PornstarLink";
import UserLoginHistory from "../entities/UserLoginHistory";
import UserTwinredConversionInformation from "../entities/UserTwinredConversionInformation";
import "dotenv/config";

if (!process.env.DB_PASSWORD) {
  throw new Error("DB_PASSWORD environment variable is not defined");
}

if (!process.env.DB_NAME) {
  throw new Error("DB_NAME environment variable is not defined");
}

const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [
    UserAccount,
    Pornstar,
    PornstarTag,
    UserTag,
    PornstarLink,
    UserLoginHistory,
    UserTwinredConversionInformation
  ],
  // use this to check database is following hte rules and strucutre, use only in development do not use in prodution
  //synchronize: true,
  logging: false,
});

export default AppDataSource;
