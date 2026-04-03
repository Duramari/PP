'use client';

// ═══════════════════════════════════════════════════════════════
// SEARCH RESULTS PAGE — app/search/page.tsx
// Full implementation with filters, cards, lead form, pagination
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search, MapPin, Phone, MessageSquare, Star, CheckCircle,
  Clock, SlidersHorizontal, ChevronDown, X, Zap, Filter,
  ArrowUpDown, Navigation, Award, ChevronRight, ChevronLeft,
  ExternalLink, Shield, TrendingUp
} from 'lucide-react';
import { businessApi, leadsApi } from '@/lib/api';
import type { Business } from '@/types';

// ── Sort options ──────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'rating',    label: 'Highest Rated' },
  { value: 'reviews',   label: 'Most Reviewed' },
  { value: 'distance',  label: 'Nearest First' },
  { value: 'newest',    label: 'Recently Added' },
];

// ── Lead Modal ─────────────────────────────────────────────────
function LeadModal({ business, onClose }: { business: Business; onClose: () => void }) {
  const [form, setForm]       = useState({ name: '', phone: '', email: '', message: '', urgency: 'normal' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  const submit = async () => {
    if (!form.name || !form.phone) { setError('Name and phone are required'); return; }
    setLoading(true); setError('');
    try {
      await leadsApi.submit({
        businessId:      business.id,
        customerName:    form.name,
        customerPhone:   form.phone,
        customerEmail:   form.email || undefined,
        customerMessage: form.message || undefined,
        source:          'form',
        urgency:         form.urgency,
      });
      setSuccess(true);
      setTimeout(onClose, 2500);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-400 px-6 py-4 flex items-start justify-between">
          <div>
            <p className="text-white font-black text-lg">Get Free Quotes</p>
            <p className="text-orange-100 text-sm mt-0.5">from {business.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <p className="font-black text-xl text-gray-900">Request Sent!</p>
              <p className="text-gray-500 text-sm mt-2">{business.name} will contact you shortly.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Your Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="John Smith"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Phone Number *</label>
                  <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+234 801 234 5678"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Email (optional)</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="john@example.com"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Describe your requirement</label>
                <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Tell them what you need..."
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">How urgent?</label>
                <div className="flex gap-2">
                  {[{ v: 'urgent', label: '🔥 Urgent', color: 'red' }, { v: 'normal', label: '✅ Normal', color: 'orange' }, { v: 'flexible', label: '🕒 Flexible', color: 'blue' }].map(u => (
                    <button key={u.v} onClick={() => setForm(f => ({ ...f, urgency: u.v }))}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border-2 transition-all ${form.urgency === u.v ? 'border-teal-600 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={submit} disabled={loading}
                className="w-full bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-black py-3.5 rounded-xl text-[15px] transition-colors">
                {loading ? 'Sending...' : 'Send Request →'}
              </button>
              <p className="text-center text-xs text-gray-400">🔒 Free service · No spam · Your info is protected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Business Card ──────────────────────────────────────────────
function BusinessCard({ biz, position, onQuote }: { biz: Business; position: number; onQuote: () => void }) {
  const tierConfig = {
    enterprise: { badge: '👑 Featured',  bg: 'bg-purple-100 text-purple-700', border: 'border-purple-200' },
    premium:    { badge: '⭐ Premium',   bg: 'bg-blue-100 text-blue-700',    border: 'border-blue-100' },
    standard:   { badge: '✓ Standard',  bg: 'bg-gray-100 text-gray-600',    border: 'border-gray-100' },
    free:       { badge: null,           bg: '',                              border: 'border-gray-100' },
  }[biz.subscriptionTier ?? 'free'];

  return (
    <div className={`bg-white rounded-2xl border-2 ${tierConfig.border} hover:shadow-lg transition-all overflow-hidden ${(biz as any)._sponsored ? 'border-amber-200' : ''}`}>
      {(biz as any)._sponsored && (
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-1.5 flex justify-between items-center">
          <span className="text-xs font-bold text-amber-600">Sponsored</span>
          <span className="text-[10px] text-amber-400">Ad</span>
        </div>
      )}

      <div className="p-5">
        <div className="flex gap-4">
          {/* Rank */}
          <div className="w-6 flex-shrink-0 text-center pt-1">
            <span className={`font-black text-lg ${position <= 3 ? 'text-teal-700' : 'text-gray-300'}`}>{position}</span>
          </div>

          {/* Logo */}
          <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-orange-50 flex items-center justify-center text-2xl border border-orange-100">
            {biz.logoUrl ? <img src={biz.logoUrl} alt={biz.name} className="w-full h-full object-cover" /> : '🏢'}
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1 flex-wrap">
              <Link href={`/business/${biz.slug}`}
                className="font-black text-base text-gray-900 hover:text-teal-700 transition-colors leading-tight">
                {biz.name}
              </Link>
              {biz.verificationStatus === 'verified' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-sky-50 text-sky-600 rounded-full border border-sky-100 flex-shrink-0">
                  <CheckCircle className="w-3 h-3" /> Verified
                </span>
              )}
              {tierConfig.badge && (
                <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${tierConfig.bg} flex-shrink-0`}>
                  {tierConfig.badge}
                </span>
              )}
            </div>

            <p className="text-sm text-gray-500 mb-2">
              {biz.categoryName} &nbsp;·&nbsp;
              <span className={`font-semibold ${(biz as any).isOpenNow ? 'text-green-600' : 'text-red-500'}`}>
                {(biz as any).isOpenNow ? '● Open Now' : '● Closed'}
              </span>
              {biz.neighborhood && <>&nbsp;·&nbsp;{biz.neighborhood}</>}
            </p>

            {biz.tagline && (
              <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: (biz as any).highlight?.tagline?.[0] ?? biz.tagline }} />
            )}

            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
              {biz.addressLine1 && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {biz.addressLine1}
                </span>
              )}
              {(biz as any).distance && (
                <span className="flex items-center gap-1">
                  <Navigation className="w-3 h-3" /> {(biz as any).distance} km away
                </span>
              )}
              {biz.yearEstablished && (
                <span className="flex items-center gap-1">
                  <Award className="w-3 h-3" /> Est. {biz.yearEstablished}
                </span>
              )}
            </div>
          </div>

          {/* Right: rating + actions */}
          <div className="flex-shrink-0 text-right flex flex-col items-end gap-2">
            {biz.avgRating > 0 && (
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${biz.avgRating >= 4.5 ? 'bg-green-50 text-green-700' : biz.avgRating >= 4 ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'}`}>
                <Star className="w-4 h-4 fill-current" />
                <span className="font-black text-base">{biz.avgRating.toFixed(1)}</span>
                <span className="text-xs opacity-70">({biz.totalReviews})</span>
              </div>
            )}

            <button onClick={onQuote}
              className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors">
              <MessageSquare className="w-4 h-4" /> Get Quote
            </button>

            {biz.phonePrimary && (
              <a href={`tel:${biz.phonePrimary}`}
                className="flex items-center gap-1.5 border-2 border-gray-200 hover:border-teal-600 text-gray-600 hover:text-teal-700 px-4 py-2 rounded-xl font-semibold text-sm transition-all">
                <Phone className="w-4 h-4" /> Call
              </a>
            )}

            <Link href={`/business/${biz.slug}`}
              className="text-xs text-teal-700 hover:underline flex items-center gap-0.5">
              View Profile <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Search Page ───────────────────────────────────────────
function SearchPageContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [query,    setQuery]    = useState(searchParams.get('q') ?? '');
  const [city,     setCity]     = useState(searchParams.get('city') ?? '');
  const [sortBy,   setSortBy]   = useState(searchParams.get('sort') ?? 'relevance');
  const [minRating,setMinRating]= useState(searchParams.get('rating') ?? '');
  const [openNow,  setOpenNow]  = useState(searchParams.get('open') === 'true');
  const [page,     setPage]     = useState(parseInt(searchParams.get('page') ?? '1'));

  const [results,  setResults]  = useState<any>(null);
  const [loading,  setLoading]  = useState(false);
  const [leadModal,setLeadModal]= useState<Business | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const doSearch = useCallback(async (newPage = page) => {
    setLoading(true);
    try {
      const data = await businessApi.search({
        q:         query || undefined,
        city:      city || undefined,
        sortBy,
        minRating: minRating ? parseFloat(minRating) : undefined,
        page:      newPage,
        limit:     20,
      });
      setResults(data);
      setPage(newPage);

      // Update URL
      const params = new URLSearchParams();
      if (query)    params.set('q', query);
      if (city)     params.set('city', city);
      if (sortBy !== 'relevance') params.set('sort', sortBy);
      if (minRating) params.set('rating', minRating);
      if (openNow)   params.set('open', 'true');
      if (newPage > 1) params.set('page', String(newPage));
      router.push(`/search?${params.toString()}`, { scroll: false });
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [query, city, sortBy, minRating, openNow, page, router]);

  // Run on mount
  useEffect(() => { doSearch(1); }, []);

  const totalPages = results?.totalPages ?? 1;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Search Bar ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-teal-700 font-black text-xl flex-shrink-0">Dialbee</Link>

            {/* Query */}
            <div className="flex items-center gap-2 flex-1 border-2 border-teal-600 rounded-xl px-3 py-2.5 bg-white">
              <Search className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSearch(1)}
                placeholder="Search businesses..."
                className="flex-1 text-sm outline-none text-gray-800" />
              {query && <button onClick={() => setQuery('')}><X className="w-4 h-4 text-gray-400" /></button>}
            </div>

            {/* City */}
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 bg-white min-w-[140px]">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input type="text" value={city} onChange={e => setCity(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doSearch(1)}
                placeholder="City..."
                className="flex-1 text-sm outline-none text-gray-700" />
            </div>

            <button onClick={() => doSearch(1)}
              className="bg-teal-700 hover:bg-teal-800 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors flex-shrink-0">
              Search
            </button>

            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-sm transition-all ${showFilters ? 'bg-orange-50 border-orange-300 text-orange-600' : 'border-gray-200 text-gray-600 hover:border-orange-300'}`}>
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {(minRating || openNow) && <span className="w-2 h-2 rounded-full bg-teal-700" />}
            </button>
          </div>

          {/* Filter row */}
          {showFilters && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 flex-wrap">
              {/* Sort */}
              <div className="flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500">Sort:</span>
                {SORT_OPTIONS.map(s => (
                  <button key={s.value} onClick={() => { setSortBy(s.value); setTimeout(() => doSearch(1), 100); }}
                    className={`px-3 py-1.5 text-xs rounded-full border font-semibold transition-all ${sortBy === s.value ? 'bg-teal-700 border-orange-500 text-white' : 'border-gray-200 text-gray-600 hover:border-orange-300'}`}>
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="w-px h-5 bg-gray-200" />

              {/* Rating */}
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-gray-400" />
                {['3', '4', '4.5'].map(r => (
                  <button key={r} onClick={() => { setMinRating(minRating === r ? '' : r); setTimeout(() => doSearch(1), 100); }}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-full border font-semibold transition-all ${minRating === r ? 'bg-amber-400 border-amber-400 text-white' : 'border-gray-200 text-gray-600 hover:border-amber-300'}`}>
                    <Star className="w-3 h-3 fill-current" /> {r}+
                  </button>
                ))}
              </div>

              <div className="w-px h-5 bg-gray-200" />

              {/* Open Now */}
              <button onClick={() => { setOpenNow(!openNow); setTimeout(() => doSearch(1), 100); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border font-semibold transition-all ${openNow ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200 text-gray-600 hover:border-green-300'}`}>
                <Clock className="w-3.5 h-3.5" /> Open Now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">

          {/* ── Left Sidebar (Facets) ── */}
          <aside className="w-56 flex-shrink-0 hidden lg:block">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden sticky top-24">
              <div className="bg-teal-700 px-4 py-3">
                <p className="font-bold text-white text-sm flex items-center gap-2"><Filter className="w-4 h-4" /> Filters</p>
              </div>
              <div className="p-4">
                {/* Categories from facets */}
                {results?.facets?.categories?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Categories</p>
                    {results.facets.categories.slice(0, 8).map((cat: any) => (
                      <button key={cat.key} className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-teal-700 py-1.5 transition-colors">
                        <span>{cat.key}</span>
                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{cat.doc_count}</span>
                      </button>
                    ))}
                  </div>
                )}
                {/* Ad slot */}
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center mt-2">
                  <p className="text-[10px] text-gray-400 mb-2">Advertisement</p>
                  <p className="text-2xl mb-1">🏢</p>
                  <p className="text-xs font-bold text-gray-600 mb-2">Advertise Here</p>
                  <button className="w-full text-xs bg-teal-700 text-white py-1.5 rounded-lg font-semibold">Get Started</button>
                </div>
              </div>
            </div>
          </aside>

          {/* ── Results ── */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="font-black text-xl text-gray-900">
                  {query ? `"${query}"` : 'All Businesses'}
                </h1>
                {!loading && results && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    <strong className="text-teal-700">{results.total?.toLocaleString()}</strong> results
                    {city && <> in <strong>{city}</strong></>}
                  </p>
                )}
              </div>
            </div>

            {/* Loading skeleton */}
            {loading && (
              <div className="space-y-4">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="bg-white rounded-2xl border-2 border-gray-100 p-5 animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-6 h-6 bg-gray-200 rounded" />
                      <div className="w-16 h-16 bg-gray-200 rounded-xl flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-gray-200 rounded w-1/3" />
                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                        <div className="h-4 bg-gray-200 rounded w-2/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Results */}
            {!loading && results?.data?.length > 0 && (
              <div className="space-y-3">
                {results.data.map((biz: Business, idx: number) => (
                  <BusinessCard
                    key={biz.id}
                    biz={biz}
                    position={(page - 1) * 20 + idx + 1}
                    onQuote={() => setLeadModal(biz)}
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && results?.data?.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <p className="text-5xl mb-4">🔍</p>
                <h3 className="font-black text-xl text-gray-900 mb-2">No results found</h3>
                <p className="text-gray-500 text-sm mb-6">Try a different search term or expand your location</p>
                <button onClick={() => { setQuery(''); setCity(''); doSearch(1); }}
                  className="bg-teal-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm">
                  Clear Filters
                </button>
              </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button onClick={() => doSearch(page - 1)} disabled={page === 1}
                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold disabled:opacity-40 hover:border-orange-300 hover:text-teal-700 transition-all">
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, page - 2) + i;
                  if (p > totalPages) return null;
                  return (
                    <button key={p} onClick={() => doSearch(p)}
                      className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${p === page ? 'bg-teal-700 text-white' : 'border border-gray-200 hover:border-orange-300 hover:text-teal-700'}`}>
                      {p}
                    </button>
                  );
                })}

                <button onClick={() => doSearch(page + 1)} disabled={page === totalPages}
                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold disabled:opacity-40 hover:border-orange-300 hover:text-teal-700 transition-all">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lead Modal */}
      {leadModal && <LeadModal business={leadModal} onClose={() => setLeadModal(null)} />}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-500">Loading...</div></div>}>
      <SearchPageContent />
    </Suspense>
  );
}
