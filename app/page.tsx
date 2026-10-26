'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
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
  ArrowUpRight,
  LogOut
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

  // Check if the user has an active session, otherwise redirect to login
  const checkUserSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
    } else {
      fetchFlats();
    }
  };

  // Trigger session check on page load
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
              <button
                onClick={handleSignOut}
                className="flex-1 sm:flex-none bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold px-5 py-3 rounded-2xl text-xs transition border border-red-500/20 flex items-center justify-center gap-2 shadow-lg"
              >
                <LogOut className="w-4 h-4" /> Sign Out
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
                <div className="text-2xl font-black text-amber-
