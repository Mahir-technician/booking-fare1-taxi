import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    
    if (!email || !password) {
      return NextResponse.json({ message: "Missing fields" }, { status: 400 });
    }

   
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 });
    }

   
    const hashedPassword = await bcrypt.hash(password, 10);

    
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.log("REGISTRATION_ERROR", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
