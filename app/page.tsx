'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Building2, 
  DollarSign, 
  Clock, 
  Search, 
  FileText, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Send
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Dashboard() {
  const [flats, setFlats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Load flats immediately on page load without requiring any login or password
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
    <>
      {/* ================= PRINT-ONLY SINGLE PAGE TABLE (Hidden on screen, shown on PDF print) ================= */}
      <div className="hidden print:block p-6 bg-white text-black font-sans text-xs">
        <div className="mb-4 text-center border-b pb-3">
          <h1 className="text-lg font-bold">Hyderabad Rental Management - Portfolio Statement</h1>
          <p className="text-slate-500">Summary Ledger Overview</p>
        </div>
        <table className="w-full border-collapse border border-slate-300 text-left">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="p-2 border border-slate-300">Flat</th>
              <th className="p-2 border border-slate-300">Tenant Name</th>
              <th className="p-2 border border-slate-300">Phone</th>
              <th className="p-2 border border-slate-300 text-right">Rent</th>
              <th className="p-2 border border-slate-300 text-right">Water</th>
              <th className="p-2 border border-slate-300 text-right">Electricity</th>
              <th className="p-2 border border-slate-300 text-right">Maint.</th>
              <th className="p-2 border border-slate-300 text-right">Total Due</th>
              <th className="p-2 border border-slate-300 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {flats.map((flat) => {
              const rent = flat.rent || 0;
              const water = flat.water_bill || 0;
              const electricity = flat.electricity || 0;
              const maintenance = flat.maintenance || 0;
              const totalDue = rent + water + electricity + maintenance;
              return (
                <tr key={flat.flat_no} className="border-b border-slate-200">
                  <td className="p-2 border border-slate-300 font-bold">{flat.flat_no}</td>
                  <td className="p-2 border border-slate-300">{flat.tenant_name || '-'}</td>
                  <td className="p-2 border border-slate-300 font-mono">{flat.phone || '-'}</td>
                  <td className="p-2 border border-slate-300 text-right">₹{rent.toLocaleString('en-IN')}</td>
                  <td className="p-2 border border-slate-300 text-right">₹{water.toLocaleString('en-IN')}</td>
                  <td className="p-2 border border-slate-300 text-right">₹{electricity.toLocaleString('en-IN')}</td>
                  <td className="p-2 border border-slate-300 text-right">₹{maintenance.toLocaleString('en-IN')}</td>
                  <td className="p-2 border border-slate-300 text-right font-bold text-indigo-700">₹{totalDue.toLocaleString('en-IN')}</td>
                  <td className="p-2 border border-slate-300 text-center font-bold">{flat.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-4 flex justify-between font-bold pt-2 border-t border-slate-300">
          <span>Total Collected: ₹{totalCollected.toLocaleString('en-IN')}</span>
          <span>Total Pending: ₹{totalPending.toLocaleString('en-IN')}</span>
          <span>Collection Rate: {collectionRate}%</span>
        </div>
      </div>

      {/* ================= NORMAL SCREEN DASHBOARD ================= */}
      <main className="print:hidden min-h-screen bg-slate-100 text-slate-900 p-4 sm:p-6 lg:p-10 font-sans selection:bg-indigo-600 selection:text-white">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Top Navbar Header */}
          <header className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">Hyderabad Rental Management</h1>
                  <p className="text-xs font-medium text-slate-500">Executive Overview & Portfolio Billing Command Center</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <button
                onClick={handleExportPDF}
                className="flex-1 md:flex-none bg-white hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-xs transition border border-slate-200 shadow-sm flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4 text-slate-500" /> Export PDF
              </button>
              <button
                onClick={handleMonthlyRefresh}
                className="flex-1 md:flex-none bg-white hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-xs transition border border-slate-200 shadow-sm flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4 text-slate-500" /> Reset Cycle
              </button>
            </div>
          </header>

          {/* Financial Metrics Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Collected</span>
                <div className="text-2xl font-black text-emerald-600">₹{totalCollected.toLocaleString('en-IN')}</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Dues</span>
                <div className="text-2xl font-black text-amber-600">₹{totalPending.toLocaleString('en-IN')}</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Collection Rate</span>
                <div className="text-2xl font-black text-indigo-600">{collectionRate}%</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Building2 className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Toolbar: Search & Filter Tabs */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-sm">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by tenant name or flat number..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
              />
            </div>

            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              {['ALL', 'PAID', 'PENDING'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-5
