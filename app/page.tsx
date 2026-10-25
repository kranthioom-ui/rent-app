'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Replace with your dad's actual UPI ID
const DAD_UPI_ID = "your-upi-id@upi"; 

interface Flat {
  flat_no: string;
  tenant_name: string;
  phone: string;
  rent: number;
  electricity_bill: number;
  water_bill: number;
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
  
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');

  const fetchFlats = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('flats').select('*').order('flat_no', { ascending: true });
    if (error) console.error('Error fetching flats:', error);
    else setFlats(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFlats();
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

    const totalDue = Number(editingFlat.rent) + Number(editingFlat.electricity_bill || 0) + Number(editingFlat.water_bill || 0) + Number(editingFlat.maintenance || 0);
    const paid_amount = editingFlat.status === 'PAID' ? totalDue : 0;

    const { error } = await supabase
      .from('flats')
      .update({
        tenant_name: editingFlat.tenant_name,
        phone: editingFlat.phone,
        rent: Number(editingFlat.rent),
        electricity_bill: Number(editingFlat.electricity_bill || 0),
        water_bill: Number(editingFlat.water_bill || 0),
        maintenance: Number(editingFlat.maintenance || 0),
        status: editingFlat.status,
        paid_amount: paid_amount
      })
      .eq('flat_no', editingFlat.flat_no);

    setSaving(false);
    if (error) {
      alert('Failed to update tenant details.');
      console.error(error);
    } else {
      setEditingFlat(null);
      fetchFlats();
    }
  };

  // Monthly Reset Function
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

  const totalCollected = flats.filter(f => f.status === 'PAID').reduce((acc, f) => acc + (f.rent + (f.electricity_bill || 0) + (f.water_bill || 0) + (f.maintenance || 0)), 0);
  const totalPending = flats.filter(f => f.status === 'UNPAID').reduce((acc, f) => acc + (f.rent + (f.electricity_bill || 0) + (f.water_bill || 0) + (f.maintenance || 0)), 0);

  // Filtered Flats Logic
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
            <p className="text-sm text-gray-500">20 Residential Flats - Full Itemized Payment System</p>
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
                onClick={() => window.print()}
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
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-50"
            />
          </div>
          <div className="flex gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold transition ${
                statusFilter === 'ALL' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Flats
            </button>
            <button
              onClick={() => setStatusFilter('PAID')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold transition ${
                statusFilter === 'PAID' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Paid
            </button>
            <button
              onClick={() => setStatusFilter('UNPAID')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold transition ${
                statusFilter === 'UNPAID' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Unpaid
            </button>
          </div>
        </div>

        {/* Flats Grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading flat details...</div>
        ) : filteredFlats.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-500">
            No flats found matching your search criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFlats.map((flat) => {
              const electricity = flat.electricity_bill || 0;
              const water = flat.water_bill || 0;
              const maintenance = flat.maintenance || 0;
              const totalDue = flat.rent + electricity + water + maintenance;

              const upiString = `upi://pay?pa=${DAD_UPI_ID}&pn=Property%20Owner&am=${totalDue}&cu=INR&tn=Rent%20for%20Flat%20${flat.flat_no}&amMode=0`;
              
              const whatsappMessage = encodeURIComponent(
                flat.status === 'PAID'
                  ? `Hello ${flat.tenant_name},\n\n` +
                    `✅ *PAYMENT RECEIPT - Flat ${flat.flat_no}*\n` +
                    `We have successfully received your full payment of ₹${totalDue.toLocaleString('en-IN')} for this month.\n\n` +
                    `Thank you!`
                  : `Hello ${flat.tenant_name},\n\n` +
                    `Here is your itemized rent bill breakdown for Flat ${flat.flat_no}:\n` +
                    `• Base Rent: ₹${flat.rent.toLocaleString('en-IN')}\n` +
                    `• Electricity: ₹${electricity.toLocaleString('en-IN')}\n` +
                    `• Water Bill: ₹${water.toLocaleString('en-IN')}\n` +
                    `• Maintenance: ₹${maintenance.toLocaleString('en-IN')}\n` +
                    `-----------------------------\n` +
                    `📌 *Total Amount Due: ₹${totalDue.toLocaleString('en-IN')}*\n\n` +
                    `Pay directly via GPay / PhonePe / Paytm using this locked UPI link:\n` +
                    `${upiString}\n\n` +
                    `Thank you!`
              );

              const whatsappUrl = `https://wa.me/${flat.phone}?text=${whatsappMessage}`;

              return (
                <div key={flat.flat_no} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">Flat {flat.flat_no}</span>
                        <h3 className="text-lg font-semibold text-gray-800">{flat.tenant_name}</h3>
                        <p className="text-xs text-gray-500">{flat.phone}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          flat.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {flat.status}
                        </span>
                        <button
                          onClick={() => setEditingFlat(flat)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    </div>

                    {/* Bill Breakdown */}
                    <div className="bg-gray-50 p-3 rounded-xl text-xs space-y-1 mb-4 text-gray-600">
                      <div className="flex justify-between"><span>Base Rent:</span> <span>₹{flat.rent.toLocaleString('en-IN')}</span></div>
                      <div className="flex justify-between"><span>Electricity:</span> <span>₹{electricity.toLocaleString('en-IN')}</span></div>
                      <div className="flex justify-between"><span>Water Bill:</span> <span>₹{water.toLocaleString('en-IN')}</span></div>
                      <div className="flex justify-between"><span>Maintenance:</span> <span>₹{maintenance.toLocaleString('en-IN')}</span></div>
                      <div className="border-t border-gray-200 pt-1 mt-1 flex justify-between font-bold text-gray-900">
                        <span>Total Due:</span> <span>₹{totalDue.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <div className="flex gap-2">
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex-1 py-2 px-2 rounded-xl text-xs font-medium text-center transition flex items-center justify-center gap-1 text-white ${
                          flat.status === 'PAID' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        {flat.status === 'PAID' ? '💬 Receipt' : '💬 WhatsApp'}
                      </a>
                      <button
                        onClick={() => setQrFlat(flat)}
                        className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2 px-2 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1"
                      >
                        📷 Show QR
                      </button>
                    </div>

                    {flat.status !== 'PAID' ? (
                      <button
                        onClick={() => updateStatus(flat.flat_no, 'PAID', totalDue)}
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white py-2 px-3 rounded-xl text-xs font-medium transition"
                      >
                        Mark Paid
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStatus(flat.flat_no, 'UNPAID', totalDue)}
                        className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-3 rounded-xl text-xs font-medium transition"
                      >
                        Reset Status
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* QR Code Modal */}
        {qrFlat && (() => {
          const electricity = qrFlat.electricity_bill || 0;
          const water = qrFlat.water_bill || 0;
          const maintenance = qrFlat.maintenance || 0;
          const totalDue = qrFlat.rent + electricity + water + maintenance;
          const upiString = `upi://pay?pa=${DAD_UPI_ID}&pn=Property%20Owner&am=${totalDue}&cu=INR&tn=Rent%20for%20Flat%20${qrFlat.flat_no}&amMode=0`;
          const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiString)}`;

          return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-gray-100 text-center space-y-4">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <h3 className="text-base font-bold text-gray-900">Scan to Pay - Flat {qrFlat.flat_no}</h3>
                  <button 
                    onClick={() => setQrFlat(null)}
                    className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Tenant: <span className="font-semibold text-gray-800">{qrFlat.tenant_name}</span></p>
                  <p className="text-lg font-extrabold text-gray-900">₹{totalDue.toLocaleString('en-IN')}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 inline-block">
                  <img src={qrImageUrl} alt="UPI QR Code" className="w-48 h-48 mx-auto rounded-lg" />
                </div>

                <p className="text-[11px] text-gray-400">
                  Scan using GPay, PhonePe, or Paytm. Amount is locked automatically.
                </p>

                <button
                  onClick={() => setQrFlat(null)}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white py-2.5 rounded-xl text-xs font-semibold transition"
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}

        {/* Edit Tenant Modal */}
        {editingFlat && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold text-gray-900">Edit Flat {editingFlat.flat_no}</h3>
                <button 
                  onClick={() => setEditingFlat(null)}
                  className="text-gray-400 hover:text-gray-600 text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tenant Name</label>
                  <input
                    type="text"
                    value={editingFlat.tenant_name}
                    onChange={(e) => setEditingFlat({ ...editingFlat, tenant_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Phone Number (with Country Code)</label>
                  <input
                    type="text"
                    value={editingFlat.phone}
                    onChange={(e) => setEditingFlat({ ...editingFlat, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Base Rent (₹)</label>
                    <input
                      type="number"
                      value={editingFlat.rent}
                      onChange={(e) => setEditingFlat({ ...editingFlat, rent: Number(e.target.value) })}
                      className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Electricity (₹)</label>
                    <input
                      type="number"
                      value={editingFlat.electricity_bill}
                      onChange={(e) => setEditingFlat({ ...editingFlat, electricity_bill: Number(e.target.value) })}
                      className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Water Bill (₹)</label>
                    <input
                      type="number"
                      value={editingFlat.water_bhill || editingFlat.water_bill}
                      onChange={(e) => setEditingFlat({ ...editingFlat, water_bill: Number(e.target.value) })}
                      className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Maintenance (₹)</label>
                    <input
                      type="number"
                      value={editingFlat.maintenance}
                      onChange={(e) => setEditingFlat({ ...editingFlat, maintenance: Number(e.target.value) })}
                      className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Status</label>
                  <select
                    value={editingFlat.status}
                    onChange={(e) => setEditingFlat({ ...editingFlat, status: e.target.value as 'PAID' | 'UNPAID' })}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="UNPAID">UNPAID</option>
                    <option value="PAID">PAID</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingFlat(null)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
