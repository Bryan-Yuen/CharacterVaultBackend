import { DataSource } from "typeorm";
import UserAccount from "../entities/UserAccount";
import Actor from "../entities/Actor";
import ActorTag from "../entities/ActorTag";
import UserTag from "../entities/UserTag";
import ActorLink from "../entities/ActorLink";
import UserLoginHistory from "../entities/UserLoginHistory";
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
    Actor,
    ActorTag,
    UserTag,
    ActorLink,
    UserLoginHistory,
  ],
  // use this to check database is following hte rules and strucutre, use only in development do not use in prodution
  //synchronize: true,
  logging: false,
});

export default AppDataSource;
