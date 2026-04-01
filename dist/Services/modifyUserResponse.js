"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modifyConnResponse = exports.modifyUserResponse = void 0;
const modifyUserResponse = (user) => {
    user.password = 'undefined';
    return user;
};
exports.modifyUserResponse = modifyUserResponse;
const modifyConnResponse = (connection) => {
    connection.accessToken = 'undefined';
    connection.refreshToken = 'undefined';
    // connection. = undefined;
    return connection;
};
exports.modifyConnResponse = modifyConnResponse;
