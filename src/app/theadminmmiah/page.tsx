'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';

export default function SecretAdminPanel() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  
  const ALLOWED_ADMINS = ["m.miah@live.com", "fare.oneteam@gmail.com"];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/theadminmmiah/login'); 
    } else if (status === 'authenticated') {
      if (!ALLOWED_ADMINS.includes(session?.user?.email || '')) {
        toast.error("Unauthorized Access!");
        setTimeout(() => router.push('/'), 2000);
      } else {
        fetchOrders();
      }
    }
  }, [status, session, router]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders'); 
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      } else {
        toast.error("Failed to load orders");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/update-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id, status: newStatus }),
      });

      if (res.ok) {
        toast.success(`Order marked as ${newStatus}`);
        fetchOrders(); 
      }
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const copyDetails = (order: any) => {
    const details = `
🚖 *New Job Alert*
🆔 Ref: #${order.id}
👤 Passenger: ${order.user?.name || 'Guest'}
📞 Contact: ${order.user?.email}
📍 From: ${order.pickup}
🏁 To: ${order.dropoff}
📅 Date: ${order.date} @ ${order.time}
🚗 Car: ${order.vehicle}
💰 Price: £${order.price} (${order.paymentId === 'pay_in_cab' ? 'Cash/Card to Driver' : 'Paid Online'})
✈️ Flight: ${order.flight || 'N/A'}
🧳 Bags: ${order.bags} | Pax: ${order.pax}
    `.trim();

    navigator.clipboard.writeText(details);
    toast.success("Copied to clipboard!");
  };

  if (status === 'loading' || loading) return <div className="min-h-screen bg-black text-brand-gold flex items-center justify-center">Verifying Admin Access...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-4">
      <Toaster position="top-center" />
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
            <div>
                <h1 className="text-3xl font-bold text-brand-gold">MASTER CONTROL</h1>
                <p className="text-xs text-gray-500">Secure Admin Environment</p>
            </div>
            <button 
                onClick={() => signOut({ callbackUrl: '/theadminmmiah/login' })} 
                className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded font-bold text-sm transition"
            >
                LOGOUT
            </button>
        </div>

        <div className="grid gap-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-black border border-gray-800 rounded-xl p-6 shadow-lg flex flex-col md:flex-row justify-between gap-6">
              
              {/* Order Info */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3 mb-2">
                    <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs font-mono">#{order.id}</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                        order.status === 'accepted' ? 'bg-green-500 text-black' : 
                        order.status === 'completed' ? 'bg-blue-500 text-white' : 
                        'bg-yellow-500 text-black'
                    }`}>
                        {order.status}
                    </span>
                    <span className="text-gray-500 text-xs">
                        {order.date} at {order.time}
                    </span>
                </div>
                
                <h3 className="text-xl font-bold text-white">{order.pickup} <span className="text-brand-gold">➝</span> {order.dropoff}</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-400 mt-4">
                    <div>
                        <span className="block text-xs uppercase tracking-wider text-gray-600">Vehicle</span>
                        <span className="text-white">{order.vehicle}</span>
                    </div>
                    <div>
                        <span className="block text-xs uppercase tracking-wider text-gray-600">Price</span>
                        <span className="text-brand-gold font-bold">£{order.price}</span>
                    </div>
                    <div>
                        <span className="block text-xs uppercase tracking-wider text-gray-600">Payment</span>
                        <span className="text-white">{order.paymentId === 'pay_in_cab' ? 'Pay in Cab' : 'Online Paid'}</span>
                    </div>
                    <div>
                         <span className="block text-xs uppercase tracking-wider text-gray-600">Customer</span>
                         <span className="text-white">{order.user?.email || 'N/A'}</span>
                    </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 justify-center min-w-[140px]">
                {order.status === 'pending' && (
                    <button 
                        onClick={() => updateStatus(order.id, 'accepted')}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition"
                    >
                        Accept Job
                    </button>
                )}
                
                <button 
                    onClick={() => copyDetails(order)}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2 px-4 rounded-lg transition border border-gray-600"
                >
                    Copy Details
                </button>
              </div>

            </div>
          ))}

          {orders.length === 0 && (
            <div className="text-center py-20 bg-black/20 rounded-xl border border-gray-800">
                <p className="text-gray-500 text-lg">No active orders found.</p>
                <button onClick={fetchOrders} className="mt-4 text-brand-gold hover:underline text-sm">Refresh List</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}