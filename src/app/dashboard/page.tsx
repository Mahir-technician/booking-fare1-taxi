'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

 
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/log-in');
    }

    if (status === 'authenticated') {
      fetchOrders();
    }
  }, [status, router]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return <div className="min-h-screen bg-black text-brand-gold flex items-center justify-center">Loading Dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-brand-gold">My Dashboard</h1>
            <p className="text-gray-400 mt-1">Welcome back, {session?.user?.name || session?.user?.email}</p>
          </div>
          <button 
            onClick={() => signOut({ callbackUrl: '/' })}
            className="mt-4 md:mt-0 px-6 py-2 bg-red-600/20 text-red-500 border border-red-600/50 rounded-lg hover:bg-red-600 hover:text-white transition"
          >
            Logout
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-[#121212] p-6 rounded-xl border border-gray-800">
            <h3 className="text-gray-400 text-sm uppercase">Total Bookings</h3>
            <p className="text-3xl font-bold text-white mt-2">{orders.length}</p>
          </div>
          <div className="bg-[#121212] p-6 rounded-xl border border-gray-800">
            <h3 className="text-gray-400 text-sm uppercase">Pending Rides</h3>
            <p className="text-3xl font-bold text-brand-gold mt-2">
              {orders.filter(o => o.status === 'pending').length}
            </p>
          </div>
          <div className="bg-[#121212] p-6 rounded-xl border border-gray-800">
            <h3 className="text-gray-400 text-sm uppercase">Completed Rides</h3>
            <p className="text-3xl font-bold text-green-500 mt-2">
              {orders.filter(o => o.status === 'completed').length}
            </p>
          </div>
        </div>

        {/* Orders List */}
        <h2 className="text-xl font-bold text-white mb-4">Recent Bookings</h2>
        <div className="bg-[#121212] rounded-xl border border-gray-800 overflow-hidden">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              You haven't made any bookings yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-900 text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4">Pickup</th>
                    <th className="p-4">Dropoff</th>
                    <th className="p-4">Vehicle</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {orders.map((order) => (
                    <tr key={order.id} className="border-t border-gray-800 hover:bg-gray-900/50 transition">
                      <td className="p-4 text-white">{order.date} <br/><span className="text-gray-500 text-xs">{order.time}</span></td>
                      <td className="p-4 text-gray-300 max-w-[200px] truncate" title={order.pickup}>{order.pickup}</td>
                      <td className="p-4 text-gray-300 max-w-[200px] truncate" title={order.dropoff}>{order.dropoff}</td>
                      <td className="p-4 text-brand-gold">{order.vehicle}</td>
                      <td className="p-4 font-bold">£{order.price}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                          order.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                          order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                          'bg-red-500/20 text-red-500'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}