'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { CheckCircle2, ShieldCheck, ArrowRight, Smartphone } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Dad's Business UPI ID & Name
const DAD_UPI_ID = 'balu2882@ybl';
const DAD_NAME = 'Hyderabad Rentals';

function PaymentContent() {
  const params = useParams();
  const flat_no = params.flat_no;

  const [flat, setFlat] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (flat_no) {
      fetchFlatDetails();
    }
  }, [flat_no]);

  const fetchFlatDetails = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('flats')
      .select('*')
      .eq('flat_no', flat_no)
      .single();

    if (error) {
      console.error('Error fetching flat:', error);
    } else {
      setFlat(data);
      if (data && data.status === 'PAID') {
        setSuccess(true);
      }
    }
    setLoading(false);
  };

  const handleSelfConfirmPaid = async () => {
    if (!flat) return;
    setMarkingPaid(true);

    const totalDue = (flat.rent || 0) + (flat.water_bill || 0) + (flat.electricity || 0) + (flat.maintenance || 0);
    const timestamp = new Date().toISOString();

    const { error } = await supabase
      .from('flats')
      .update({ 
        status: 'PAID', 
        paid_amount: totalDue,
        paid_at: timestamp 
      })
      .eq('flat_no', flat.flat_no);

    if (error) {
      console.error('Error confirming payment:', error);
      alert('Failed to update status. Please try again.');
    } else {
      setSuccess(true);
    }
    setMarkingPaid(false);
  };

  if (loading) {
    return <div className="text-slate-500 text-xs font-bold">Loading bill details...</div>;
  }

  if (!flat) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center max-w-sm w-full">
        <h2 className="text-base font-bold text-slate-800">Flat Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">The requested flat number does not exist.</p>
      </div>
    );
  }

  const rent = flat.rent || 0;
  const water = flat.water_bill || 0;
  const electricity = flat.electricity || 0;
  const maintenance = flat.maintenance || 0;
  const totalDue = rent + water + electricity + maintenance;

  // Direct NPCI UPI Intent Link Structure (0% Fee)[cite: 1, 2]
  const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(DAD_UPI_ID)}&pn=${encodeURIComponent(DAD_NAME)}&am=${totalDue}&cu=INR&tn=${encodeURIComponent(`Rent Flat ${flat.flat_no}`)}`;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-xl border border-slate-200 space-y-6">
      
      {/* Header */}
      <div className="text-center space-y-1 border-b border-slate-100 pb-4">
        <span className="text-[10px] font-black tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full uppercase">
          Flat {flat.flat_no} Monthly Invoice
        </span>
        <h1 className="text-2xl font-black text-slate-900 pt-2">Rent & Utility Bill</h1>
        <p className="text-xs font-semibold text-slate-500">
          Tenant: <span className="font-bold text-slate-900">{flat.tenant_name || 'Valued Renter'}</span>
        </p>
      </div>

      {success ? (
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-emerald-900">Payment Recorded!</h3>
          <p className="text-xs font-medium text-emerald-700 leading-relaxed">
            Thank you! Your payment of <span className="font-black">₹{totalDue.toLocaleString('en-IN')}</span> has been registered and updated on the landlord dashboard.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Bill Breakdown Card */}
          <div className="bg-slate-50 p-4 rounded-2xl space-y-2.5 text-xs text-slate-700 border border-slate-200/80 font-medium">
            <div className="flex justify-between">
              <span className="text-slate-500">Base Rent</span>
              <span className="font-bold text-slate-900">₹{rent.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Water Charges</span>
              <span className="font-bold text-slate-900">₹{water.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Electricity Bill</span>
              <span className="font-bold text-slate-900">₹{electricity.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Maintenance</span>
              <span className="font-bold text-slate-900">₹{maintenance.toLocaleString('en-IN')}</span>
            </div>
            <div className="border-t border-slate-200 pt-3 mt-1 flex justify-between font-black text-slate-900 text-sm">
              <span>Total Payable</span>
              <span className="text-indigo-600 text-base">₹{totalDue.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Step 1: Open UPI App */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Step 1: Pay via any UPI App (0% Fee)[cite: 1, 2]
            </label>
            <a
              href={upiIntentUrl}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-2xl text-xs transition shadow-md flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" /> Pay ₹{totalDue.toLocaleString('en-IN')} via Google Pay / PhonePe / Paytm
            </a>
          </div>

          {/* Step 2: Confirm Payment */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Step 2: After completing transfer
            </label>
            <button
              onClick={handleSelfConfirmPaid}
              disabled={markingPaid}
              className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold py-3.5 px-4 rounded-2xl text-xs transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {markingPaid ? (
                'Recording Payment...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> I Have Completed Payment <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Security Badge */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400 pt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Direct Bank Transfer • Safe & Encrypted
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaymentPage() {
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <Suspense fallback={<div className="text-slate-500 text-xs font-bold">Loading payment interface...</div>}>
        <PaymentContent />
      </Suspense>
    </main>
  );
}
