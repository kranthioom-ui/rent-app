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
      return `
        <tr>
          <td style="padding: 6px 8px; border: 1px solid #ddd; font-weight: bold;">Flat \${f.flat_no}</td>
          <td style="padding: 6px 8px; border: 1px solid #ddd;">\${f.tenant_name}</td>
          <td style="padding: 6px 8px; border: 1px solid #ddd;">\${f.phone}</td>
          <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">₹\${total.toLocaleString('en-IN')}</td>
          <td style="padding: 6px 8px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: ${f.status === 'PAID' ? 'green' : 'orange'};">${f.status}</td>
        </tr>
      `;
    }).join('');

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Rental Summary Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 15px; color: #333; }
            h1 { font-size: 18px; margin-bottom: 2px; }
            p { font-size: 11px; color: #666; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
            th { background-color: #f3f4f6; padding: 8px; border: 1px solid #ddd; text-align: left; }
            .summary { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
          </style>
