// src/Types/custom.d.ts
declare global {
  namespace Express {
    interface Request {
      membership?: import("../Models/User").IMembership;
      organizationId?: import("../Models/User").IOrganization;
      user: import("../Models/User").IUser;
      userRole?: string;
    }
  }
}
