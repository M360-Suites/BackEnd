import { Document, model, Schema } from "mongoose";
import { ComPlatform, SocialPlatform } from "../Types/types";
import { AdsPlatform } from '../Types/ads';
import { BillingStatus, Currency } from "../Types/payment";

export enum UserRoles {
  OWNER = "owner",
  ADMIN = "admin",
  EDITOR = "editor",
  VIEWER = "viewer",
}

// export interface IUser extends Document {
//   name: string;
//   url: string;
//   email: string;
//   avatar: string;
//   phone1: string;
//   phone2: string;
//   address: string;
//   city: string;
//   country: string;
//   googleId: string;
//   zohoUId: string;
//   password: string;
//   onTrial: boolean;
//   trialStart: Date;
//   trialEnd: Date;
//   emailVerified: boolean;
//   emailAutoOnboarding: number;
//   websites: Schema.Types.ObjectId[];
//   usersAccess: [
//     {
//       userId?: Schema.Types.ObjectId;
//       email: string;
//       status: "invited" | "accepted" | "rejected";
//       role: UserRoles;
//     }
//   ];
// }

// ============ Organization (Account/Company) ============
export interface IOrganization extends Document {
  name: string;
  email: string;
  avatar?: string;

  // New fields
  billingStatus: BillingStatus;
  onTrial: boolean;
  trialEndsAt: Date | null;
  paystackCustomerCode: string | null;
  paystackAuthorizationCode: string | null;
  paystackSubscriptionCode: string | null;
  currentPlanCode: string | null;
  currentAmount: number; // in kobo
  activeFeatures: string[];
  gracePeriodEndsAt: Date | null;
  pendingPlanChange: {
    planCode: string;
    amount: number;
    features: string[];
  } | null;
  createdAt: Date;
  updatedAt: Date;

  // billing/subscription info - Old
  // subscriptionStatus: "trial" | "active" | "past_due" | "suspended";
  // paystackAuthorization: string;
  // paystackCustomerCode: string;
  // paystackSubscriptionCode: string;
  // onTrial: boolean;
  // trialStartsAt?: Date;
  // trialEndsAt?: Date;
  websites: Schema.Types.ObjectId[];
  adAndSocials: Object;
  community: Object;
  currency: Currency;
  emailAutoOnboarding: number;
  accessEmails: Schema.Types.ObjectId[];
  // activeFeatures: string[];
  // monthlyAmount: number;
  // pendingDowngrade?: {
  //   features: string[];
  //   amount: number;
  // };
  // gracePeriodEndsAt?: Date;
  // pendingFeatures: any;
  // pendingAmount: number;
  // billingCycleStart: Date;
  createdBy: Schema.Types.ObjectId; // original owner
}

// ============ User (Individual Person) ============
export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  phone1?: string;
  phone2?: string;
  address?: string;
  city?: string;
  country?: string;
  avatar?: string;
  googleId?: string;
  zohoUid?: string;
  emailVerified: boolean;
  emailAutoOnboarding: number;
  defaultOrganization?: Schema.Types.ObjectId; // last active org
}

// ============ Membership (Join Table) ============
export interface IMembership extends Document {
  userId: Schema.Types.ObjectId;
  email: string;
  organizationId: Schema.Types.ObjectId;
  role: "owner" | "admin" | "editor" | "viewer";
  status: "invited" | "active" | "deactivated";
  invitedBy?: Schema.Types.ObjectId;
  invitedAt?: Date;
  acceptedAt?: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      unique: true,
      lowercase: true,
      required: true,
    },
    avatar: {
      type: String,
      trim: true,
    },

    // NEW
    billingStatus: {
      type: String,
      enum: Object.values(BillingStatus),
      default: BillingStatus.TRIAL,
    },
    trialEndsAt: { type: Date, default: null },
    paystackCustomerCode: { type: String, default: null },
    paystackAuthorizationCode: { type: String, default: null },
    paystackSubscriptionCode: { type: String, default: null },
    currentPlanCode: { type: String, default: null },
    currentAmount: { type: Number, default: 0 },
    activeFeatures: [{ type: String }],
    gracePeriodEndsAt: { type: Date, default: null },
    pendingPlanChange: {
      type: {
        planCode: String,
        amount: Number,
        features: [String],
      },
      default: null,
    },
    onTrial: {
      type: Boolean,
      required: true,
      default: false,
    },

    // Trial - OLD
    // subscriptionStatus: {
    //   type: String,
    //   enum: ["trial", "active", "past_due", "suspended"],
    //   default: "trial",
    // },
    // onTrial: {
    //   type: Boolean,
    //   required: true,
    //   default: false,
    // },
    // trialStartsAt: {
    //   type: Date,
    // },
    // trialEndsAt: {
    //   type: Date,
    // },

    // // Paystack
    // paystackAuthorization: String,
    // paystackCustomerCode: String,
    // paystackSubscriptionCode: String,

    // // Feature Billing
    // activeFeatures: { type: [String], default: [] },
    // monthlyAmount: { type: Number, default: 0 },

    // // Billing cycle
    // billingCycleStart: Date,
    // gracePeriodEndsAt: Date,

    websites: [
      {
        type: Schema.Types.ObjectId,
        ref: "Website",
      },
    ],
    adAndSocials: {
      adsAccounts: [
        {
          platform: { type: String, enum: Object.values(AdsPlatform) },
          name: String,
          id: String,
        },
      ],
      socialAccounts: [
        {
          platform: { type: String, enum: Object.values(SocialPlatform) },
          name: String,
          id: String,
        },
      ],
      preferences: {
        postingTime: String,
        timeZone: String,
      },
    },
    community: {
      connectedAccounts: [
        {
          platform: { type: String, enum: Object.values(ComPlatform) },
          name: String,
          id: String,
        },
      ],
      preferences: {
        autoSyncPosts: Boolean,
        autoDeleteSpams: Boolean,
        contentModeration: Boolean,
        userApproval: Boolean,
      },
    },
    currency: {
      type: String,
      enum: Object.values(Currency),
    },
    emailAutoOnboarding: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    accessEmails: [
      {
        type: Schema.Types.ObjectId,
        default: [],
      },
    ],
  },
  { timestamps: true },
);

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      unique: true,
      lowercase: true,
      required: true,
    },
    phone1: {
      type: String,
    },
    phone2: {
      type: String,
    },
    address: {
      type: String,
    },
    city: {
      type: String,
    },
    country: {
      type: String,
    },
    avatar: {
      type: String,
      trim: true,
    },
    googleId: {
      type: String,
      trim: true,
    },
    zohoUid: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      trim: true,
      required: true,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const membershipSchema = new Schema<IMembership>({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  email: String,
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  role: { type: String, enum: Object.values(UserRoles) },
  status: { type: String, enum: ["invited", "active", "deactivated"] },
  invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  invitedAt: Date,
  acceptedAt: Date,
});

const User = model<IUser>("User", userSchema);
const Organization = model<IOrganization>("Organization", organizationSchema);
const Membership = model<IMembership>("Membership", membershipSchema);

export { User, Organization, Membership };
