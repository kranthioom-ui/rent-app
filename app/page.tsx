'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Replace with your dad's actual UPI ID
const DAD_UPI_ID = "your-upi-id@upi"; 

interface Flat {
  flat_no: string;
  tenant_name: string;
  phone: string;
  rent: number;
  electricity_bill: number;
  water_bill: number;
  maintenance: number;
  status: 'PAID' | 'UNPAID' | 'PARTIAL';
  paid_amount: number;
}

export default function RentalDashboard() {
  const [flats, setFlats] = useState<Flat[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFlats = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('flats').select('*').order('flat_no', { ascending: true });
    if (error) console.error('Error fetching flats:', error);
    else setFlats(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFlats();
  }, []);

  const updateStatus = async (flat_no: string, status: 'PAID' | 'UNPAID' | 'PARTIAL', totalAmount: number) => {
    const paid_amount = status === 'PAID' ? totalAmount : status === 'PARTIAL' ? totalAmount / 2 : 0;
    const { error } = await supabase
      .from('flats')
      .update({ status, paid_amount })
      .eq('flat_no', flat_no);

    if (error) console.error('Error updating status:', error);
    else fetchFlats();
  };

  const totalCollected = flats.filter(f => f.status === 'PAID').reduce((acc, f) => acc + (f.rent + (f.electricity_bill || 0) + (f.water_bill || 0) + (f.maintenance || 0)), 0);
  const totalPending = flats.filter(f => f.status !== 'PAID').reduce((acc, f) => {
    const total = (f.rent + (f.electricity_bill || 0) + (f.water_bill || 0) + (f.maintenance || 0));
    return acc + (total - (f.paid_amount || 0));
  }, 0);

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Dashboard Summary */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rental Management Dashboard</h1>
            <p className="text-sm text-gray-500">20 Residential Flats - India Portal</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl">
              <p className="text-xs text-emerald-600 font-medium">Collected</p>
              <p className="text-lg font-bold text-emerald-700">₹{totalCollected.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl">
              <p className="text-xs text-amber-600 font-medium">Pending</p>
              <p className="text-lg font-bold text-amber-700">₹{totalPending.toLocaleString('en-IN')}</p>
            </div>
            <button 
              onClick={fetchFlats}
              className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl text-sm font-medium text-gray-700 transition"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Flats Grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading flat details...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {flats.map((flat) => {
              const electricity = flat.electricity_bill || 0;
              const water = flat.water_bill || 0;
              const maintenance = flat.maintenance || 0;
              const totalDue = flat.rent + electricity + water + maintenance;

              const whatsappMessage = encodeURIComponent(
                `Hello ${flat.tenant_name},\n\n` +
                `Here is your itemized rent bill breakdown for Flat ${flat.flat_no}:\n` +
                `• Base Rent: ₹${flat.rent.toLocaleString('en-IN')}\n` +
                `• Electricity Bill: ₹${electricity.toLocaleString('en-IN')}\n` +
                `• Water Bill: ₹${water.toLocaleString('en-IN')}\n` +
                `• Maintenance: ₹${maintenance.toLocaleString('en-IN')}\n` +
                `-----------------------------\n` +
                `📌 *Total Amount Due: ₹${totalDue.toLocaleString('en-IN')}*\n\n` +
                `Pay directly via GPay / PhonePe / Paytm using this locked UPI link:\n` +
                `upi://pay?pa=${DAD_UPI_ID}&pn=Property%20Owner&am=${totalDue}&cu=INR&tn=Rent%20for%20Flat%20${flat.flat_no}&amMode=0\n\n` +
                `Thank you!`
              );

              const whatsappUrl = `https://wa.me/${flat.phone}?text=${whatsappMessage}`;

              return (
                <div key={flat.flat_no} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">Flat {flat.flat_no}</span>
                        <h3 className="text-lg font-semibold text-gray-800">{flat.tenant_name}</h3>
                        <p className="text-xs text-gray-500">{flat.phone}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        flat.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                        flat.status === 'PARTIAL' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {flat.status}
                      </span>
                    </div>

                    {/* Bill Breakdown */}
                    <div className="bg-gray-50 p-3 rounded-xl text-xs space-y-1 mb-4 text-gray-600">
                      <div className="flex justify-between"><span>Base Rent:</span> <span>₹{flat.rent.toLocaleString('en-IN')}</span></div>
                      <div className="flex justify-between"><span>Electricity:</span> <span>₹{electricity.toLocaleString('en-IN')}</span></div>
                      <div className="flex justify-between"><span>Water:</span> <span>₹{water.toLocaleString('en-IN')}</span></div>
                      <div className="flex justify-between"><span>Maintenance:</span> <span>₹{maintenance.toLocaleString('en-IN')}</span></div>
                      <div className="border-t border-gray-200 pt-1 mt-1 flex justify-between font-bold text-gray-900">
                        <span>Total Due:</span> <span>₹{totalDue.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-3 rounded-xl text-xs font-medium text-center transition flex items-center justify-center gap-1.5"
                    >
                      💬 WhatsApp Bill
                    </a>
                    {flat.status !== 'PAID' ? (
                      <button
                        onClick={() => updateStatus(flat.flat_no, 'PAID', totalDue)}
                        className="flex-1 bg-gray-900 hover:bg-gray-800 text-white py-2 px-3 rounded-xl text-xs font-medium transition"
                      >
                        Mark Paid
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStatus(flat.flat_no, 'UNPAID', totalDue)}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-3 rounded-xl text-xs font-medium transition"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
