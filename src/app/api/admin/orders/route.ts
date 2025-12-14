import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

const prisma = new PrismaClient();


const ADMIN_EMAILS = [
  "m.miah@live.com", 
  "fare.oneteam@gmail.com"
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as any;

    
    if (!session || !session.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    
    if (!ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ message: "Forbidden: You are not an admin" }, { status: 403 });
    }

    
    const orders = await prisma.order.findMany({
      orderBy: { id: 'desc' },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Admin Orders Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}