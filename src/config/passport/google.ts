import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { User } from '../../Models/User';
import { config } from 'dotenv';
import { logger } from '../../logger/logger';
import { Request } from 'express';
config();

let serverUrl =
  process.env.NODE_ENV === 'development' ? process.env.SERVER_URL! : process.env.LIVE_CLIENT_URL!;

passport.use(
  'google-signin',
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: `${serverUrl}/oauth/google/callback`,
      scope: ['profile', 'email'],
      passReqToCallback: true,
    },
    async (
      req: Request,
      accessToken: string,
      refreshToken: string,
      params: any,
      profile: Profile,
      done: VerifyCallback,
    ) => {
      try {
        // Check if a user with the Google Id exists
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // Check if the email exists already, if there's no user with the google id
          const email = profile.emails?.[0]?.value;
          if (email) {
            user = await User.findOne({ email });

            if (user) {
              // If user exists, update with the googleId
              user.googleId = profile.id;
              if (!user.emailVerified) user.emailVerified = true;
              await user.save();
            } else {
              // Create a new user with Google data
              const name = profile._json?.given_name || 'Unknown';
              const lastName = profile._json?.family_name || 'None';
              const avatar = profile.photos?.[0]?.value || '';

              // Generate a random password for Google users
              const randomPassword = Math.random().toString(36).slice(-8);

              // Create a new user with required fields
              user = new User({
                name,
                lastName,
                email: email,
                avatar,
                googleId: profile.id,
                emailVerified: true, // Since google verifies user
                password: randomPassword, // This should be hashed in a real implementation
              });
              await user.save();
            }
          }
        }

        if (!user) {
          return done(new Error('Could not create user'), undefined);
        }

        // Pass user data to the next middleware
        const userData = {
          _id: user._id,
          email: user.email,
          name: user.name,
          picture: user.avatar,
        };

        return done(null, { user: userData });
      } catch (error) {
        console.error('Error in Google Strategy:', error);
        done(error as Error, undefined);
      }
    },
  ),
);

passport.use(
  'google-mail',
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${serverUrl}/api/campaigns/google/callback`,
      passReqToCallback: true,
    },
    async (
      req: Request,
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: VerifyCallback,
    ) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email || !accessToken || !refreshToken) {
          return done(new Error('Missing credentials'), false);
        }

        // console.log("Google Profile: ", profile);
        return done(null, {
          // id: (req.user as any).id,
          email,
          accessToken,
          refreshToken,
          profile,
        });
      } catch (error) {
        console.error('Error in Google Mail Strategy:', error);
        done(error as Error, false);
      }
    },
  ),
);

// Attach authorizationParams manually
(GoogleStrategy.prototype as any).authorizationParams = function () {
  return {
    access_type: 'offline',
    prompt: 'consent',
  };
};

// Serialize user instance to the session
passport.serializeUser((user: any, done) => {
  done(null, user.user?._id || user._id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
