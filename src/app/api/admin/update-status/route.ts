import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

const prisma = new PrismaClient();


const ADMIN_EMAILS = [
  "m.miah@live.com", 
  "fare.oneteam@gmail.com"
];

export async function PATCH(req: Request) {
  try {
    
    const session = await getServerSession(authOptions) as any;

    if (!session || !session.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    
    if (!ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ message: "Forbidden: Admin access only" }, { status: 403 });
    }

    
    const body = await req.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
        return NextResponse.json({ message: "Missing order ID or status" }, { status: 400 });
    }

    
    const updatedOrder = await prisma.order.update({
      where: { id: Number(orderId) }, 
      data: { status },
    });

    return NextResponse.json(updatedOrder);

  } catch (error) {
    console.error("Update Status Error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}