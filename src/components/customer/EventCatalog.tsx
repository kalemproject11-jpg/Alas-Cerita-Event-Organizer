import React, { useState } from 'react';
import { Event, TicketType } from '../../types';
import { 
  Calendar, 
  MapPin, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Check, 
  Sparkles, 
  Coffee, 
  Palette, 
  Gift, 
  Users, 
  Clock,
  HeartHandshake
} from 'lucide-react';

interface EventCatalogProps {
  events: Event[];
  ticketTypes: TicketType[];
  onSelectEvent: (event: Event, preferredTierId?: string) => void;
  onOpenConcurrencyDemo?: () => void;
}

export const EventCatalog: React.FC<EventCatalogProps> = ({
  events,
  ticketTypes,
  onSelectEvent,
  onOpenConcurrencyDemo,
}) => {
  // Primary featured event is Alas Cerita
  const alasCeritaEvent = events.find((e) => e.id === 'evt_alas_cerita_2026') || events[0];
  const alasCeritaTiers = ticketTypes.filter((t) => t.eventId === alasCeritaEvent?.id);

  const allFacilities = [
    'Jajanan Pasar',
    'Wedang',
    'Makanan Berat',
    'E-Sertifikat',
    'Totebag',
    'Merchandise',
    'Fresh Flower',
    'Voucher',
    'Tools Painting',
  ];

  return (
    <div className="space-y-14 pb-20">
      
      {/* 1. HERO SECTION: Alas Cerita — Our Philosophy (Warm Pink & Yellow Nuance) */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2c1326] via-[#20131e] to-[#2c2010] border border-pink-500/30 p-6 sm:p-10 lg:p-12 shadow-2xl shadow-pink-950/30">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
          
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Logo Brand Tag */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#271223]/90 border border-pink-500/40 text-stone-200 text-xs font-medium shadow-sm">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
              <span className="text-pink-200 font-semibold">Yuk, temukan cerita dan versi terbaik dirimu bersama Alas Cerita!</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-mono tracking-widest uppercase text-[#FACC15] font-black">
                  Talkshow: Rerasan Mawi Makna
                </span>
                <span className="text-pink-400/60">·</span>
                <span className="text-xs text-pink-300 font-mono font-bold">Alas Cerita EO</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                “Duduk Sejenak, Leren Kepenak”
              </h1>
            </div>

            <p className="text-stone-200 text-xs sm:text-sm leading-relaxed text-justify sm:text-left">
              Alas Cerita adalah creative gathering berbasis self-exploration yang menggabungkan refleksi diri, aktivitas kreatif, interaksi sosial, dan pengalaman budaya dalam ruang yang hangat, terbuka, dan inklusif. Berasal dari kata “alas” (hutan dalam bahasa Jawa) dan “cerita”, Alas Cerita menjadi simbol keberagaman perjalanan hidup setiap individu serta ruang untuk berbagi, berekspresi, dan saling terhubung tanpa menghakimi.
            </p>

            {/* Date, Time, Venue Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 bg-[#200f1c]/90 border border-pink-500/30 rounded-2xl shadow-sm">
                <span className="text-[10px] font-mono uppercase tracking-wider text-pink-400 block mb-1 font-bold">
                  Hari / Tanggal
                </span>
                <span className="text-xs sm:text-sm font-bold text-white block">
                  Sabtu, 5 Desember 2026
                </span>
              </div>

              <div className="p-3.5 bg-[#251b0e]/90 border border-amber-400/40 rounded-2xl shadow-sm">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 block mb-1 font-bold">
                  Waktu Acara
                </span>
                <span className="text-xs sm:text-sm font-bold text-white block">
                  08.00 WIB – Selesai
                </span>
              </div>

              <div className="p-3.5 bg-[#200f1c]/90 border border-pink-500/30 rounded-2xl shadow-sm">
                <span className="text-[10px] font-mono uppercase tracking-wider text-pink-300 block mb-1 font-bold">
                  Tempat / Venue
                </span>
                <span className="text-xs sm:text-sm font-bold text-white block">
                  Kalura Secret Garden
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={() => onSelectEvent(alasCeritaEvent)}
                className="px-6 py-3.5 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 hover:brightness-110 text-stone-950 text-xs sm:text-sm font-black rounded-xl transition-all shadow-lg shadow-pink-500/30 flex items-center gap-2 cursor-pointer"
              >
                <span>Daftar Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#paket-tiket"
                className="px-5 py-3.5 bg-[#261324]/90 hover:bg-[#34182e] text-pink-100 border border-pink-500/40 text-xs sm:text-sm font-semibold rounded-xl transition-colors"
              >
                Lihat Paket Tiket
              </a>
            </div>
          </div>

          {/* Right Poster Column */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden border-2 border-pink-500/40 shadow-2xl group bg-[#160b15]">
              <img
                src={alasCeritaEvent.posterUrl}
                alt="Poster Alas Cerita — Our Philosophy"
                referrerPolicy="no-referrer"
                className="w-full aspect-4/3 sm:aspect-16/10 object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a0e19] via-[#1a0e19]/25 to-transparent" />
              
              <div className="absolute bottom-4 left-4 right-4 p-3.5 bg-[#200f1c]/95 backdrop-blur-md rounded-2xl border border-pink-500/30 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white p-1 shrink-0 overflow-hidden shadow-sm border border-amber-300">
                  <img src="/alas-cerita-logo.jpg" alt="Alas Cerita" className="w-full h-full object-contain" />
                </div>
                <div>
                  <span className="text-[11px] font-mono text-[#FACC15] block font-bold">
                    Poster Alas Cerita — Our Philosophy
                  </span>
                  <span className="text-xs text-stone-300">
                    Kalura Secret Garden &middot; Creative Gathering &amp; Painting
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ambient warm glow in pink and yellow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* 2. PILIH PENGALAMANMU — TICKET PACKAGES SHOWCASE */}
      <section id="paket-tiket" className="space-y-6 scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-pink-950/80 to-amber-950/80 border border-pink-500/40 text-[11px] font-mono font-bold tracking-widest text-pink-300">
            <span>PILIH PENGALAMANMU</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Paket tiket untuk setiap ambisi.
          </h2>
          <p className="text-xs sm:text-sm text-stone-300">
            Semua paket mendapat fasilitas yang sama. Pilih berdasarkan jumlah orang yang akan hadir bersamamu.
          </p>
        </div>

        {/* Packages Grid: Single, Couple, Circle */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {alasCeritaTiers.map((tier) => {
            const isSingle = tier.name.toLowerCase().includes('single');
            const isCouple = tier.name.toLowerCase().includes('couple');
            const isCircle = tier.name.toLowerCase().includes('circle');

            return (
              <div
                key={tier.id}
                className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between border transition-all duration-300 ${
                  isCouple
                    ? 'bg-gradient-to-b from-[#341d13] via-[#271520] to-[#1a0e18] border-2 border-amber-400 shadow-2xl shadow-amber-950/50 ring-2 ring-amber-400/30'
                    : isCircle
                    ? 'bg-gradient-to-b from-[#2d1428] via-[#211220] to-[#1a0e18] border border-pink-400/50 hover:border-pink-300 hover:shadow-xl hover:shadow-pink-950/50'
                    : 'bg-gradient-to-b from-[#281324] via-[#20121d] to-[#1a0e18] border border-pink-500/35 hover:border-pink-400 hover:shadow-xl hover:shadow-pink-950/50'
                }`}
              >
                {/* Popular Tag for Couple */}
                {isCouple && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-400 to-yellow-300 text-stone-950 font-black text-[10px] tracking-wider uppercase rounded-full shadow-lg font-mono">
                    ★ Paling Favorit (2 Orang)
                  </div>
                )}

                {/* Tag for Circle */}
                {isCircle && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-pink-500 to-amber-400 text-stone-950 font-black text-[10px] tracking-wider uppercase rounded-full shadow-lg font-mono">
                    Hemat Bertiga (3 Orang)
                  </div>
                )}

                <div className="space-y-6">
                  {/* Tier Title & Price */}
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>{tier.name}</span>
                        {isSingle && <span className="w-2.5 h-2.5 rounded-full bg-pink-400 shadow-sm shadow-pink-400" />}
                        {isCouple && <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400" />}
                        {isCircle && <span className="w-2.5 h-2.5 rounded-full bg-pink-300 shadow-sm shadow-pink-300" />}
                      </h3>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                        isSingle 
                          ? 'bg-pink-950 text-pink-300 border border-pink-600/50' 
                          : isCouple 
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/60' 
                          : 'bg-pink-950 text-pink-200 border border-pink-500/60'
                      }`}>
                        {isSingle ? '1 Orang' : isCouple ? '2 Orang' : '3 Orang'}
                      </span>
                    </div>

                    <div className="mt-3">
                      <span className={`text-3xl sm:text-4xl font-black font-mono tabular-nums ${isCouple ? 'text-[#FACC15]' : 'text-white'}`}>
                        Rp{tier.price.toLocaleString('id-ID')}
                      </span>
                      <span className="text-xs text-stone-300 ml-1">/ paket</span>
                    </div>

                    <p className="text-xs text-stone-300 mt-2 leading-relaxed">
                      {tier.description}
                    </p>
                  </div>

                  {/* 9 Facilities Checklist */}
                  <div className="space-y-2.5 pt-4 border-t border-pink-500/20">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#FACC15] block font-mono">
                      Fasilitas Termasuk:
                    </span>
                    <ul className="space-y-2 text-xs text-stone-200">
                      {allFacilities.map((fac, idx) => (
                        <li key={idx} className="flex items-center gap-2.5">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                            isCouple 
                              ? 'bg-amber-950/80 border border-amber-400/60 text-amber-300' 
                              : 'bg-pink-950/80 border border-pink-500/60 text-pink-300'
                          }`}>
                            <Check className="w-2.5 h-2.5" />
                          </div>
                          <span>{fac}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Buy Button */}
                <div className="pt-8">
                  <button
                    onClick={() => onSelectEvent(alasCeritaEvent, tier.id)}
                    className={`w-full py-3.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                      isCouple
                        ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-pink-500 hover:brightness-110 text-stone-950 font-black shadow-amber-500/30'
                        : isCircle
                        ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 hover:brightness-110 text-stone-950 font-black shadow-pink-500/30'
                        : 'bg-gradient-to-r from-pink-600 to-rose-500 hover:brightness-110 text-white font-bold shadow-pink-600/30'
                    }`}
                  >
                    <span>Pilih {tier.name}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. OFFICIAL PAYMENT & ADMISSION GUARANTEE BANNER */}
      <div className="p-6 bg-gradient-to-r from-[#2a1323] via-[#21141c] to-[#2c2010] border border-pink-500/30 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-pink-950/20">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              Metode Pembayaran Resmi: QRIS, ShopeePay, dan Bank BRI
            </h4>
            <p className="text-xs text-stone-300">
              E-Ticket diterbitkan seketika dengan QR Code terenkripsi dan nomor tiket unik untuk verifikasi pintu masuk Kalura Secret Garden.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/80 border border-amber-500/60 px-3.5 py-1.5 rounded-xl uppercase tracking-wider shadow-sm">
            100% Tiket Resmi
          </span>
        </div>
      </div>
    </div>
  );
};
