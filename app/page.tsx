'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  FileText, 
  RefreshCw, 
  LogOut,
  Send,
  ArrowUpRight,
  ShieldAlert,
  CheckCircle2
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
    if (!confirm('Reset all flat statuses to PENDING for the new cycle?')) return;
    
    setLoading(true);
    const { error } = await supabase.from('flats').update({ status: 'PENDING' }).neq('flat_no', '');
    if (error) {
      console.error('Error resetting status:', error);
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
    <main className="min-h-screen bg-[#050507] text-[#ededed] p-6 lg:p-12 font-mono selection:bg-zinc-800 selection:text-white">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Minimalist Engineering Header */}
        <header className="border-b border-zinc-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="space-y-1">
            <div className="text-[11px] text-zinc-500 uppercase tracking-widest font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Hyderabad Portfolio Manager // v2.4
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-sans">Rental Operations</h1>
          </div>
          
          <div className="flex items-center gap-3 text-xs font-mono">
            <button
              onClick={handleExportPDF}
              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-3.5 py-2 rounded border border-zinc-800 transition flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-zinc-400" /> Export PDF
            </button>
            <button
              onClick={handleMonthlyRefresh}
              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-3.5 py-2 rounded border border-zinc-800 transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-zinc-400" /> Cycle Reset
            </button>
            <button
              onClick={handleSignOut}
              className="text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-950/40 px-3.5 py-2 rounded border border-red-900/30 transition flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </header>

        {/* Financial Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-zinc-800 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="bg-[#09090b] p-5 space-y-1">
            <div className="text-[11px] text-zinc-500 uppercase tracking-wider">Total Collected</div>
            <div className="text-xl font-bold text-emerald-400 font-sans">₹{totalCollected.toLocaleString('en-IN')}</div>
          </div>
          <div className="bg-[#09090b] p-5 space-y-1">
            <div className="text-[11px] text-zinc-500 uppercase tracking-wider">Pending Dues</div>
            <div className="text-xl font-bold text-amber-400 font-sans">₹{totalPending.toLocaleString('en-IN')}</div>
          </div>
          <div className="bg-[#09090b] p-5 space-y-1">
            <div className="text-[11px] text-zinc-500 uppercase tracking-wider">Collection Rate</div>
            <div className="text-xl font-bold text-zinc-100 font-sans">{collectionRate}%</div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tenant or flat number..."
              className="w-full bg-[#09090b] border border-zinc-800 rounded px-3.5 pl-9 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition"
            />
          </div>

          <div className="flex gap-1 bg-[#09090b] p-0.5 rounded border border-zinc-800">
            {['ALL', 'PAID', 'PENDING'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded text-[11px] font-medium transition ${
                  statusFilter === status
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Flats Grid */}
        {loading ? (
          <div className="text-center py-20 text-zinc-600 text-xs">Loading ledger...</div>
        ) : filteredFlats.length === 0 ? (
          <div className="text-center py-20 text-zinc-600 text-xs border border-zinc-800 rounded-lg">No records found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  className="bg-[#09090b] rounded-lg p-5 border border-zinc-800 flex flex-col justify-between space-y-5"
                >
                  {/* Card Top */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-zinc-400 tracking-wider">
                        FLAT {flat.flat_no}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                        isPaid ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50' : 'bg-amber-950/40 text-amber-400 border border-amber-900/50'
                      }`}>
                        {flat.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <input
                        type="text"
                        value={flat.tenant_name || ''}
                        onChange={(e) => handleInputChange(flat.flat_no, 'tenant_name', e.target.value)}
                        onBlur={(e) => handleBlur(flat.flat_no, 'tenant_name', e.target.value)}
                        className="w-full font-sans font-semibold text-white bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-zinc-500 py-0.5 text-sm transition outline-none"
                        placeholder="Tenant Name"
                      />
                      <input
                        type="text"
                        value={flat.phone || ''}
                        onChange={(e) => handleInputChange(flat.flat_no, 'phone', e.target.value)}
                        onBlur={(e) => handleBlur(flat.flat_no, 'phone', e.target.value)}
                        className="w-full text-[11px] text-zinc-500 bg-transparent py-0.5 outline-none font-mono focus:text-zinc-300"
                        placeholder="Phone Number"
                      />
                    </div>
                  </div>

                  {/* Financial Breakdown Table */}
                  <div className="bg-[#050507] rounded p-3 space-y-2 text-xs border border-zinc-800/80">
                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Base Rent</span>
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-600">₹</span>
                        <input
                          type="number"
                          value={flat.rent || ''}
                          onChange={(e) => handleInputChange(flat.flat_no, 'rent', parseFloat(e.target.value) || 0)}
                          onBlur={(e) => handleBlur(flat.flat_no, 'rent', parseFloat(e.target.value) || 0)}
                          className="w-20 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-right font-mono text-zinc-200 focus:outline-none focus:border-zinc-600"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Water Bill</span>
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-600">₹</span>
                        <input
                          type="number"
                          value={flat.water_bill || ''}
                          onChange={(e) => handleInputChange(flat.flat_no, 'water_bill', parseFloat(e.target.value) || 0)}
                          onBlur={(e) => handleBlur(flat.flat_no, 'water_bill', parseFloat(e.target.value) || 0)}
                          className="w-20 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-right font-mono text-zinc-200 focus:outline-none focus:border-zinc-600"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Electricity</span>
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-600">₹</span>
                        <input
                          type="number"
                          value={flat.electricity || ''}
                          onChange={(e) => handleInputChange(flat.flat_no, 'electricity', parseFloat(e.target.value) || 0)}
                          onBlur={(e) => handleBlur(flat.flat_no, 'electricity', parseFloat(e.target.value) || 0)}
                          className="w-20 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-right font-mono text-zinc-200 focus:outline-none focus:border-zinc-600"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-zinc-400">
                      <span>Maintenance</span>
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-600">₹</span>
                        <input
                          type="number"
                          value={flat.maintenance || ''}
                          onChange={(e) => handleInputChange(flat.flat_no, 'maintenance', parseFloat(e.target.value) || 0)}
                          onBlur={(e) => handleBlur(flat.flat_no, 'maintenance', parseFloat(e.target.value) || 0)}
                          className="w-20 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-right font-mono text-zinc-200 focus:outline-none focus:border-zinc-600"
                        />
                      </div>
                    </div>

                    <div className="border-t border-zinc-800 pt-2 flex justify-between items-center font-bold text-white text-xs">
                      <span>Total Due</span>
                      <span className="font-mono text-emerald-400">₹{totalDue.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-medium py-2 px-3 rounded text-[11px] text-center transition flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3 h-3 text-zinc-500" /> WhatsApp
                    </a>
                    <button
                      onClick={() => handleStatusToggle(flat.flat_no, flat.status)}
                      className={`px-3 py-2 rounded text-[11px] font-medium border transition ${
                        isPaid
                          ? 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white'
                          : 'border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700'
                      }`}
                    >
                      {isPaid ? 'Set Pending' : 'Set Paid'}
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
