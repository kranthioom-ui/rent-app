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
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">Hyderabad Rental Management</h1>
                <p className="text-xs font-medium text-slate-500">Executive Overview & Portfolio Billing Command Center</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <button
                onClick={handleBroadcastReminders}
                className="flex-1 md:flex-none bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold px-4 py-2.5 rounded-xl text-xs transition border border-emerald-200 shadow-sm flex items-center justify-center gap-2"
              >
                <Megaphone className="w-4 h-4 text-emerald-600" /> Broadcast Reminders
              </button>
              <button
                onClick={fetchArchivedHistory}
                className="flex-1 md:flex-none bg-white hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-xs transition border border-slate-200 shadow-sm flex items-center justify-center gap-2"
              >
                <Archive className="w-4 h-4 text-slate-500" /> View History
              </button>
              <button
                onClick={handleExportPDF}
                className="flex-1 md:flex-none bg-white hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-xs transition border border-slate-200 shadow-sm flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4 text-slate-500" /> Export PDF
              </button>
              <button
                onClick={handleMonthlyRefresh}
                className="flex-1 md:flex-none bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-4 py-2.5 rounded-xl text-xs transition border border-indigo-200 shadow-sm flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4 text-indigo-600" /> Reset Cycle
              </button>
            </div>
          </header>

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
                  className={`px-5 py-2 rounded-lg text-xs font-bold transition ${
                    statusFilter === status
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
              <p className="text-xs font-semibold">Fetching portfolio records...</p>
            </div>
          ) : filteredFlats.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs font-medium">
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
                    className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-5"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg">
                          Flat {flat.flat_no}
                        </span>
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${
                          isPaid 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                          {flat.status}
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <input
                          type="text"
                          value={flat.tenant_name || ''}
                          onChange={(e) => handleInputChange(flat.flat_no, 'tenant_name', e.target.value)}
                          onBlur={(e) => handleBlur(flat.flat_no, 'tenant_name', e.target.value)}
                          className="w-full font-bold text-slate-900 bg-transparent border-b border-slate-200 focus:border-indigo-600 py-1 text-sm transition outline-none"
                          placeholder="Tenant Name"
                        />
                        <input
                          type="text"
                          value={flat.phone || ''}
                          onChange={(e) => handleInputChange(flat.flat_no, 'phone', e.target.value)}
                          onBlur={(e) => handleBlur(flat.flat_no, 'phone', e.target.value)}
                          className="w-full text-xs font-semibold text-slate-900 bg-transparent py-0.5 transition outline-none font-mono focus:text-slate-900"
                          placeholder="+91 Phone Number"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 space-y-3 text-xs border border-slate-200/80">
                      <div className="flex justify-between items-center text-slate-900 font-medium">
                        <span>Base Rent</span>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500 font-semibold">₹</span>
                          <input
                            type="number"
                            value={flat.rent || ''}
                            onChange={(e) => handleInputChange(flat.flat_no, 'rent', parseFloat(e.target.value) || 0)}
                            onBlur={(e) => handleBlur(flat.flat_no, 'rent', parseFloat(e.target.value) || 0)}
                            className="w-24 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-right font-bold text-slate-900 focus:outline-none focus:border-indigo-600 shadow-sm"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-slate-900 font-medium">
                        <span>Water Bill</span>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500 font-semibold">₹</span>
                          <input
                            type="number"
                            value={flat.water_bill || ''}
                            onChange={(e) => handleInputChange(flat.flat_no, 'water_bill', parseFloat(e.target.value) || 0)}
                            onBlur={(e) => handleBlur(flat.flat_no, 'water_bill', parseFloat(e.target.value) || 0)}
                            className="w-24 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-right font-bold text-slate-900 focus:outline-none focus:border-indigo-600 shadow-sm"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-slate-900 font-medium">
                        <span>Electricity</span>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500 font-semibold">₹</span>
                          <input
                            type="number"
                            value={flat.electricity || ''}
                            onChange={(e) => handleInputChange(flat.flat_no, 'electricity', parseFloat(e.target.value) || 0)}
                            onBlur={(e) => handleBlur(flat.flat_no, 'electricity', parseFloat(e.target.value) || 0)}
                            className="w-24 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-right font-bold text-slate-900 focus:outline-none focus:border-indigo-600 shadow-sm"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-slate-900 font-medium">
                        <span>Maintenance</span>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500 font-semibold">₹</span>
                          <input
                            type="number"
                            value={flat.maintenance || ''}
                            onChange={(e) => handleInputChange(flat.flat_no, 'maintenance', parseFloat(e.target.value) || 0)}
                            onBlur={(e) => handleBlur(flat.flat_no, 'maintenance', parseFloat(e.target.value) || 0)}
                            className="w-24 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-right font-bold text-slate-900 focus:outline-none focus:border-indigo-600 shadow-sm"
                          />
                        </div>
                      </div>

                      <div className="border-t border-slate-300 pt-2.5 flex justify-between items-center font-bold text-slate-900 text-xs">
                        <span>Total Amount Due</span>
                        <span className="text-indigo-600 text-sm font-black">₹{totalDue.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="flex gap-2.5 pt-1">
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold py-2.5 px-3 rounded-xl text-xs text-center transition flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Send className="w-4 h-4 text-emerald-600" /> Send WhatsApp
                      </a>
                      <button
                        onClick={() => handleStatusToggle(flat.flat_no, flat.status)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition shadow-sm ${
                          isPaid
                            ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                            : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
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

      {/* ================= ARCHIVE HISTORY MODAL ================= */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-2xl max-w-4xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Archived Monthly Statements</h2>
                <p className="text-xs font-semibold text-slate-600">Historical records of previously reset billing cycles</p>
              </div>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="p-2 text-slate-500 hover:text-slate-800 rounded-xl border border-slate-300 hover:bg-slate-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {availableMonths.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs font-semibold">
                No archived records found. Records will automatically save here when you click "Reset Cycle".
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-800">Select Billing Month:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-900 font-black border-b border-slate-300">
                      <tr>
                        <th className="p-3">Flat</th>
                        <th className="p-3">Tenant Name</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3 text-right">Rent</th>
                        <th className="p-3 text-right">Water</th>
                        <th className="p-3 text-right">Elec.</th>
                        <th className="p-3 text-right">Maint.</th>
                        <th className="p-3 text-right">Total Due</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-900 font-semibold">
                      {selectedHistoryRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold">{r.flat_no}</td>
                          <td className="p-3">{r.tenant_name || '-'}</td>
                          <td className="p-3 font-mono">{r.phone || '-'}</td>
                          <td className="p-3 text-right">₹{(r.rent || 0).toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right">₹{(r.water_bill || 0).toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right">₹{(r.electricity || 0).toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right">₹{(r.maintenance || 0).toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right font-black text-indigo-700">₹{(r.total_due || 0).toLocaleString('en-IN')}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                              r.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
