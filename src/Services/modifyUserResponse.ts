import { IUser } from "../Models/User";
import { AdsConnection } from "../Types/ads";
import { ComConInterface, SocialConnection } from "../Types/types";

export const modifyUserResponse = (user: IUser) => {
    user.password = 'undefined';
    return user;
}

export const modifyConnResponse = (connection: AdsConnection | SocialConnection | ComConInterface) => {
    connection.accessToken = 'undefined';
    connection.refreshToken = 'undefined';
    // connection. = undefined;
    return connection;
}