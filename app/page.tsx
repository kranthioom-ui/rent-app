'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Dashboard() {
  const [flats, setFlats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFlats();
  }, []);

  const fetchFlats = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('flats').select('*').order('flat_no', { ascending: true });
    if (error) {
      console.error('Error fetching flats:', error);
    } else {
      setFlats(data || []);
    }
    setLoading(false);
  };

  const handleUpdate = async (flat_no: string, field: string, value: any) => {
    const { error } = await supabase
      .from('flats')
      .update({ [field]: value })
      .eq('flat_no', flat_no);

    if (error) {
      console.error('Error updating flat:', error);
    } else {
      fetchFlats();
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 sm:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Rental Management Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage tenants, update details, track utility bills, and send WhatsApp payment links.</p>
          </div>
          <div className="bg-emerald-50 text-emerald-800 text-xs font-semibold px-4 py-2 rounded-xl border border-emerald-100">
            Connected to Supabase Live
          </div>
        </header>

        {loading ? (
          <div className="text-center py-20 text-gray-500 text-sm">Loading flats...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {flats.map((flat) => {
              const rent = flat.rent || 0;
              const water = flat.water_bill || 0;
              const electricity = flat.electricity || 0;
              const maintenance = flat.maintenance || 0;
              const totalDue = rent + water + electricity + maintenance;

              const whatsappMessage = encodeURIComponent(
                `Hello ${flat.tenant_name},\n\n` +
                `Here is your itemized rent bill breakdown for Flat ${flat.flat_no}:\n` +
                `• Base Rent: ₹${rent.toLocaleString('en-IN')}\n` +
                `• Water Bill: ₹${water.toLocaleString('en-IN')}\n` +
                `• Electricity: ₹${electricity.toLocaleString('en-IN')}\n` +
                `• Maintenance: ₹${maintenance.toLocaleString('en-IN')}\n` +
                `--------------------\n` +
                `❖ Total Amount Due: ₹${totalDue.toLocaleString('en-IN')}\n\n` +
                `Pay securely online here:\n` +
                `https://rent-app-mauve.vercel.app/pay/${flat.flat_no}\n\n` +
                `Thank you!`
              );

              const whatsappUrl = `https://wa.me/${flat.phone}?text=${whatsappMessage}`;

              return (
                <div key={flat.flat_no} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Flat {flat.flat_no}</span>
                      <input
                        type="text"
                        value={flat.tenant_name || ''}
                        onChange={(e) => handleUpdate(flat.flat_no, 'tenant_name', e.target.value)}
                        className="block mt-1 font-semibold text-gray-800 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-emerald-500"
                        placeholder="Tenant Name"
                      />
                      <input
                        type="text"
                        value={flat.phone || ''}
                        onChange={(e) => handleUpdate(flat.flat_no, 'phone', e.target.value)}
                        className="block mt-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-emerald-500"
                        placeholder="Phone (e.g. 919878901234)"
                      />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      flat.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {flat.status}
                    </span>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl text-xs space-y-2 text-gray-600 border border-gray-100">
                    <div className="flex justify-between items-center">
                      <span>Base Rent:</span>
                      <input
                        type="number"
                        value={flat.rent || ''}
                        onChange={(e) => handleUpdate(flat.flat_no, 'rent', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-white border border-gray-200 rounded px-2 py-1 text-right font-medium text-gray-800 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Water Bill:</span>
                      <input
                        type="number"
                        value={flat.water_bill || ''}
                        onChange={(e) => handleUpdate(flat.flat_no, 'water_bill', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-white border border-gray-200 rounded px-2 py-1 text-right font-medium text-gray-800 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Electricity:</span>
                      <input
                        type="number"
                        value={flat.electricity || ''}
                        onChange={(e) => handleUpdate(flat.flat_no, 'electricity', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-white border border-gray-200 rounded px-2 py-1 text-right font-medium text-gray-800 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Maintenance:</span>
                      <input
                        type="number"
                        value={flat.maintenance || ''}
                        onChange={(e) => handleUpdate(flat.flat_no, 'maintenance', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-white border border-gray-200 rounded px-2 py-1 text-right font-medium text-gray-800 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-gray-900 text-sm">
                      <span>Total Due:</span>
                      <span>₹{totalDue.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs text-center transition shadow-sm flex items-center justify-center gap-2"
                    >
                      💬 Send WhatsApp Bill
                    </a>
                    <button
                      onClick={() => handleUpdate(flat.flat_no, 'status', flat.status === 'PAID' ? 'PENDING' : 'PAID')}
                      className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition ${
                        flat.status === 'PAID'
                          ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          : 'border-emerald-600 text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      Mark {flat.status === 'PAID' ? 'Pending' : 'Paid'}
                    </button>
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
