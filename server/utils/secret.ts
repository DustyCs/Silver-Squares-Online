import * as dotenv from "dotenv";
import * as path from "path";
import * as _ from "lodash"; 

dotenv.config();

export const ENVIRONMENT = _.defaultTo(process.env.NODE_ENV, "development");
export const IS_PRODUCTION = ENVIRONMENT === "production";
export const APP_PORT = _.defaultTo(process.env.APP_PORT, 5100);
export const LOG_DIR = _.defaultTo(process.env.LOG_DIR, path.resolve(__dirname, "/logs"));
export const JWT_SECRET = _.defaultTo(process.env.JWT_SECRET, "NoCal Sec R22");
export const MONGODB = {
    USER : _.defaultTo(process.env.DB_USER, "root"),
    PASSWORD : _.defaultTo(process.env.DB_PASSWORD, "secret"),
    HOST : _.defaultTo(process.env.DB_HOST, "localhost"),
    NAME : _.defaultTo(process.env.DB_DATABASE, "test"),
    APPNAME: _.defaultTo(process.env.DB_APPNAME, "myApp")
}