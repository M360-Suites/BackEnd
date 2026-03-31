import { Request as ExpressRequest, RequestHandler } from "express";
import { IMembership, IOrganization, IUser } from "../Models/User";

export interface CustomRequest extends ExpressRequest {
  membership?: IMembership;
  organizationId?: IOrganization;
  user?: IUser;
  userRole?: string;
}


export type CustomRequestHandler = RequestHandler<
  any, // Params
  any, // ResBody
  any, // ReqBody
  any, // ReqQuery
  Record<string, any>
>;