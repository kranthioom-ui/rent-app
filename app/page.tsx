'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  DollarSign, 
  Clock, 
  Search, 
  FileText, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  LogOut,
  Send,
  SlidersHorizontal
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Dashboard() {
  const router = useRouter();

  const [flats, setFlats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const checkUserSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
    } else {
      fetchFlats();
    }
  };

  useEffect(() => {
    checkUserSession();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

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
    <main className="min-h-screen bg-[#090d16] text-slate-200 p-4 sm:p-6 lg:p-10 font-sans selection:bg-indigo-600 selection:text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Navbar Header */}
        <header className="bg-[#0f172a]/90 backdrop-blur-md border border-slate-800/80 rounded-xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-white">Rental Management Portal</h1>
                <p className="text-xs text-slate-400">Executive Overview & Portfolio Billing Command Center</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={handleExportPDF}
              className="flex-1 md:flex-none bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 font-medium px-3.5 py-2 rounded-lg text-xs transition border border-slate-700/70 flex items-center justify-center gap-2"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" /> Export PDF
            </button>
            <button
              onClick={handleMonthlyRefresh}
              className="flex-1 md:flex-none bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 font-medium px-3.5 py-2 rounded-lg text-xs transition border border-slate-700/70 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" /> Reset Cycle
            </button>
            <button
              onClick={handleSignOut}
              className="flex-1 md:flex-none bg-red-950/30 hover:bg-red-900/40 text-red-400 font-medium px-3.5 py-2 rounded-lg text-xs transition border border-red-900/40 flex items-center justify-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </header>

        {/* Financial Metrics Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#0f172a]/90 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Collected</span>
              <div className="text-2xl font-bold text-emerald-400">₹{totalCollected.toLocaleString('en-IN')}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#0f172a]/90 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Pending Dues</span>
              <div className="text-2xl font-bold text-amber-400">₹{totalPending.toLocaleString('en-IN')}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-[#0f172a]/90 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Collection Rate</span>
              <div className="text-2xl font-bold text-indigo-400">{collectionRate}%</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Toolbar: Search & Filter Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-[#0f172a]/90 p-3 rounded-xl border border-slate-800/80 shadow-sm">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by tenant name or flat number..."
              className="w-full bg-[#090d16] border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="flex gap-1 bg-[#090d16] p-1 rounded-lg border border-slate-800/80">
            {['ALL', 'PAID', 'PENDING'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition ${
                  statusFilter === status
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Flats Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
            <p className="text-xs font-medium">Fetching portfolio records...</p>
          </div>
        ) : filteredFlats.length === 0 ? (
          <div className="text-center py-16 bg-[#0f172a]/60 rounded-xl border border-slate-800 text-slate-400 text-xs">
            No flats matched the current filter criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                <div 
                  key={flat.flat_no} 
                  className="bg-[#0f172a]/90 rounded-xl p-5 border border-slate-800/80 shadow-sm hover:border-slate-700/80 transition flex flex-col justify-between space-y-5"
                >
                  {/* Card Header */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md">
                        Flat {flat.flat_no}
                      </span>
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 border ${
                        isPaid 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {flat.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <input
                        type="text"
                        value={flat.tenant_name || ''}
                        onChange={(e) => handleInputChange(flat.flat_no, 'tenant_name', e.target.value)}
                        onBlur={(e) => handleBlur(flat.flat_no, 'tenant_name', e.target.value)}
                        className="w-full font-semibold text-white bg-transparent border-b border-slate-800 focus:border-indigo-500 py-1 text-sm transition outline-none"
                        placeholder="Tenant Name"
                      />
                      <input
                        type="text"
                        value={flat.phone || ''}
                        onChange={(e) => handleInputChange(flat.flat_no, 'phone', e.target.value)}
                        onBlur={(e) => handleBlur(flat.flat_no, 'phone', e.target.value)}
                        className="w-full text-xs text-slate-400 bg-transparent py-0.5 transition outline-none font-mono focus:text-slate-200"
                        placeholder="+91 Phone Number"
                      />
                    </div>
                  </div>

                  {/* Clean Financial Breakdown Ledger */}
                  <div className="bg-[#090d16]/70 rounded-lg p-3.5 space-y-2.5 text-xs border border-slate-800/60">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Base Rent</span>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">₹</span>
                        <input
                          type="number"
                          value={flat.rent || ''}
                          onChange={(e) => handleInputChange(flat.flat_no, 'rent', parseFloat(e.target.value) || 0)}
                          onBlur={(e) => handleBlur(flat.flat_no, 'rent', parseFloat(e.target.value) || 0)}
                          className="w-20 bg-[#0f172a] border border-slate-800 rounded px-2 py-0.5 text-right font-medium text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-slate-400">
                      <span>Water Bill</span>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">₹</span>
                        <input
                          type="number"
                          value={flat.water_bill || ''}
                          onChange={(e) => handleInputChange(flat.flat_no, 'water_bill', parseFloat(e.target.value) || 0)}
                          onBlur={(e) => handleBlur(flat.flat_no, 'water_bill', parseFloat(e.target.value) || 0)}
                          className="w-20 bg-[#0f172a] border border-slate-800 rounded px-2 py-0.5 text-right font-medium text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-slate-400">
                      <span>Electricity</span>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">₹</span>
                        <input
                          type="number"
                          value={flat.electricity || ''}
                          onChange={(e) => handleInputChange(flat.flat_no, 'electricity', parseFloat(e.target.value) || 0)}
                          onBlur={(e) => handleBlur(flat.flat_no, 'electricity', parseFloat(e.target.value) || 0)}
                          className="w-20 bg-[#0f172a] border border-slate-800 rounded px-2 py-0.5 text-right font-medium text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-slate-400">
                      <span>Maintenance</span>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">₹</span>
                        <input
                          type="number"
                          value={flat.maintenance || ''}
                          onChange={(e) => handleInputChange(flat.flat_no, 'maintenance', parseFloat(e.target.value) || 0)}
                          onBlur={(e) => handleBlur(flat.flat_no, 'maintenance', parseFloat(e.target.value) || 0)}
                          className="w-20 bg-[#0f172a] border border-slate-800 rounded px-2 py-0.5 text-right font-medium text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="border-t border-slate-800 pt-2 flex justify-between items-center font-semibold text-white text-xs">
                      <span>Total Amount Due</span>
                      <span className="text-indigo-400 text-sm">₹{totalDue.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex gap-2 pt-1">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/30 font-medium py-2 px-3 rounded-lg text-xs text-center transition flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" /> Send WhatsApp
                    </a>
                    <button
                      onClick={() => handleStatusToggle(flat.flat_no, flat.status)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${
                        isPaid
                          ? 'border-slate-800 bg-[#090d16] text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                          : 'border-indigo-500/30 bg-indigo-600/15 text-indigo-300 hover:bg-indigo-600/25'
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
