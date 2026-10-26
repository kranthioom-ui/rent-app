'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Building2, 
  Users, 
  DollarSign, 
  Clock, 
  Search, 
  Filter, 
  FileText, 
  RefreshCw, 
  Phone, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  ArrowUpRight
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Dashboard() {
  const [flats, setFlats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

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

  const handleMonthlyRefresh = async () => {
    if (!confirm('Are you sure you want to reset all flat statuses to PENDING for the new billing cycle?')) return;
    
    setLoading(true);
    const { error } = await supabase.from('flats').update({ status: 'PENDING' }).neq('flat_no', '');
    if (error) {
      console.error('Error resetting monthly status:', error);
    } else {
      fetchFlats();
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const filteredFlats = flats.filter((flat) => {
    const matchesSearch =
      flat.tenant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(flat.flat_no).includes(searchQuery);
    
    if (statusFilter === 'PAID') return matchesSearch && flat.status === 'PAID';
    if (statusFilter === 'PENDING') return matchesSearch && flat.status !== 'PAID';
    return matchesSearch;
  });

  const totalCollected = flats
    .filter((f) => f.status === 'PAID')
    .reduce((sum, f) => sum + (f.rent || 0) + (f.water_bill || 0) + (f.electricity || 0) + (f.maintenance || 0), 0);

  const totalPending = flats
    .filter((f) => f.status !== 'PAID')
    .reduce((sum, f) => sum + (f.rent || 0) + (f.water_bill || 0) + (f.electricity || 0) + (f.maintenance || 0), 0);

  const totalExpected = totalCollected + totalPending;
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 lg:p-12 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header & Metrics Overview */}
        <header className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold tracking-wider uppercase border border-indigo-500/20">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                Executive Command Center
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">Rental Management Portal</h1>
              <p className="text-sm text-slate-400">Streamlined property billing, automated WhatsApp invoicing, and Razorpay settlements.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <button
                onClick={handleExportPDF}
                className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-5 py-3 rounded-2xl text-xs transition border border-slate-700 flex items-center justify-center gap-2 shadow-lg"
              >
                <FileText className="w-4 h-4 text-indigo-400" /> Export PDF Report
              </button>
              <button
                onClick={handleMonthlyRefresh}
                className="flex-1 sm:flex-none bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-semibold px-5 py-3 rounded-2xl text-xs transition border border-indigo-500/30 flex items-center justify-center gap-2 shadow-lg"
              >
                <RefreshCw className="w-4 h-4" /> Monthly Cycle Reset
              </button>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
            <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-400">Total Collected</span>
                <div className="text-2xl font-black text-emerald-400 mt-1">₹{totalCollected.toLocaleString('en-IN')}</div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-400">Pending Dues</span>
                <div className="text-2xl font-black text-amber-400 mt-1">₹{totalPending.toLocaleString('en-IN')}</div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-400">Collection Progress</span>
                <div className="text-2xl font-black text-indigo-400 mt-1">{collectionRate}%</div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Building2 className="w-6 h-6" />
              </div>
            </div>
          </div>
        </header>

        {/* Search & Filters Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-900/80 backdrop-blur-xl p-4 sm:p-6 rounded-3xl border border-slate-800 shadow-xl">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by tenant name or flat number..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="flex gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            {['ALL', 'PAID', 'PENDING'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === status
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Flats Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-500 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm font-medium">Loading property ledger...</p>
          </div>
        ) : filteredFlats.length === 0 ? (
          <div className="text-center py-24 bg-slate-900/50 rounded-3xl border border-slate-800 text-slate-400 text-sm">
            No flats found matching your search criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFlats.map((flat) => {
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
                <div key={flat.flat_no} className="bg-slate-900/90 backdrop-blur-xl rounded-3xl p-6 border border-slate-800 shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between space-y-6">
                  
                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="text-xs font-bold uppercase tracking-widest text-indigo-400">Flat {flat.flat_no}</div>
                      <input
                        type="text"
                        value={flat.tenant_name || ''}
                        onChange={(e) => handleInputChange(flat.flat_no, 'tenant_name', e.target.value)}
                        onBlur={(e) => handleBlur(flat.flat_no, 'tenant_name', e.target.value)}
                        className="w-full font-bold text-white bg-slate-950/50 hover:bg-slate-950 focus:bg-slate-950 border border-transparent hover:border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-base transition outline-none"
                        placeholder="Tenant Name"
                      />
                      <input
                        type="text"
                        value={flat.phone || ''}
                        onChange={(e) => handleInputChange(flat.flat_no, 'phone', e.target.value)}
                        onBlur={(e) => handleBlur(flat.flat_no, 'phone', e.target.value)}
                        className="w-full text-xs text-slate-400 bg-slate-950/30 hover:bg-slate-950 focus:bg-slate-950 border border-transparent hover:border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-1 transition outline-none font-mono"
                        placeholder="Phone Number"
                      />
                    </div>
                    <span className={`px-3.5 py-1.5 rounded-full text-xs font-black tracking-wider flex items-center gap-1.5 ${
                      isPaid ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {isPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                      {flat.status}
                    </span>
                  </div>

                  {/* Financial Breakdown Box */}
                  <div className="bg-slate-950/60 p-4 rounded-2xl space-y-3 text-xs border border-slate-800/80">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Base Rent</span>
                      <input
                        type="number"
                        value={flat.rent || ''}
                        onChange={(e) => handleInputChange(flat.flat_no, 'rent', parseFloat(e.target.value) || 0)}
                        onBlur={(e) => handleBlur(flat.flat_no, 'rent', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1 text-right font-semibold text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Water Bill</span>
                      <input
                        type="number"
                        value={flat.water_bill || ''}
                        onChange={(e) => handleInputChange(flat.flat_no, 'water_bill', parseFloat(e.target.value) || 0)}
                        onBlur={(e) => handleBlur(flat.flat_no, 'water_bill', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1 text-right font-semibold text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Electricity</span>
                      <input
                        type="number"
                        value={flat.electricity || ''}
                        onChange={(e) => handleInputChange(flat.flat_no, 'electricity', parseFloat(e.target.value) || 0)}
                        onBlur={(e) => handleBlur(flat.flat_no, 'electricity', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1 text-right font-semibold text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Maintenance</span>
                      <input
                        type="number"
                        value={flat.maintenance || ''}
                        onChange={(e) => handleInputChange(flat.flat_no, 'maintenance', parseFloat(e.target.value) || 0)}
                        onBlur={(e) => handleBlur(flat.flat_no, 'maintenance', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1 text-right font-semibold text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    
                    <div className="border-t border-slate-800 pt-3 flex justify-between items-center font-bold text-white text-sm">
                      <span>Total Due</span>
                      <span className="text-indigo-400 text-base">₹{totalDue.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-1">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-2xl text-xs text-center transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                    >
                      💬 WhatsApp Bill
                    </a>
                    <button
                      onClick={() => handleStatusToggle(flat.flat_no, flat.status)}
                      className={`px-4 py-3 rounded-2xl text-xs font-semibold border transition ${
                        isPaid
                          ? 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'
                          : 'border-indigo-500/30 bg-indigo-600/10 text-indigo-300 hover:bg-indigo-600/20'
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
