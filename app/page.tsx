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

  const handleInputChange = (flat_no: string, field: string, value: any) => {
    setFlats((prevFlats) =>
      prevFlats.map((flat) =>
        flat.flat_no === flat_no ? { ...flat, [field]: value } : flat
      )
    );
  };

  const handleBlur = async (flat_no: string, field: string, value: any) => {
    const { error } = await supabase
      .from('flats')
      .update({ [field]: value })
      .eq('flat_no', flat_no);

    if (error) {
      console.error('Error updating flat:', error);
    }
  };

  const handleStatusToggle = async (flat_no: string, currentStatus: string) => {
    const newStatus = currentStatus === 'PAID' ? 'PENDING' : 'PAID';
    setFlats((prevFlats) =>
      prevFlats.map((flat) =>
        flat.flat_no === flat_no ? { ...flat, status: newStatus } : flat
      )
    );
    await supabase.from('flats').update({ status: newStatus }).eq('flat_no', flat_no);
  };

  const totalCollected = flats
    .filter((f) => f.status === 'PAID')
    .reduce((sum, f) => sum + (f.rent || 0) + (f.water_bill || 0) + (f.electricity || 0) + (f.maintenance || 0), 0);

  const totalPending = flats
    .filter((f) => f.status !== 'PAID')
    .reduce((sum, f) => sum + (f.rent || 0) + (f.water_bill || 0) + (f.electricity || 0) + (f.maintenance || 0), 0);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-6 sm:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold tracking-wide uppercase">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
              Live Portal
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Rental Management</h1>
            <p className="text-sm text-slate-500">Real-time tenant billing, utility tracking, and automated WhatsApp delivery.</p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
              <span className="block text-xs font-medium text-slate-400">Total Collected</span>
              <span className="text-lg font-bold text-emerald-600">₹{totalCollected.toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
              <span className="block text-xs font-medium text-slate-400">Pending Dues</span>
              <span className="text-lg font-bold text-amber-600">₹{totalPending.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center py-32 text-slate-400 text-sm font-medium">
            Loading property details...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {flats.map((flat) => {
              const rent = flat.rent || 0;
              const water = flat.water_bill || 0;
              const electricity = flat.electricity || 0;
              const maintenance = flat.maintenance || 0;
              const totalDue = rent + water + electricity + maintenance;
              const isPaid = flat.status === 'PAID';

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
                <div key={flat.flat_no} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col justify-between space-y-6">
                  
                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="text-xs font-bold uppercase tracking-wider text-indigo-600">Flat {flat.flat_no}</div>
                      <input
                        type="text"
                        value={flat.tenant_name || ''}
                        onChange={(e) => handleInputChange(flat.flat_no, 'tenant_name', e.target.value)}
                        onBlur={(e) => handleBlur(flat.flat_no, 'tenant_name', e.target.value)}
                        className="w-full font-bold text-slate-800 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-indigo-500 rounded-lg px-2 py-1 text-base transition outline-none"
                        placeholder="Tenant Name"
                      />
                      <input
                        type="text"
                        value={flat.phone || ''}
                        onChange={(e) => handleInputChange(flat.flat_no, 'phone', e.target.value)}
                        onBlur={(e) => handleBlur(flat.flat_no, 'phone', e.target.value)}
                        className="w-full text-xs text-slate-400 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-indigo-500 rounded-lg px-2 py-0.5 transition outline-none font-mono"
                        placeholder="Phone Number"
                      />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold tracking-wide ${
                      isPaid ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                    }`}>
                      {flat.status}
                    </span>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="bg-slate-50/70 p-4 rounded-2xl space-y-3 text-xs border border-slate-100">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Base Rent</span>
                      <input
                        type="number"
                        value={flat.rent || ''}
                        onChange={(e) => handleInputChange(flat.flat_no, 'rent', parseFloat(e.target.value) || 0)}
                        onBlur={(e) => handleBlur(flat.flat_no, 'rent', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-right font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
                      />
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Water Bill</span>
                      <input
                        type="number"
                        value={flat.water_bill || ''}
                        onChange={(e) => handleInputChange(flat.flat_no, 'water_bill', parseFloat(e.target.value) || 0)}
                        onBlur={(e) => handleBlur(flat.flat_no, 'water_bill', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-right font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
                      />
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Electricity</span>
                      <input
                        type="number"
                        value={flat.electricity || ''}
                        onChange={(e) => handleInputChange(flat.flat_no, 'electricity', parseFloat(e.target.value) || 0)}
                        onBlur={(e) => handleBlur(flat.flat_no, 'electricity', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-right font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
                      />
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Maintenance</span>
                      <input
                        type="number"
                        value={flat.maintenance || ''}
                        onChange={(e) => handleInputChange(flat.flat_no, 'maintenance', parseFloat(e.target.value) || 0)}
                        onBlur={(e) => handleBlur(flat.flat_no, 'maintenance', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-right font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs"
                      />
                    </div>
                    
                    <div className="border-t border-slate-200/80 pt-3 flex justify-between items-center font-bold text-slate-900 text-sm">
                      <span>Total Due</span>
                      <span className="text-indigo-600">₹{totalDue.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2.5 pt-1">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl text-xs text-center transition-all shadow-sm hover:shadow flex items-center justify-center gap-2"
                    >
                      💬 WhatsApp Bill
                    </a>
                    <button
                      onClick={() => handleStatusToggle(flat.flat_no, flat.status)}
                      className={`px-4 py-3 rounded-xl text-xs font-semibold border transition-all ${
                        isPaid
                          ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          : 'border-indigo-600 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-50'
                      }`}
                    >
                      {isPaid ? 'Mark Pending' : 'Mark Paid'}
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
