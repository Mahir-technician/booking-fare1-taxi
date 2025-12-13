import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ message: "Unauthorized: Please login first" }, { status: 401 });
    }

    
    const body = await req.json();
    const { 
      pickup, dropoff, vehicle, price, date, time, 
      flight, meet, pax, bags, stops 
    } = body;

    
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    
    const newOrder = await prisma.order.create({
      data: {
        userId: user.id,
        pickup,
        dropoff,
        vehicle,
        price: parseFloat(price), 
        date,
        time,
        flight: flight || null,
        meet: meet || false,
        pax: parseInt(pax),
        bags: parseInt(bags),
        stops: stops || [],
        status: "pending",
        paymentId: "pay_in_cab", 
      },
    });

    return NextResponse.json({ message: "Order created successfully", orderId: newOrder.id }, { status: 200 });

  } catch (error) {
    console.error("[CREATE_ORDER_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}