'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, MapPin, ChevronRight, Globe, Building2, Users, Phone, Star } from 'lucide-react';

// ── Brand Colors — from chosen Image 2 logo ────────────────
const B = {
  primary:   '#1B7A6E',
  secondary: '#2A9D8F',
  accent:    '#F5C400',
  dark:      '#0D4A42',
  light:     '#E8F8F5',
  green:     '#27AE60',
};

const CATEGORIES = [
  { slug:'restaurants',   name:'Restaurants',   icon:'🍽️', color:'#E74C3C' },
  { slug:'hospitals',     name:'Hospitals',     icon:'🏥', color:'#E84393' },
  { slug:'plumbers',      name:'Plumbers',      icon:'🔧', color:'#2A9D8F' },
  { slug:'electricians',  name:'Electricians',  icon:'⚡', color:'#F5C400' },
  { slug:'real-estate',   name:'Real Estate',   icon:'🏠', color:'#27AE60' },
  { slug:'lawyers',       name:'Lawyers',       icon:'⚖️', color:'#8b5cf6' },
  { slug:'beauty-salons', name:'Beauty',        icon:'💅', color:'#ec4899' },
  { slug:'schools-tutors',name:'Schools',       icon:'📚', color:'#06b6d4' },
  { slug:'hotels',        name:'Hotels',        icon:'🏨', color:'#f97316' },
  { slug:'auto-repair',   name:'Auto Repair',   icon:'🚗', color:'#64748b' },
  { slug:'gyms-fitness',  name:'Gyms',          icon:'💪', color:'#ef4444' },
  { slug:'it-services',   name:'IT Services',   icon:'💻', color:'#6366f1' },
  { slug:'accountants',   name:'Accountants',   icon:'📊', color:'#84cc16' },
  { slug:'contractors',   name:'Contractors',   icon:'🏗️', color:'#a16207' },
  { slug:'pharmacies',    name:'Pharmacies',    icon:'💊', color:'#0d9488' },
  { slug:'travel-agents', name:'Travel',        icon:'✈️', color:'#0ea5e9' },
];

const COUNTRIES = [
  { code:'NG', name:'Nigeria',       flag:'🇳🇬', cities:['Lagos','Abuja','Kano','Port Harcourt'] },
  { code:'ZA', name:'South Africa',  flag:'🇿🇦', cities:['Johannesburg','Cape Town','Durban'] },
  { code:'KE', name:'Kenya',         flag:'🇰🇪', cities:['Nairobi','Mombasa','Kisumu'] },
  { code:'GH', name:'Ghana',         flag:'🇬🇭', cities:['Accra','Kumasi','Tamale'] },
  { code:'EG', name:'Egypt',         flag:'🇪🇬', cities:['Cairo','Alexandria','Giza'] },
  { code:'GB', name:'United Kingdom',flag:'🇬🇧', cities:['London','Birmingham','Manchester'] },
  { code:'FR', name:'France',        flag:'🇫🇷', cities:['Paris','Marseille','Lyon'] },
  { code:'DE', name:'Germany',       flag:'🇩🇪', cities:['Berlin','Hamburg','Munich'] },
];

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [city,  setCity]  = useState('Lagos');
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [showCP, setShowCP]   = useState(false);

  const handleSearch = useCallback((q?: string) => {
    const sq = q ?? query;
    router.push(`/search?q=${encodeURIComponent(sq)}&city=${encodeURIComponent(city)}&country=${country.code}`);
  }, [query, city, country, router]);

  return (
    <div style={{ minHeight:'100vh', background:'#fff', fontFamily:"'Inter',system-ui,sans-serif" }}>
      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; }
        .cat-btn:hover { border-color: ${B.primary}60 !important; background: ${B.light} !important; }
        .trend-btn:hover { background: rgba(255,255,255,.25) !important; }
        .nav-link:hover { color: ${B.primary} !important; }
        .footer-item:hover { color: ${B.accent} !important; }
      `}</style>

      {/* NAVBAR */}
      <nav style={{ background:'#fff', borderBottom:'2px solid '+B.light, position:'sticky', top:0, zIndex:50, boxShadow:'0 2px 12px rgba(27,122,110,.08)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 16px', height:64, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>

          {/* Logo — shows actual uploaded image */}
          <Link href="/" style={{ display:'flex', alignItems:'center', gap:2, textDecoration:'none', flexShrink:0 }}>
            <img src="/dialbee-logo.png" alt="Dialbee" height="42"
              style={{ objectFit:'contain' }}
              onError={e => { (e.target as any).style.display='none'; }} />
            <span style={{ fontWeight:900, fontSize:24, color:B.primary, letterSpacing:-0.5 }}>
              Dial<span style={{ color:B.secondary }}>bee</span>
            </span>
          </Link>

          {/* Country picker */}
          <div style={{ position:'relative' }}>
            <button onClick={() => setShowCP(!showCP)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', background:B.light, border:`1px solid ${B.secondary}50`, borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', color:B.primary }}>
              {country.flag} {city} ▾
            </button>
            {showCP && (
              <div style={{ position:'absolute', top:'calc(100%+6px)', left:0, background:'#fff', border:'1px solid #e0e0e0', borderRadius:12, boxShadow:'0 8px 30px rgba(0,0,0,.12)', width:660, zIndex:200, padding:16 }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                  {COUNTRIES.map(c => (
                    <div key={c.code}>
                      <button onClick={() => { setCountry(c); setCity(c.cities[0]); setShowCP(false); }}
                        style={{ width:'100%', textAlign:'left', padding:'8px', borderRadius:8, background: country.code===c.code ? B.light : '#f9f9f9', border:`1px solid ${country.code===c.code ? B.primary : '#eee'}`, cursor:'pointer', marginBottom:4, fontSize:12, fontWeight:700 }}>
                        {c.flag} {c.name}
                      </button>
                      {country.code===c.code && (
                        <div style={{ display:'flex', flexWrap:'wrap', gap:3, paddingLeft:4 }}>
                          {c.cities.map(ct => (
                            <button key={ct} onClick={() => { setCity(ct); setShowCP(false); }}
                              style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background: city===ct ? B.primary : '#f0f0f0', color: city===ct ? '#fff' : '#555', border:'none', fontWeight:600, cursor:'pointer' }}>
                              {ct}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Link href="/register?role=business_owner" className="nav-link"
              style={{ padding:'8px 18px', background:B.primary, color:'#fff', fontSize:13, fontWeight:700, borderRadius:8, textDecoration:'none' }}>
              🐝 List Free
            </Link>
            <Link href="/login"
              style={{ padding:'8px 16px', border:`1.5px solid ${B.primary}`, color:B.primary, fontSize:13, fontWeight:700, borderRadius:8, textDecoration:'none' }}>
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ background:`linear-gradient(135deg, ${B.dark} 0%, ${B.primary} 65%, ${B.secondary} 100%)`, padding:'52px 16px 0', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:0, top:0, width:'35%', height:'100%', opacity:.06,
          backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='104'%3E%3Cpath d='M30 0L60 17.3V52L30 69.3 0 52V17.3L30 0zM0 69.3L30 86.6V104H0V69.3zM60 69.3V104H30L60 86.6V69.3z' fill='%23FFD700'/%3E%3C/svg%3E\")",
          backgroundSize:'60px 104px' }} />

        <div style={{ maxWidth:820, margin:'0 auto', textAlign:'center', position:'relative' }}>
          <h1 style={{ color:'#fff', fontSize:44, fontWeight:900, marginBottom:10, lineHeight:1.15, letterSpacing:-1 }}>
            Connect. Discover. Prosper. 🐝
          </h1>
          <p style={{ color:'rgba(255,255,255,.8)', fontSize:18, marginBottom:32 }}>
            Nigeria's Home of Local Businesses
          </p>

          {/* SEARCH */}
          <div style={{ background:'#fff', borderRadius:16, padding:8, display:'flex', gap:8, boxShadow:'0 16px 48px rgba(0,0,0,.22)', maxWidth:740, margin:'0 auto' }}>
            <div style={{ flex:1, display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#f8fffe', borderRadius:10, border:`1px solid ${B.light}` }}>
              <Search style={{ width:18, height:18, color:B.secondary, flexShrink:0 }} />
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key==='Enter' && handleSearch()}
                placeholder="What are you looking for?"
                style={{ flex:1, border:'none', background:'none', fontSize:15, color:'#333', outline:'none', fontFamily:'inherit' }} />
            </div>
            <div style={{ width:1, background:'#e0e0e0', margin:'4px 0' }} />
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 12px', background:'#f8fffe', borderRadius:10, border:`1px solid ${B.light}`, minWidth:145 }}>
              <MapPin style={{ width:14, height:14, color:'#888', flexShrink:0 }} />
              <select value={city} onChange={e => setCity(e.target.value)}
                style={{ border:'none', background:'none', fontSize:14, color:'#555', fontFamily:'inherit', flex:1, cursor:'pointer', outline:'none' }}>
                {country.cities.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={() => handleSearch()}
              style={{ background:B.primary, color:'#fff', padding:'10px 26px', borderRadius:10, fontWeight:800, fontSize:15, border:'none', cursor:'pointer', flexShrink:0 }}>
              Search
            </button>
          </div>

          {/* Trending */}
          <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'center', marginTop:16, flexWrap:'wrap', paddingBottom:44 }}>
            <span style={{ color:'rgba(255,255,255,.6)', fontSize:12, fontWeight:600 }}>Trending:</span>
            {['Plumber Lagos','Emergency electrician','Best lawyer','Restaurants open now','Car repair'].map(q => (
              <button key={q} className="trend-btn" onClick={() => handleSearch(q)}
                style={{ background:'rgba(255,255,255,.18)', border:'1px solid rgba(255,255,255,.3)', color:'#fff', padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer' }}>
                {q}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height:40, background:'#f8f9fa', clipPath:'ellipse(55% 100% at 50% 100%)' }} />
      </section>

      {/* STATS */}
      <section style={{ background:'#f8f9fa', padding:'0 16px 28px' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', paddingTop:24, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
          {[
            { icon:<Building2 style={{width:24,height:24}}/>, num:'250,000+', label:'Businesses Listed' },
            { icon:<Users style={{width:24,height:24}}/>,    num:'2M+',      label:'Monthly Searches' },
            { icon:<Globe style={{width:24,height:24}}/>,    num:'11',       label:'Countries' },
          ].map((s,i) => (
            <div key={i} style={{ background:'#fff', borderRadius:16, padding:'18px 22px', display:'flex', alignItems:'center', gap:14, boxShadow:'0 2px 8px rgba(0,0,0,.05)', border:`1px solid ${B.light}` }}>
              <div style={{ width:50, height:50, borderRadius:13, background:B.light, display:'flex', alignItems:'center', justifyContent:'center', color:B.primary }}>{s.icon}</div>
              <div>
                <p style={{ fontWeight:900, fontSize:22, color:'#222', lineHeight:1 }}>{s.num}</p>
                <p style={{ fontSize:12, color:'#777', marginTop:3 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section style={{ padding:'28px 16px 36px', background:'#fff' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
            <h2 style={{ fontWeight:900, fontSize:22, color:'#222' }}>Popular Categories</h2>
            <Link href="/categories" style={{ color:B.primary, fontWeight:700, fontSize:13, textDecoration:'none', display:'flex', alignItems:'center', gap:3 }}>
              All Categories <ChevronRight style={{width:14,height:14}}/>
            </Link>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:10 }}>
            {CATEGORIES.map(cat => (
              <button key={cat.slug} className="cat-btn" onClick={() => handleSearch(cat.name)}
                style={{ background:'#fff', border:'2px solid #f0f0f0', borderRadius:14, padding:'13px 6px', display:'flex', flexDirection:'column', alignItems:'center', gap:7, cursor:'pointer', transition:'all .15s' }}>
                <div style={{ width:44, height:44, borderRadius:11, background:`${cat.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{cat.icon}</div>
                <span style={{ fontSize:9.5, fontWeight:700, color:'#444', textAlign:'center', lineHeight:1.3 }}>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ background:'#f8f9fa', padding:'36px 16px 44px' }}>
        <div style={{ maxWidth:1000, margin:'0 auto' }}>
          <h2 style={{ fontWeight:900, fontSize:22, color:'#222', textAlign:'center', marginBottom:30 }}>How Dialbee Works 🐝</h2>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:20 }}>
            {[
              { n:'1', icon:<Search style={{width:24,height:24}}/>, t:'Search', d:'Find any service in your city' },
              { n:'2', icon:<Building2 style={{width:24,height:24}}/>, t:'Compare', d:'Compare ratings, prices & reviews' },
              { n:'3', icon:<Phone style={{width:24,height:24}}/>, t:'Contact', d:'Call or send free quote request' },
              { n:'4', icon:<Star style={{width:24,height:24}}/>, t:'Review', d:'Share your experience' },
            ].map((s,i) => (
              <div key={i} style={{ textAlign:'center', position:'relative' }}>
                {i<3 && <div style={{ position:'absolute', top:27, left:'62%', width:'74%', height:1, borderTop:'2px dashed #ccc' }} />}
                <div style={{ width:54, height:54, borderRadius:14, background:B.light, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', color:B.primary, position:'relative' }}>
                  {s.icon}
                  <span style={{ position:'absolute', top:-5, right:-5, width:20, height:20, borderRadius:99, background:B.primary, color:'#fff', fontSize:10, fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center' }}>{s.n}</span>
                </div>
                <p style={{ fontWeight:800, fontSize:14, color:'#222', marginBottom:5 }}>{s.t}</p>
                <p style={{ fontSize:12, color:'#777', lineHeight:1.6 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR BUSINESS */}
      <section style={{ padding:'32px 16px 48px', background:'#fff' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', background:`linear-gradient(135deg, ${B.dark}, ${B.primary})`, borderRadius:20, padding:'36px 40px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', right:-20, top:-20, width:180, height:180, borderRadius:99, background:'rgba(255,255,255,.04)' }} />
          <div>
            <p style={{ color:'rgba(255,255,255,.65)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:2, marginBottom:8 }}>For Business Owners</p>
            <h3 style={{ color:'#fff', fontSize:26, fontWeight:900, marginBottom:8 }}>Grow Your Business With Dialbee 🐝</h3>
            <p style={{ color:'rgba(255,255,255,.7)', fontSize:13, maxWidth:420, lineHeight:1.7 }}>
              Get discovered by thousands of local customers. Start free, upgrade when ready. Lagos · Nairobi · London & more.
            </p>
            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <Link href="/register?role=business_owner"
                style={{ padding:'11px 22px', background:B.accent, color:'#1A1A1A', fontWeight:800, borderRadius:10, textDecoration:'none', fontSize:13 }}>
                List Your Business Free →
              </Link>
              <Link href="/pricing"
                style={{ padding:'11px 20px', background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)', color:'#fff', fontWeight:700, borderRadius:10, textDecoration:'none', fontSize:13 }}>
                See Pricing
              </Link>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, flexShrink:0 }}>
            {[['🎯','Targeted Leads'],['📊','Analytics'],['⭐','Build Reviews'],['📱','WhatsApp Alerts']].map(([ic,lb],i) => (
              <div key={i} style={{ background:'rgba(255,255,255,.09)', border:'1px solid rgba(255,255,255,.13)', borderRadius:11, padding:'11px 14px', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:18 }}>{ic}</span>
                <span style={{ color:'#fff', fontSize:11, fontWeight:700 }}>{lb}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background:B.dark, color:'#94a3b8', padding:'36px 16px 16px' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:28, marginBottom:28 }}>
          <div>
            <p style={{ fontWeight:900, fontSize:22, color:'#fff', marginBottom:10 }}>🐝 Dialbee</p>
            <p style={{ fontSize:13, lineHeight:1.7, maxWidth:240 }}>Connect. Discover. Prosper.<br/>Nigeria's Home of Local Businesses.</p>
          </div>
          {[
            { title:'Countries', items:['Nigeria 🇳🇬','South Africa 🇿🇦','Kenya 🇰🇪','Ghana 🇬🇭','Egypt 🇪🇬','UK 🇬🇧','France 🇫🇷','Germany 🇩🇪'] },
            { title:'For Business', items:['List Free','Standard Plan','Premium Plan','Lead Wallet','Analytics'] },
            { title:'Company', items:['About Us','Contact','Privacy','Terms','Careers'] },
          ].map((col,i) => (
            <div key={i}>
              <p style={{ color:'#fff', fontWeight:800, fontSize:13, marginBottom:12 }}>{col.title}</p>
              {col.items.map(item => (
                <p key={item} className="footer-item" style={{ fontSize:12, marginBottom:8, cursor:'pointer', transition:'color .15s' }}>{item}</p>
              ))}
            </div>
          ))}
        </div>
        <div style={{ borderTop:'1px solid rgba(255,255,255,.07)', paddingTop:14, textAlign:'center', fontSize:11 }}>
          © 2025 Dialbee. All rights reserved. 🐝 Operating in 11 countries across Africa &amp; Europe.
        </div>
      </footer>
    </div>
  );
}
