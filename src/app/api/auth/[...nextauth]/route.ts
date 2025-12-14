import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export const authOptions: any = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" } 
      },
      async authorize(credentials: any) {
        if (!credentials?.email) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("User not found");
        }

        
        if (credentials.otp) {
            
            if (!user.otp || user.otp !== credentials.otp) {
                throw new Error("Invalid Verification Code");
            }
            
            if (user.otpExpires && new Date() > user.otpExpires) {
                throw new Error("Verification Code Expired");
            }
            
            
            await prisma.user.update({
                where: { email: user.email },
                data: { otp: null, otpExpires: null }
            });

            return { 
                id: user.id.toString(), 
                email: user.email, 
                name: user.name, 
                role: "admin" 
            };
        } 
        
        
        if (!credentials.password) {
             throw new Error("Password required");
        }

        const isPasswordCorrect = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordCorrect) {
            throw new Error("Invalid Password");
        }
        
        return { 
            id: user.id.toString(), 
            email: user.email, 
            name: user.name, 
            role: user.role || "user" 
        };
      },
    }),
  ],
  pages: {
    signIn: "/log-in", 
  },
  session: { strategy: "jwt" },
  callbacks: {
      async jwt({ token, user }: any) {
          if (user) {
              token.role = user.role;
              token.id = user.id;
          }
          return token;
      },
      async session({ session, token }: any) {
          if (session.user) {
              session.user.role = token.role;
              session.user.id = token.id;
          }
          return session;
      }
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };