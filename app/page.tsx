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
    <main className="min-h-screen bg-slate-100 text-slate-900 p-4 sm:p-6 lg:p-10 font-sans selection:bg-indigo-600 selection:text-white">
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
            <button
              onClick={handleSignOut}
              className="flex-1 md:flex-none bg-red-50 hover:bg-red-100 text-red-700 font-semibold px-4 py-2.5 rounded-xl text-xs transition border border-red-200 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4 text-red-500" /> Sign Out
