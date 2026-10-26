'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DAD_UPI_ID = "your-upi-id@upi"; 

interface Flat {
  flat_no: string;
  tenant_name: string;
  phone: string;
  rent: number;
  water_bill: number;
  electricity: number;
  maintenance: number;
  status: 'PAID' | 'UNPAID';
  paid_amount: number;
}

export default function RentalDashboard() {
  const [flats, setFlats] = useState<Flat[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFlat, setEditingFlat] = useState<Flat | null>(null);
  const [qrFlat, setQrFlat] = useState<Flat | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');

  const fetchFlats = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('flats').select('*').order('flat_no', { ascending: true });
    if (error) console.error('Error fetching flats:', error);
    else {
      const mapped = (data || []).map((item: any) => ({
        flat_no: item.flat_no || item.flat_number || '',
        tenant_name: item.tenant_name || '',
        phone: item.phone || '',
        rent: Number(item.rent) || 0,
        water_bill: Number(item.water_bill) || 0,
        electricity: Number(item.electricity) || 0,
        maintenance: Number(item.maintenance) || 0,
        status: item.status || 'UNPAID',
        paid_amount: Number(item.paid_amount) || 0,
      }));
      setFlats(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFlats();
    setCurrentMonth(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));
  }, []);

  const updateStatus = async (flat_no: string, status: 'PAID' | 'UNPAID', totalAmount: number) => {
    const paid_amount = status === 'PAID' ? totalAmount : 0;
    const { error } = await supabase
      .from('flats')
      .update({ status, paid_amount })
      .eq('flat_no', flat_no);

    if (error) console.error('Error updating status:', error);
    else fetchFlats();
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFlat) return;
    setSaving(true);

    const rent = Number(editingFlat.rent) || 0;
    const water = Number(editingFlat.water_bill) || 0;
    const electricity = Number(editingFlat.electricity) || 0;
    const maintenance = Number(editingFlat.maintenance) || 0;

    const totalDue = rent + water + electricity + maintenance;
    const paid_amount = editingFlat.status === 'PAID' ? totalDue : 0;

    const { error } = await supabase
      .from('flats')
      .update({
        tenant_name: editingFlat.tenant_name,
        phone: editingFlat.phone,
        rent: rent,
        water_bill: water,
        electricity: electricity,
        maintenance: maintenance,
        status: editingFlat.status,
        paid_amount: paid_amount
      })
      .eq('flat_no', editingFlat.flat_no);

    setSaving(false);
    if (error) {
      alert(`Failed to update tenant details: \${error.message}`);
      console.error('Supabase Update Error:', error);
    } else {
      setEditingFlat(null);
      fetchFlats();
    }
  };

  const handleMonthlyReset = async () => {
    if (!confirm('Are you sure you want to reset all flats to UNPAID for the new month?')) return;
    
    const { error } = await supabase
      .from('flats')
      .update({ status: 'UNPAID', paid_amount: 0 })
      .neq('flat_no', '');

    if (error) {
      alert('Failed to perform monthly reset.');
      console.error(error);
    } else {
      fetchFlats();
      alert('All flats have been reset to UNPAID successfully!');
    }
  };

  const totalCollected = flats.filter(f => f.status === 'PAID').reduce((acc, f) => acc + (f.rent + (f.water_bill || 0) + (f.electricity || 0) + (f.maintenance || 0)), 0);
  const totalPending = flats.filter(f => f.status === 'UNPAID').reduce((acc, f) => acc + (f.rent + (f.water_bill || 0) + (f.electricity || 0) + (f.maintenance || 0)), 0);

  const handleExportPDF = () => {
    const rowsHTML = flats.map(f => {
      const total = f.rent + (f.water_bill || 0) + (f.electricity || 0) + (f.maintenance || 0);
      return '<tr>' +
        '<td style="padding: 6px 8px; border: 1px solid #ddd; font-weight: bold;">Flat ' + f.flat_no + '</td>' +
        '<td style="padding: 6px 8px; border: 1px solid #ddd;">' + f.tenant_name + '</td>' +
        '<td style="padding: 6px 8px; border: 1px solid #ddd;">' + f.phone + '</td>' +
        '<td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">₹' + total.toLocaleString('en-IN') + '</td>' +
        '<td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: ' + (f.status === 'PAID' ? 'green' : 'orange') + ';">' + f.status + '</td>' +
        '</tr>';
    }).join('');

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(
      '<html>' +
        '<head>' +
          '<title>Rental Summary Report</title>' +
          '<style>' +
            'body { font-family: Arial, sans-serif; padding: 15px; color: #333; }' +
            'h1 { font-size: 18px; margin-bottom: 2px; }' +
            'p { font-size: 11px; color: #666; margin-top: 0; }' +
            'table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }' +
            'th { background-color: #f3f4f6; padding: 8px; border: 1px solid #ddd; text-align: left; }' +
            '.summary { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }' +
          '</style>' +
        '</head>' +
        '<body>' +
          '<div>' +
            '<h1>Rental Management Summary Report</h1>' +
            '<p>Generated for: ' + currentMonth + '</p>' +
          '</div>' +
          '<div class="summary">' +
            '<div><strong>Total Collected:</strong> ₹' + totalCollected.toLocaleString('en-IN') + '</div>' +
            '<div><strong>Total Pending:</strong> ₹' + totalPending.toLocaleString('en-IN') + '</div>' +
          '</div>' +
          '<table>' +
            '<thead>' +
              '<tr>' +
                '<th>Flat</th>' +
                '<th>Tenant Name</th>' +
                '<th>Phone</th>' +
                '<th style="text-align: right;">Total Due</th>' +
                '<th style="text-align: center;">Status</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody>' +
              rowsHTML +
            '</tbody>' +
          '</table>' +
        '</body>' +
      '</html>'
    );
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      document.body.removeChild(iframe);
    }, 500);
  };

  const filteredFlats = flats.filter((flat) => {
    const matchesSearch = 
      flat.flat_no.toLowerCase().includes(searchQuery.toLowerCase()) || 
      flat.tenant_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'ALL' || flat.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Dashboard Summary */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rental Management Dashboard</h1>
            <p className="text-sm text-gray-500">20 Residential Flats - Full Itemized Billing System</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl">
              <p className="text-xs text-emerald-600 font-medium">Collected</p>
              <p className="text-lg font-bold text-emerald-700">₹{totalCollected.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl">
              <p className="text-xs text-amber-600 font-medium">Pending</p>
              <p className="text-lg font-bold text-amber-700">₹{totalPending.toLocaleString('en-IN')}</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleExportPDF}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2.5 rounded-xl text-xs font-semibold transition border border-blue-200"
                title="Print or Save as PDF"
              >
                📥 Export PDF
              </button>
              <button 
                onClick={handleMonthlyReset}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-2.5 rounded-xl text-xs font-semibold transition border border-rose-200"
                title="Reset for New Month"
              >
                🔄 Monthly Reset
              </button>
              <button 
                onClick={fetchFlats}
                className="bg-gray-100 hover:bg-gray-200 px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-700 transition"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="w-full sm:w-80">
            <input
              type="text"
              placeholder="🔍 Search flat no or tenant name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50"
            />
          </div>
          <div className="flex gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold transition \${
                statusFilter === 'ALL' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Flats
            </button>
            <button
              onClick={() => setStatusFilter('PAID')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold transition \${
                statusFilter === 'PAID' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Paid
            </button>
            <button
              onClick={() => setStatusFilter('UNPAID')}
              className={`flex-1 sm:flex-
