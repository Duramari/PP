'use client';

// ═══════════════════════════════════════════════════════════════
// AGENT PANEL — app/agent/page.tsx
// Sales agent dashboard: businesses, commissions, territory, targets
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import {
  Building2, Plus, TrendingUp, DollarSign, Map,
  Target, CheckCircle, Clock, Phone, ChevronRight,
  BarChart2, Users, Star, AlertCircle, Search,
  X, Check, Award
} from 'lucide-react';
import { adminApi } from '@/lib/api';

// ── Quick Add Business Form ────────────────────────────────────
function QuickAddModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm]     = useState({ name: '', categoryId: '', cityId: '', phonePrimary: '', address: '', ownerEmail: '', ownerName: '' });
  const [loading, setLoading]= useState(false);
  const [success, setSuccess]= useState(false);

  // Mock categories and cities for demo
  const MOCK_CATEGORIES = [
    { id:'cat1', name:'Restaurants' }, { id:'cat2', name:'Plumbers' },
    { id:'cat3', name:'Electricians' }, { id:'cat4', name:'Doctors' },
    { id:'cat5', name:'Lawyers' }, { id:'cat6', name:'Beauty Salons' },
  ];
  const MOCK_CITIES = [
    { id:'city1', name:'Lagos' }, { id:'city2', name:'Nairobi' },
    { id:'city3', name:'London' }, { id:'city4', name:'Accra' },
  ];

  const submit = async () => {
    if (!form.name || !form.categoryId || !form.cityId) return;
    setLoading(true);
    try {
      // await agentsApi.quickAdd(form);
      await new Promise(r => setTimeout(r, 1000)); // simulate
      setSuccess(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-amber-400 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-white font-black text-lg">Quick Add Business</p>
            <p className="text-orange-100 text-xs mt-0.5">Earn commission on first payment</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-4">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <p className="font-black text-xl text-gray-900">Business Added!</p>
              <p className="text-gray-500 text-sm mt-2">Pending admin approval.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-600 block mb-1">Business Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. City Plumbing Services"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Category *</label>
                  <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:ring-2 focus:ring-orange-400">
                    <option value="">Select...</option>
                    {MOCK_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">City *</label>
                  <select value={form.cityId} onChange={e => setForm(f => ({ ...f, cityId: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:ring-2 focus:ring-orange-400">
                    <option value="">Select...</option>
                    {MOCK_CITIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Phone Number</label>
                  <input value={form.phonePrimary} onChange={e => setForm(f => ({ ...f, phonePrimary: e.target.value }))}
                    placeholder="+234 801 234 5678"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Address</label>
                  <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="Street address"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Owner Email</label>
                  <input type="email" value={form.ownerEmail} onChange={e => setForm(f => ({ ...f, ownerEmail: e.target.value }))}
                    placeholder="owner@business.com"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Owner Name</label>
                  <input value={form.ownerName} onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))}
                    placeholder="John Smith"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                <p className="text-xs text-orange-700 font-semibold">💰 Commission: 10% of first subscription payment</p>
                <p className="text-xs text-orange-500 mt-0.5">Standard plan ($29) = $2.90 · Premium ($99) = $9.90 · Enterprise ($299) = $29.90</p>
              </div>

              <button onClick={submit} disabled={loading || !form.name || !form.categoryId || !form.cityId}
                className="w-full bg-teal-700 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-3 rounded-xl text-sm transition-colors">
                {loading ? 'Adding...' : 'Add Business & Earn Commission →'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Mock data ──────────────────────────────────────────────────
const MOCK_DASHBOARD = {
  agent: { agentCode: 'AG-NG-042', commissionRate: 10, totalEarned: 284.50, status: 'active' },
  thisMonth: { businessesAdded: 14, target: 20, targetProgress: 70, commission: 87.60 },
  total: { businessesAdded: 47, totalEarned: 284.50, pendingPayout: 42.20 },
  recentBusinesses: [
    { id:'1', name:'City Plumbing Lagos', subscription_tier:'premium', avg_rating:4.5, total_leads:12, created_at:'2025-01-20' },
    { id:'2', name:'QuickFix Electric', subscription_tier:'standard', avg_rating:4.2, total_leads:8, created_at:'2025-01-18' },
    { id:'3', name:'Top Lawyers Nigeria', subscription_tier:'free', avg_rating:0, total_leads:0, created_at:'2025-01-15' },
    { id:'4', name:'Mama Cooks Restaurant', subscription_tier:'premium', avg_rating:4.8, total_leads:23, created_at:'2025-01-12' },
    { id:'5', name:'Lagos Auto Garage', subscription_tier:'standard', avg_rating:4.0, total_leads:5, created_at:'2025-01-10' },
  ],
};

const MOCK_COMMISSIONS = [
  { business_name:'City Plumbing Lagos', amount:99, commission_amount:9.90, commission_paid:false, type:'subscription', created_at:'Jan 20, 2025' },
  { business_name:'QuickFix Electric', amount:29, commission_amount:2.90, commission_paid:true, type:'subscription', created_at:'Jan 18, 2025' },
  { business_name:'Top Lawyers Ng', amount:99, commission_amount:9.90, commission_paid:true, type:'subscription', created_at:'Jan 15, 2025' },
  { business_name:'Mama Cooks', amount:29, commission_amount:2.90, commission_paid:false, type:'subscription', created_at:'Jan 12, 2025' },
];

const MOCK_TERRITORY = [
  { name:'Lagos', country_name:'Nigeria', flag_emoji:'🇳🇬', my_businesses:32, paid_businesses:18 },
  { name:'Abuja', country_name:'Nigeria', flag_emoji:'🇳🇬', my_businesses:15, paid_businesses:7 },
];

// ── Main Agent Panel ──────────────────────────────────────────
export default function AgentPanel() {
  const [tab,         setTab]         = useState<'overview'|'businesses'|'commissions'|'territory'|'targets'>('overview');
  const [showAddModal,setShowAddModal] = useState(false);
  const d = MOCK_DASHBOARD;

  const nav = [
    { id:'overview',    label:'Overview',    icon:<BarChart2 className="w-4 h-4"/> },
    { id:'businesses',  label:'Businesses',  icon:<Building2 className="w-4 h-4"/> },
    { id:'commissions', label:'Commissions', icon:<DollarSign className="w-4 h-4"/> },
    { id:'territory',   label:'Territory',   icon:<Map className="w-4 h-4"/> },
    { id:'targets',     label:'Targets',     icon:<Target className="w-4 h-4"/> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-700 flex items-center justify-center text-white font-black text-base">A</div>
            <div>
              <p className="font-black text-gray-900">Agent Panel</p>
              <p className="text-xs text-gray-500">{d.agent.agentCode} · 10% commission rate</p>
            </div>
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-teal-700 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors">
            <Plus className="w-4 h-4" /> Add Business
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto pb-0">
          {nav.map(n => (
            <button key={n.id} onClick={() => setTab(n.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${tab === n.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {n.icon}{n.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ══ OVERVIEW ══ */}
        {tab === 'overview' && (
          <div className="space-y-5">
            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label:'Businesses Added', val:d.total.businessesAdded, sub:'all time', icon:<Building2 className="w-5 h-5"/>, color:'orange' },
                { label:'This Month', val:d.thisMonth.businessesAdded, sub:`of ${d.thisMonth.target} target`, icon:<Target className="w-5 h-5"/>, color:'blue' },
                { label:'Commission Earned', val:`$${d.total.totalEarned}`, sub:'all time', icon:<DollarSign className="w-5 h-5"/>, color:'green' },
                { label:'Pending Payout', val:`$${d.total.pendingPayout}`, sub:'to be paid', icon:<Clock className="w-5 h-5"/>, color:'violet' },
              ].map((s,i) => (
                <div key={i} className={`bg-white rounded-2xl border p-5 ${s.color === 'orange' ? 'border-orange-100' : s.color === 'blue' ? 'border-blue-100' : s.color === 'green' ? 'border-green-100' : 'border-violet-100'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color === 'orange' ? 'bg-orange-100 text-orange-500' : s.color === 'blue' ? 'bg-blue-100 text-blue-500' : s.color === 'green' ? 'bg-green-100 text-green-500' : 'bg-violet-100 text-violet-500'}`}>
                    {s.icon}
                  </div>
                  <p className="text-2xl font-black text-gray-900">{s.val}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                  <p className="text-xs text-gray-400">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Monthly progress */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-black text-gray-900">Monthly Target</p>
                  <p className="text-sm text-gray-500">{d.thisMonth.businessesAdded} of {d.thisMonth.target} businesses added</p>
                </div>
                <span className={`text-sm font-black px-3 py-1 rounded-full ${d.thisMonth.targetProgress >= 100 ? 'bg-green-100 text-green-600' : d.thisMonth.targetProgress >= 70 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>
                  {d.thisMonth.targetProgress}%
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-teal-700 rounded-full transition-all" style={{ width: `${d.thisMonth.targetProgress}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {d.thisMonth.target - d.thisMonth.businessesAdded} more needed to hit target · Commission this month: <strong className="text-green-600">${d.thisMonth.commission}</strong>
              </p>
            </div>

            {/* Recent businesses */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <p className="font-black text-gray-900">Recent Businesses</p>
                <button onClick={() => setTab('businesses')} className="text-xs text-orange-500 font-semibold flex items-center gap-1">
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {d.recentBusinesses.map((biz, i) => (
                <div key={biz.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center text-orange-500 font-bold text-sm flex-shrink-0">
                    {biz.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{biz.name}</p>
                    <p className="text-xs text-gray-400">{new Date(biz.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${biz.subscription_tier === 'premium' ? 'bg-blue-100 text-blue-700' : biz.subscription_tier === 'standard' ? 'bg-gray-100 text-gray-600' : 'bg-orange-50 text-orange-500'}`}>
                    {biz.subscription_tier}
                  </span>
                  <div className="text-right text-xs text-gray-500">
                    <p>{biz.total_leads} leads</p>
                    {biz.avg_rating > 0 && <p className="text-amber-500 font-semibold">★ {biz.avg_rating}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ COMMISSIONS ══ */}
        {tab === 'commissions' && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label:'Total Earned', val:`$${d.total.totalEarned}`, color:'green' },
                { label:'Pending Payout', val:`$${d.total.pendingPayout}`, color:'orange' },
                { label:'Commission Rate', val:`${d.agent.commissionRate}%`, color:'blue' },
              ].map((s,i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
                  <p className="text-3xl font-black text-gray-900">{s.val}</p>
                  <p className="text-sm text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="font-black text-gray-900">Commission History</p>
              </div>
              <div className="divide-y divide-gray-50">
                {MOCK_COMMISSIONS.map((c,i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${c.commission_paid ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                      {c.commission_paid ? <Check className="w-4 h-4"/> : <Clock className="w-4 h-4"/>}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900">{c.business_name}</p>
                      <p className="text-xs text-gray-400">{c.type} · {c.created_at}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-green-600">${c.commission_amount}</p>
                      <p className="text-xs text-gray-400">of ${c.amount}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${c.commission_paid ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                      {c.commission_paid ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ TERRITORY ══ */}
        {tab === 'territory' && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-start gap-3">
              <Map className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-orange-700 text-sm">Your Territory</p>
                <p className="text-xs text-orange-600 mt-0.5">You are authorized to onboard businesses in these cities. Contact your manager to expand territory.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {MOCK_TERRITORY.map((t,i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{t.flag_emoji}</span>
                    <div>
                      <p className="font-black text-gray-900">{t.name}</p>
                      <p className="text-sm text-gray-500">{t.country_name}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-gray-900">{t.my_businesses}</p>
                      <p className="text-xs text-gray-500">My Businesses</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-green-700">{t.paid_businesses}</p>
                      <p className="text-xs text-green-600">Paid Plans</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    {Math.round((t.paid_businesses / t.my_businesses) * 100)}% conversion rate
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ TARGETS ══ */}
        {tab === 'targets' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="font-black text-gray-900 mb-5">6-Month Performance</h3>
              {[
                { month:'Jan 2025', added:14, paid:6, target:20 },
                { month:'Dec 2024', added:22, paid:9, target:20 },
                { month:'Nov 2024', added:18, paid:8, target:20 },
                { month:'Oct 2024', added:11, paid:4, target:15 },
                { month:'Sep 2024', added:16, paid:7, target:15 },
              ].map((m,i) => (
                <div key={i} className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-gray-700">{m.month}</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-gray-500">{m.added}/{m.target} businesses</span>
                      <span className="text-green-600 font-bold">{m.paid} paid</span>
                      {m.added >= m.target && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">✓ Hit</span>}
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-700 rounded-full" style={{ width: `${Math.min(100, (m.added / m.target) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {showAddModal && <QuickAddModal onClose={() => setShowAddModal(false)} onSuccess={() => {}} />}
    </div>
  );
}
