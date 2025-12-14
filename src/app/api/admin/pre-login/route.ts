import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { sendVerificationEmail } from "@/lib/mail";

const prisma = new PrismaClient();


const ADMINS = [
  { email: "m.miah@live.com", pass: "Xwa*n86hX2DQYorE" },
  { email: "fare.oneteam@gmail.com", pass: "MK1708kk!?" }
];

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    
    const adminConfig = ADMINS.find(a => a.email === email);
    
    if (!adminConfig) {
      return NextResponse.json({ message: "Access Denied: Not an Admin" }, { status: 403 });
    }

    
    if (adminConfig.pass !== password) {
       return NextResponse.json({ message: "Invalid Password" }, { status: 401 });
    }

    
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        
        const hashedPassword = await bcrypt.hash(password, 10);
        user = await prisma.user.create({
            data: { 
                email, 
                password: hashedPassword, 
                role: "admin", 
                name: "Super Admin" 
            }
        });
    }

    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000); 

    
    await prisma.user.update({
        where: { email },
        data: { otp, otpExpires: expires }
    });

    
    console.log(`Sending OTP to ${email}: ${otp}`); 
    
    const emailSent = await sendVerificationEmail(email, otp);

    if (!emailSent) {
        return NextResponse.json({ message: "Failed to send OTP email" }, { status: 500 });
    }

    return NextResponse.json({ message: "OTP Sent", ok: true });

  } catch (error) {
    console.error("Pre-login error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}