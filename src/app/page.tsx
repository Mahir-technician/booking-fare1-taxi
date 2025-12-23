'use client';

import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import toast, { Toaster } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// --- TypeScript Definitions ---
type LngLat = [number, number];

interface SuggestionItem {
  text: string;
  center: LngLat;
  isHeader?: boolean;
  name?: string;
}

interface BookingData {
  pickup: string;
  dropoff: string;
  vehicle: string;
  price: string;
  oldPrice?: string;
  date: string;
  time: string;
  flight: string;
  meet: boolean;
  pax: string;
  bags: string;
  // Return Trip
  returnPickup?: string;
  returnDropoff?: string;
  returnDate?: string;
  returnTime?: string;
  returnFlight?: string;
  returnMeet?: boolean;
}

declare global {
  interface Window {
    mapboxgl: any;
    google: any;
  }
}

// --- Constants ---
const MAPBOX_TOKEN = 'pk.eyJ1IjoiZmFyZTFsdGQiLCJhIjoiY21pcnN4MWZlMGhtcDU2c2dyMTlvODJoNSJ9.fyUV4gMDcEBgWZnQfxS7XA';

const PRESET_DATA: Record<string, {name: string, center: LngLat}[]> = {
  'Airports': [
    { name: 'Southampton Airport', center: [-1.3568, 50.9503] },
    { name: 'Heathrow Airport Terminal 2', center: [-0.4497, 51.4696] },
    { name: 'Heathrow Airport Terminal 3', center: [-0.4597, 51.4708] },
    { name: 'Heathrow Airport Terminal 4', center: [-0.4455, 51.4594] },
    { name: 'Heathrow Airport Terminal 5', center: [-0.4899, 51.4719] },
    { name: 'Gatwick Airport', center: [-0.1821, 51.1537] },
    { name: 'London City Airport', center: [0.0553, 51.5048] },
    { name: 'London Luton Airport', center: [-0.3718, 51.8763] },
    { name: 'London Stansted Airport', center: [0.2353, 51.8853] }
  ],
  'Cruise Terminals': [
    { name: 'Southampton Port', center: [-1.4147, 50.8872] },
    { name: 'Portsmouth Port', center: [-1.0895, 50.8123] }
  ]
};

const vehicles = [
  { name: "Standard Saloon", image: "https://www.fareone.co.uk/wp-content/uploads/2025/11/Saloon-2.png", perMile: 1.67, hourly: 25, passengers: 4, luggage: 2, description: "Economic" },
  { name: "Executive Saloon", image: "https://www.fareone.co.uk/wp-content/uploads/2025/12/executive-saloon.png", perMile: 2.25, hourly: 25, passengers: 3, luggage: 2, description: "Mercedes E-Class" },
  { name: "Standard MPV", image: "https://www.fareone.co.uk/wp-content/uploads/2025/11/People-Carrier-3.png", perMile: 2.37, hourly: 25, passengers: 6, luggage: 8, description: "Group Travel" },
  { name: "8 Seater", image: "https://www.fareone.co.uk/wp-content/uploads/2025/11/Executive-Mini-Bus.png", perMile: 2.57, hourly: 25, passengers: 8, luggage: 16, description: "Mini Bus" }
];

// --- Icons (Inline SVGs for Performance) ---
const Icons = {
  MapPin: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Calendar: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  Clock: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Plane: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>,
  User: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Briefcase: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  CheckCircle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  RotateCw: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
};

// --- Helper: Global Header Component ---
const Header = () => {
  const { data: session } = useSession();

  return (
      <header id="site-header" className="fixed z-50 w-full top-0">
        <div className="glow-wrapper mx-auto">
          <div className="glow-content flex items-center justify-between px-4 sm:px-6 h-16 md:h-20 bg-black/90 backdrop-blur-md border-b border-yellow-500/20">
            <a href="/" className="text-xl md:text-2xl font-bold tracking-widest text-yellow-500">FARE 1 TAXI</a>
            
            {session ? (
                <a href="/dashboard" className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-800 border border-yellow-500 text-yellow-500 hover:bg-gray-700 transition" title="Go to Dashboard">
                    <Icons.User />
                </a>
            ) : (
                <a href="tel:+442381112682" className="flex items-center gap-2 bg-gray-900 border border-yellow-500/40 text-yellow-500 px-4 py-2 rounded-full hover:bg-yellow-500/10 transition">
                    <span className="text-sm font-bold">+44 2381 112682</span>
                </a>
            )}
          </div>
        </div>
      </header>
  );
};

// ==========================================
// 1. MAIN BOOKING FORM COMPONENT
// ==========================================
const MainBookingForm = () => {
    // This is the fallback if no params are present.
    // For now, redirect to main site or show simple message
    // since this domain is primarily for booking processing.
    return (
        <div className="min-h-screen bg-black flex items-center justify-center text-white">
            <div className="text-center">
                <h1 className="text-3xl text-yellow-500 font-bold mb-4">FARE 1 TAXI BOOKING</h1>
                <p className="mb-6 text-gray-400">Please start your booking from our main page.</p>
                <a href="https://fare1.co.uk" className="bg-yellow-500 text-black font-bold py-3 px-8 rounded-xl hover:bg-yellow-400 transition">GO TO HOME</a>
            </div>
        </div>
    );
};

// ==========================================
// 2. PREMIUM BOOKING SUMMARY COMPONENT
// ==========================================
const BookingSummary = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [showPopup, setShowPopup] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Extract params
  const data: BookingData = {
    pickup: searchParams?.get('pickup') || '',
    dropoff: searchParams?.get('dropoff') || '',
    vehicle: searchParams?.get('vehicle') || '',
    price: searchParams?.get('price') || '0',
    oldPrice: searchParams?.get('oldPrice') || undefined,
    date: searchParams?.get('date') || '',
    time: searchParams?.get('time') || '',
    flight: searchParams?.get('flight') || '',
    meet: searchParams?.get('meet') === 'true',
    pax: searchParams?.get('pax') || '1',
    bags: searchParams?.get('bags') || '0',
    // Return params
    returnPickup: searchParams?.get('returnPickup') || undefined,
    returnDropoff: searchParams?.get('returnDropoff') || undefined,
    returnDate: searchParams?.get('returnDate') || undefined,
    returnTime: searchParams?.get('returnTime') || undefined,
    returnFlight: searchParams?.get('returnFlight') || undefined,
    returnMeet: searchParams?.get('returnMeet') === 'true',
  };

  const isComplete = data.pickup && data.dropoff && data.vehicle && data.price;
  
  // Find vehicle image
  const vehicleObj = vehicles.find(v => v.name === data.vehicle) || vehicles[0];

  const handleBookOrder = async () => {
    setIsBooking(true);
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, stops: [] }),
      });

      if (res.ok) {
        toast.success("Booking Successful! Redirecting...");
        setTimeout(() => router.push('/dashboard'), 2000);
      } else {
        toast.error("Failed to create booking.");
      }
    } catch (err) {
      toast.error("Something went wrong.");
    } finally {
      setIsBooking(false);
    }
  };

  const handleOnlinePayment = async () => {
    setIsProcessingPayment(true);
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, stops: [] }),
      });

      const orderData = await res.json();

      if (res.ok && orderData.orderId) {
        const payRes = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ price: data.price, bookingId: orderData.orderId }),
        });

        const payData = await payRes.json();

        if (payData.url) {
            window.location.href = payData.url;
        } else {
            toast.error("Payment initiation failed.");
        }
      } else {
        toast.error("Failed to initiate booking.");
      }
    } catch (err) {
      toast.error("Something went wrong with payment.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleLoginRedirect = () => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '/';
    router.push(`/log-in?redirect=${encodeURIComponent(currentUrl)}`);
  };

  if (!isComplete) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-red-500 mb-2">Incomplete Booking Details</h2>
        <a href="https://fare1.co.uk" className="bg-yellow-500 text-black font-bold py-2 px-6 rounded">Start New Booking</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 pb-20 font-sans selection:bg-yellow-500 selection:text-black">
      <Header />
      <Toaster position="top-center" toastOptions={{ style: { background: '#111', color: '#D4AF37', border: '1px solid #D4AF37' } }} />
      
      <div className="max-w-3xl mx-auto mt-20 md:mt-24">
        <div className="bg-black/80 backdrop-blur-md border border-yellow-500/30 rounded-2xl overflow-hidden shadow-2xl relative">
            {/* Header Badge */}
            <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest">
                Official Quote
            </div>

            <div className="p-6 md:p-8">
                <h1 className="text-2xl md:text-3xl font-bold text-yellow-500 mb-6 tracking-wide flex items-center gap-3">
                    <span className="bg-yellow-500/10 p-2 rounded-lg border border-yellow-500/20">
                        <Icons.Briefcase />
                    </span>
                    BOOKING SUMMARY
                </h1>

                {/* Section 1: Outbound */}
                <div className="mb-8 relative pl-6 border-l-2 border-yellow-500/20">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 bg-black border-2 border-yellow-500 rounded-full"></div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Outbound Journey</h3>
                    
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="mt-1 text-green-500"><Icons.MapPin /></div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">Pickup</p>
                                <p className="text-white font-medium text-lg leading-tight">{data.pickup}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="mt-1 text-red-500"><Icons.MapPin /></div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">Dropoff</p>
                                <p className="text-white font-medium text-lg leading-tight">{data.dropoff}</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-2 bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2">
                                <div className="text-yellow-500"><Icons.Calendar /></div>
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase">Date</p>
                                    <p className="text-sm font-bold">{data.date}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="text-yellow-500"><Icons.Clock /></div>
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase">Time</p>
                                    <p className="text-sm font-bold">{data.time}</p>
                                </div>
                            </div>
                            {data.flight && (
                                <div className="flex items-center gap-2 col-span-2 border-t border-white/10 pt-2 mt-1">
                                    <div className="text-blue-400"><Icons.Plane /></div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase">Flight No</p>
                                        <p className="text-sm font-bold">{data.flight}</p>
                                    </div>
                                </div>
                            )}
                            {data.meet && (
                                <div className="col-span-2 flex items-center gap-2 text-xs text-green-400 font-bold bg-green-900/20 p-2 rounded-lg border border-green-500/20">
                                    <Icons.CheckCircle /> Meet & Greet Included (+£5)
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section 2: Return Trip (Conditional) */}
                {data.returnPickup && (
                    <div className="mb-8 relative pl-6 border-l-2 border-blue-500/30">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 bg-black border-2 border-blue-500 rounded-full"></div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest">Return Journey</h3>
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">5% Discount Applied</span>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="mt-1 text-green-500"><Icons.MapPin /></div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Return Pickup</p>
                                    <p className="text-white font-medium text-lg leading-tight">{data.returnPickup}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1 text-red-500"><Icons.MapPin /></div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Return Dropoff</p>
                                    <p className="text-white font-medium text-lg leading-tight">{data.returnDropoff}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-2 bg-blue-900/10 p-4 rounded-xl border border-blue-500/10">
                                <div className="flex items-center gap-2">
                                    <div className="text-blue-400"><Icons.Calendar /></div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase">Date</p>
                                        <p className="text-sm font-bold">{data.returnDate}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-blue-400"><Icons.Clock /></div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase">Time</p>
                                        <p className="text-sm font-bold">{data.returnTime}</p>
                                    </div>
                                </div>
                                {data.returnFlight && (
                                    <div className="flex items-center gap-2 col-span-2 border-t border-white/10 pt-2 mt-1">
                                        <div className="text-blue-400"><Icons.Plane /></div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase">Return Flight</p>
                                            <p className="text-sm font-bold">{data.returnFlight}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Section 3: Vehicle & Pax */}
                <div className="mb-8 bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-row items-center gap-4">
                    <div className="w-24 h-16 relative bg-black/50 rounded-lg flex items-center justify-center p-1 border border-white/10">
                        <img src={vehicleObj.image} alt={data.vehicle} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-yellow-500 font-bold text-sm uppercase">{data.vehicle}</h4>
                        <div className="flex gap-4 mt-1 text-gray-400 text-xs">
                            <span className="flex items-center gap-1"><Icons.User /> {data.pax} Passengers</span>
                            <span className="flex items-center gap-1"><Icons.Briefcase /> {data.bags} Bags</span>
                        </div>
                    </div>
                </div>

                {/* Section 4: Price Breakdown */}
                <div className="border-t border-dashed border-yellow-500/30 pt-6">
                    <div className="flex flex-col gap-2 items-end">
                        {data.oldPrice && (
                            <div className="flex items-center gap-2">
                                <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Standard Rate</span>
                                <span className="text-gray-500 line-through text-sm font-medium">£{data.oldPrice}</span>
                            </div>
                        )}
                        
                        {/* Discount Badges */}
                        <div className="flex gap-2">
                            {data.returnPickup && <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-1 rounded border border-blue-500/30 uppercase">Return Discount</span>}
                            {(data.oldPrice || parseInt(data.price) > 100) && <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-1 rounded border border-green-500/30 uppercase">15% Off Applied</span>}
                        </div>

                        <div className="flex items-end gap-2 mt-1">
                            <span className="text-gray-400 text-sm font-bold uppercase mb-1">Total To Pay</span>
                            <span className="text-4xl font-black text-yellow-500 drop-shadow-md">£{data.price}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions Footer */}
            <div className="bg-white/5 p-6 border-t border-yellow-500/10">
                <div className="space-y-4">
                    {session ? (
                        <>
                            <button 
                                onClick={handleBookOrder} 
                                disabled={isBooking || isProcessingPayment}
                                className="w-full bg-yellow-500 hover:bg-[#e6c355] text-black font-black py-4 rounded-xl text-lg transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)] flex items-center justify-center gap-2"
                            >
                                {isBooking ? "Confirming..." : (
                                    <>CONFIRM & PAY IN CAB <Icons.CheckCircle /></>
                                )}
                            </button>
                            
                            <div className="mt-4 border-t border-white/5 pt-4">
                                <p className="text-[10px] text-center text-gray-500 uppercase tracking-widest mb-3">Or Pay Securely Online</p>
                                <PayPalScriptProvider options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test", currency: "GBP" }}>
                                    <PayPalButtons 
                                        style={{ layout: "vertical", color: "gold", shape: "rect", label: "pay" }}
                                        createOrder={async (paypalData: any, actions: any) => {
                                            return actions.order.create({
                                                intent: "CAPTURE",
                                                purchase_units: [{ amount: { currency_code: "GBP", value: data.price } }]
                                            });
                                        }}
                                        onApprove={async (paypalData: any, actions: any) => {
                                            await actions.order.capture();
                                            toast.success("Payment Successful");
                                            handleBookOrder();
                                        }}
                                    />
                                </PayPalScriptProvider>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-center p-4 bg-yellow-900/10 border border-yellow-500/20 rounded-xl mb-4">
                                <p className="text-yellow-500 font-bold text-sm mb-1">Login Required</p>
                                <p className="text-xs text-gray-400">Please login to securely manage your booking & payments.</p>
                            </div>
                            <button onClick={handleLoginRedirect} className="w-full bg-white hover:bg-gray-200 text-black font-black py-4 rounded-xl text-lg transition-all">
                                LOGIN TO CONTINUE
                            </button>
                            
                            <div className="flex items-center gap-3 my-4">
                                <div className="h-[1px] bg-gray-800 flex-1"></div>
                                <span className="text-[10px] text-gray-500 uppercase tracking-widest">OR FAST BOOKING</span>
                                <div className="h-[1px] bg-gray-800 flex-1"></div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <a href={`https://wa.me/442381112682?text=${encodeURIComponent(`New Booking Request:\nFrom: ${data.pickup}\nTo: ${data.dropoff}\nCar: ${data.vehicle}\nPrice: £${data.price}\nTime: ${data.date} ${data.time}`)}`} target="_blank" className="flex flex-col items-center justify-center bg-[#25D366] hover:bg-[#1da851] text-white py-3 rounded-xl transition border border-white/5">
                                    <span className="font-bold text-sm">WhatsApp</span>
                                    <span className="text-[10px] opacity-80">Fast Response</span>
                                </a>
                                <a href={`mailto:booking@fare1.co.uk?subject=Booking Request&body=${encodeURIComponent(`Pickup: ${data.pickup}\nDropoff: ${data.dropoff}\nVehicle: ${data.vehicle}\nPrice: £${data.price}`)}`} className="flex flex-col items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition border border-white/5">
                                    <span className="font-bold text-sm">Email</span>
                                    <span className="text-[10px] opacity-80">Detailed Quote</span>
                                </a>
                            </div>
                        </div>
                    )}
                    
                    <p className="text-center text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-4">
                        <Icons.RotateCw /> Free Cancellation up to 24h before
                    </p>
                </div>
            </div>
        </div>
      </div>

      {showPopup && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-[#121212] w-full max-w-md rounded-2xl border border-brand-gold/40 p-6 relative shadow-2xl">
            <button onClick={() => setShowPopup(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition">✕</button>
            {/* Guest View Content (Redundant but kept for structure) */}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 3. PAGE CONTENT WRAPPER
// ==========================================
export default function Home() {
  return (
    <Suspense fallback={<div className="text-brand-gold text-center mt-20">Loading...</div>}>
      <BookingContent />
    </Suspense>
  );
}

function BookingContent() {
  const params = useSearchParams();
  const hasBookingData = params && params.has('pickup') && params.has('dropoff');
  return <>{hasBookingData ? <BookingSummary /> : <MainBookingForm />}</>;
}