import NextAuth from 'next-auth/next';
import CredentialsProvider from 'next-auth/providers/credentials';
import Member from '../../../mongoose_models/Member';

import db from '../../../utils/db';

import bcryptjs from 'bcryptjs';

export default NextAuth({
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, member }) {
      if (member?._id) token._id = member._id;
      return token;
    },
    async session({ session, token }) {
      if (token?._id) session.member._id = token._id;

      return session;
    },
  },

  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        await db.connect();

        const member = await Member.findOne({ email: credentials.email });
        await db.disconnect();

        if (member) {
          const result = bcryptjs.compareSync(
            credentials.password,
            member.password
          );

          if (result) {
            return {
              _id: member._id,
              name: 'Brian',
              email: member.email,
              image: 'f',
              role: 'Admin',
            };
          }
        }

        throw new Error('Invalid Credentials');
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
});