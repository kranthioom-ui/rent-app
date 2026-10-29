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
      // 1. Upload screenshot to Supabase Storage bucket 'payment-receipts'
      const fileExt = file.name.split('.').pop();
      const fileName = `flat_${flat_no}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // 2. Get Public URL for the uploaded receipt
      const { data: publicURLData } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(filePath);

      const receiptUrl = publicURLData.publicUrl;
      const totalDue = (flat.rent || 0) + (flat.water_bill || 0) + (flat.electricity || 0) + (flat.maintenance || 0);

      // 3. Update Flat record with VERIFYING status and receipt URL
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
        <h2 className="text-
