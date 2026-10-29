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
  X,
  Eye
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
    const newTimestamp = newStatus === 'PAID' ? new Date().toISOString() : null;

    setFlats((prevFlats) =>
      prevFlats.map((flat) =>
        flat.flat_no === flat_no ? { ...flat, status: newStatus, paid_at: newTimestamp } : flat
      )
    );
    await supabase.from('flats').update({ status: newStatus, paid_at: newTimestamp }).eq('flat_no', flat_no);
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
        status: flat.status,
        paid_at: flat.paid_at
      };
    });

    const { error: archiveError } = await supabase.from('monthly_archive').insert(archiveData);
    if (archiveError) {
      console.error('Error archiving monthly data:', archiveError);
      alert('Failed to archive records. Please check that the monthly_archive table exists in Supabase.');
      setLoading(false);
      return;
    }

    const { error: resetError } = await supabase.from('flats').update({ status: 'PENDING', paid_at: null, receipt_url: null }).neq('flat_no', '');
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
          `Hello ${flat.tenant_name || 'Tenant'},\n\n` +
          `Here is your itemized rent bill breakdown for Flat ${flat.flat_no}:\n` +
          `- Base Rent: ₹${rent.toLocaleString('en-IN')}\n` +
          `- Water Bill: ₹${water.toLocaleString('en-IN')}\n` +
          `- Electricity: ₹${electricity.toLocaleString('en-IN')}\n` +
          `- Maintenance: ₹${maintenance.toLocaleString('en-IN')}\n` +
          `--------------------\n` +
          `Total Amount Due: ₹${totalDue.toLocaleString('en-IN')}\n\n` +
          `UPI ID: balu2882@ybl\n\n` +
          `Note: Please do not pay using GPay. Kindly use PhonePe, Paytm, or another UPI app.\n` +
          `Note: If you face any technical issues while paying, please let me know.\n\n` +
          `Pay securely online and upload your payment receipt here:\n` +
          `https://rent-app-mauve.vercel.app/pay/${flat.flat_no}\n\n` +
          `Thank you,\n` +
          `Balakrishna`
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
    if (statusFilter === 'VERIFYING') return matchesSearch && flat.status === 'VERIFYING';
    if (statusFilter === 'PENDING') return matchesSearch && flat.status !== 'PAID' && flat.status !== 'VERIFYING';
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
              <th className="p-2 border border-slate-300 text-center">Paid At</th>
            </tr>
          </thead>
          <tbody>
            {flats.map((flat) => {
              const rent = flat.rent || 0;
              const water = flat.water_bill || 0;
              const electricity = flat.electricity || 0;
              const maintenance = flat.maintenance || 0;
              const totalDue = rent + water + electricity + maintenance;
              const formattedDate = flat.paid_at ? new Date(flat.paid_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '-';
              return (
                <tr key={flat.flat_no} className="border-b border-slate-200">
                  <td className="p
