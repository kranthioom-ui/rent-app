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
  Send,
  Archive,
  Megaphone,
  X
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Dashboard() {
  const [flats, setFlats] = useState<any[]>([]);
  const [archivedRecords, setArchivedRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('');

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

  const fetchArchivedHistory = async () => {
    const { data, error } = await supabase.from('monthly_archive').select('*').order('archived_at', { ascending: false });
    if (error) {
      console.error('Error fetching history:', error);
    } else {
      setArchivedRecords(data || []);
      if (data && data.length > 0) {
        setSelectedMonth(data[0].month_year);
      }
    }
    setShowHistoryModal(true);
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
    const currentMonthLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    
    if (!confirm(`This will archive all current records under "${currentMonthLabel}" and reset all flat statuses to PENDING for the new billing cycle. Continue?`)) return;
    
    setLoading(true);

    const archiveData = flats.map((flat) => {
      const rent = flat.rent || 0;
      const water = flat.water_bill || 0;
      const electricity = flat.electricity || 0;
      const maintenance = flat.maintenance || 0;
      return {
        month_year: currentMonthLabel,
        flat_no: String(flat.flat_no),
        tenant_name: flat.tenant_name,
        phone: flat.phone,
        rent,
        water_bill: water,
        electricity,
        maintenance,
        total_due: rent + water + electricity + maintenance,
        status: flat.status
      };
    });

    const { error: archiveError } = await supabase.from('monthly_archive').insert(archiveData);
    if (archiveError) {
      console.error('Error archiving monthly data:', archiveError);
      alert('Failed to archive records. Please check that the monthly_archive table exists in Supabase.');
      setLoading(false);
      return;
    }

    const { error: resetError } = await supabase.from('flats').update({ status: 'PENDING' }).neq('flat_no', '');
    if (resetError) {
      console.error('Error resetting monthly status:', resetError);
    } else {
      alert(`Records successfully archived for ${currentMonthLabel} and new cycle started!`);
      fetchFlats();
    }
  };

  const handleBroadcastReminders = () => {
    const pendingFlats = flats.filter((f) => f.status !== 'PAID' && f.phone);

    if (pendingFlats.length === 0) {
      alert('No pending tenants with valid phone numbers found!');
      return;
    }

    if (confirm(`Send WhatsApp reminder links for ${pendingFlats.length} pending tenant(s)?`)) {
      pendingFlats.forEach((flat, index) => {
        const rent = flat.rent || 0;
        const water = flat.water_bill || 0;
        const electricity = flat.electricity || 0;
        const maintenance = flat.maintenance || 0;
        const totalDue = rent + water + electricity + maintenance;

        const whatsappMessage = encodeURIComponent(
          `Hello ${flat.tenant_name},\n\n` +
          `This is a friendly reminder for your outstanding rent bill for Flat ${flat.flat_no}:\n` +
          `• Total Due: ₹${totalDue.toLocaleString('en-IN')}\n\n` +
          `Pay securely online here:\n` +
          `https://rent-app-mauve.vercel.app/pay/${flat.flat_no}\n\n` +
          `Thank you!`
        );

        const url = `https://wa.me/${flat.phone}?text=${whatsappMessage}`;
        
        setTimeout(() => {
          window.open(url, '_blank');
        }, index * 800);
      });
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

  const availableMonths = Array.from(new Set(archivedRecords.map((r) => r.month_year)));
  const selectedHistoryRecords = archivedRecords.filter((r) => r.month_year === selectedMonth);

  return (
    <>
      {/* ================= PRINT-ONLY SINGLE PAGE TABLE ================= */}
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
           
          <header className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-
