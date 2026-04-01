"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasePoster = void 0;
const encryption_1 = require("../../../Services/encryption");
class BasePoster {
    constructor(connection) {
        this.connection = connection;
    }
    getAccessToken() {
        return (0, encryption_1.decrypt)(this.connection.accessToken);
    }
    getRefreshToken() {
        const refreshToken = this.connection.refreshToken
            ? (0, encryption_1.decrypt)(this.connection.refreshToken)
            : undefined;
        return refreshToken;
    }
    getConnection() {
        return this.connection;
    }
    createResult(success, postId, error) {
        return {
            success,
            postId,
            error,
            platform: this.connection.platform,
        };
    }
}
exports.BasePoster = BasePoster;
