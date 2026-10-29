'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { CheckCircle2, ShieldCheck, ArrowRight, Copy, Check, Upload, Clock } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DAD_UPI_ID = 'balu2882@ybl';
const DAD_NAME = 'Hyderabad Rentals';

function PaymentContent() {
  const params = useParams();
  const flat_no = params.flat_no;

  const [flat, setFlat] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
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

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(DAD_UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePaymentSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flat) return;

    if (!file) {
      alert('Please upload a screenshot of your payment receipt before submitting.');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `flat_${flat_no}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicURLData } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(filePath);

      const receiptUrl = publicURLData.publicUrl;
      const totalDue = (flat.rent || 0) + (flat.water_bill || 0) + (flat.electricity || 0) + (flat.maintenance || 0);

      const { error: updateError } = await supabase
        .from('flats')
        .update({
          status: 'VERIFYING',
          paid_amount: totalDue,
          receipt_url: receiptUrl,
          paid_at: new Date().toISOString()
        })
        .eq('flat_no', flat.flat_no);

      if (updateError) throw updateError;

      setSuccess(true);
    } catch (err: any) {
      console.error('Submission error:', err);
      alert('Failed to submit receipt: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
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

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-xl border border-slate-200 space-y-6">
      
      <div className="text-center space-y-1 border-b border-slate-100 pb-4">
        <span className="text-[10px] font-black tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full uppercase">
          Flat {flat.flat_no} Monthly Invoice
        </span>
        <h1 className="text-2xl font-black text-slate-900 pt-2">Rent & Utility Bill</h1>
        <p className="text-xs font-semibold text-slate-500">
          Tenant: <span className="font-bold text-slate-900">{flat.tenant_name || 'Valued Renter'}</span>
        </p>
      </div>

      {success || flat.status === 'VERIFYING' || flat.status === 'PAID' ? (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-amber-900">Verification in Progress</h3>
          <p className="text-xs font-medium text-amber-700 leading-relaxed">
            Your payment receipt has been submitted! Your landlord will verify the transfer and update your status shortly.
          </p>
        </div>
      ) : (
        <form onSubmit={handlePaymentSubmission} className="space-y-5">
          <div className="bg-slate-50 p-4 rounded-2xl space-y-2.5 text-xs text-slate-700 border border-slate-200/85 font-medium">
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
              <span>Total Amount Due</span>
              <span className="text-indigo-600 text-base">₹{totalDue.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Step 1: Copy Landlord UPI ID
            </label>
            <div className="bg-slate-100 border border-slate-300 rounded-2xl p-3 flex items-center justify-between gap-2">
              <div className="pl-1">
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Landlord UPI</div>
                <div className="text-sm font-black text-slate-900 font-mono">{DAD_UPI_ID}</div>
              </div>
              <button
                type="button"
                onClick={handleCopyUpi}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy ID'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal pl-1">
              Open <b>GPay, PhonePe, or Paytm</b> on your phone, select <i>"Pay UPI ID"</i>, paste <b>{DAD_UPI_ID}</b>, and transfer <b>₹{totalDue.toLocaleString('en-IN')}</b>.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Step 2: Upload Payment Success Screenshot
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:bg-slate-50 transition cursor-pointer relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="flex flex-col items-center space-y-1">
                <Upload className="w-5 h-5 text-indigo-600" />
                <span className="text-xs font-bold text-slate-700">
                  {file ? file.name : 'Click to select payment screenshot'}
                </span>
                <span className="text-[10px] text-slate-400">PNG, JPG or JPEG up to 10MB</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-2xl text-xs transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {uploading ? 'Uploading Receipt...' : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Submit Receipt for Verification <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Direct Bank Transfer • Safe & 0% Fee
          </div>
        </form>
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
