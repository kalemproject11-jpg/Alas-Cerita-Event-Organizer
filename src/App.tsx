import React, { useState, useEffect } from 'react';
import { User, Event, TicketType, Booking, IssuedTicket, CheckInLog } from './types';
import { storageService } from './services/storageService';
import { Header } from './components/Header';
import { EventCatalog } from './components/customer/EventCatalog';
import { EventDetailModal } from './components/customer/EventDetailModal';
import { CheckoutPaymentModal } from './components/customer/CheckoutPaymentModal';
import { ETicketModal } from './components/customer/ETicketModal';
import { AdminAuthModal } from './components/admin/AdminAuthModal';
import { AdminUnifiedDashboard } from './components/admin/AdminUnifiedDashboard';
import { Ticket, AlertCircle, X } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(() => storageService.getCurrentUser());
  const [users, setUsers] = useState<User[]>(() => storageService.getUsers());
  const [events, setEvents] = useState<Event[]>(() => storageService.getEvents());
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>(() => storageService.getTicketTypes());
  const [bookings, setBookings] = useState<Booking[]>(() => storageService.getBookings());
  const [issuedTickets, setIssuedTickets] = useState<IssuedTicket[]>(() => storageService.getIssuedTickets());
  const [logs, setLogs] = useState<CheckInLog[]>(() => storageService.getLogs());

  // Active navigation: 'catalog' | 'admin_dashboard'
  const [activeTab, setActiveTab] = useState<string>('catalog');

  // Modals & notification state
  const [showAdminAuthModal, setShowAdminAuthModal] = useState<boolean>(false);
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<Event | null>(null);
  const [preferredTierId, setPreferredTierId] = useState<string | undefined>(undefined);
  const [activeBookingForPayment, setActiveBookingForPayment] = useState<Booking | null>(null);
  const [initialTicketToScan, setInitialTicketToScan] = useState<IssuedTicket | null>(null);
  const [customerSuccessTicket, setCustomerSuccessTicket] = useState<IssuedTicket | null>(null);
  const [appError, setAppError] = useState<string | null>(null);

  // Subscribe to storage updates
  useEffect(() => {
    const unsubscribe = storageService.subscribe(() => {
      setCurrentUser(storageService.getCurrentUser());
      setUsers(storageService.getUsers());
      setEvents(storageService.getEvents());
      setTicketTypes(storageService.getTicketTypes());
      setBookings(storageService.getBookings());
      setIssuedTickets(storageService.getIssuedTickets());
      setLogs(storageService.getLogs());
    });
    return () => unsubscribe();
  }, []);

  const handleAdminLoginSuccess = (adminUser: User) => {
    storageService.setCurrentUser(adminUser.id);
    setCurrentUser(adminUser);
    setActiveTab('admin_dashboard');
    setShowAdminAuthModal(false);
  };

  const handleLogoutAdmin = () => {
    const customerUser = users.find((u) => u.role === 'customer') || users[1];
    if (customerUser) {
      storageService.setCurrentUser(customerUser.id);
      setCurrentUser(customerUser);
    }
    setActiveTab('catalog');
  };

  const handleProceedToCheckout = (payload: {
    eventId: string;
    ticketTypeId: string;
    quantity: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    attendees: Array<{ name: string; email: string; phone: string; origin: string }>;
  }) => {
    setAppError(null);
    const res = storageService.createBooking({
      userId: currentUser.id,
      ...payload,
    });

    if (res.success && res.booking) {
      setSelectedEventForDetail(null);
      setActiveBookingForPayment(res.booking);
    } else {
      setAppError(res.error || 'Gagal membuat pesanan checkout.');
    }
  };

  const handlePaymentSuccess = () => {
    setActiveBookingForPayment(null);
    setCustomerSuccessTicket(null);

    if (currentUser.role !== 'customer') {
      setActiveTab('admin_dashboard');
    }
  };

  const handleOpenGateScannerWithTicket = (ticket: IssuedTicket) => {
    setInitialTicketToScan(ticket);
    if (currentUser.role === 'customer') {
      setShowAdminAuthModal(true);
    } else {
      setActiveTab('admin_dashboard');
    }
  };

  const isAdminOrStaff = currentUser.role !== 'customer';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1c0f1c] via-[#261421] to-[#22170f] text-stone-100 flex flex-col font-sans selection:bg-pink-500/40 selection:text-pink-200 relative overflow-x-hidden">
      {/* Ambient glow in pink & yellow */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[460px] h-[460px] rounded-full bg-pink-500/15 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 w-[460px] h-[460px] rounded-full bg-amber-400/15 blur-[120px]" />
        <div className="absolute -bottom-32 left-1/4 w-[520px] h-[520px] rounded-full bg-rose-500/12 blur-[130px]" />
      </div>

      {/* Top Bar Header */}
      <Header
        currentUser={currentUser}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'admin_dashboard' && !isAdminOrStaff) {
            setShowAdminAuthModal(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onOpenAdminLogin={() => setShowAdminAuthModal(true)}
        onLogoutAdmin={handleLogoutAdmin}
      />

      {/* Global inline error notification (replaces window.alert) */}
      {appError && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="p-3.5 bg-rose-950/90 border border-rose-500/50 rounded-2xl text-rose-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{appError}</span>
            </div>
            <button
              type="button"
              onClick={() => setAppError(null)}
              className="p-1 text-rose-300 hover:text-white cursor-pointer"
              aria-label="Tutup pesan kesalahan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* PUBLIC VIEW: Event Catalog & Ticket Booking */}
        {activeTab === 'catalog' && (
          <EventCatalog
            events={events}
            ticketTypes={ticketTypes}
            onSelectEvent={(evt, tierId) => {
              setSelectedEventForDetail(evt);
              setPreferredTierId(tierId);
            }}
          />
        )}

        {/* ADMIN UNIFIED DASHBOARD */}
        {activeTab === 'admin_dashboard' && isAdminOrStaff && (
          <AdminUnifiedDashboard
            currentUser={currentUser}
            users={users}
            events={events}
            ticketTypes={ticketTypes}
            bookings={bookings}
            issuedTickets={issuedTickets}
            logs={logs}
            initialTicketToScan={initialTicketToScan}
            onClearInitialTicket={() => setInitialTicketToScan(null)}
            onOpenGateScannerWithTicket={handleOpenGateScannerWithTicket}
            onLogoutToPublic={handleLogoutAdmin}
          />
        )}

        {/* Protection fallback if non-admin hits admin_dashboard tab */}
        {activeTab === 'admin_dashboard' && !isAdminOrStaff && (
          <div className="p-8 sm:p-12 text-center bg-[#221221]/80 rounded-3xl border border-pink-500/30 space-y-4 max-w-md mx-auto my-12">
            <div className="w-16 h-16 rounded-2xl bg-pink-500/15 border border-pink-500/30 text-pink-300 flex items-center justify-center mx-auto">
              <Ticket className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Akses Dibatasi</h2>
            <p className="text-xs text-stone-300">
              Portal Admin, Gate Scanner, dan Manajemen Tiket hanya dapat diakses oleh Admin dan Petugas resmi Alas Cerita.
            </p>
            <button
              type="button"
              onClick={() => setShowAdminAuthModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 hover:brightness-110 text-stone-950 text-xs font-black rounded-xl transition-all shadow-md shadow-pink-500/25 cursor-pointer"
            >
              Login Portal Admin
            </button>
          </div>
        )}
      </main>

      {/* Admin Authentication Modal */}
      <AdminAuthModal
        isOpen={showAdminAuthModal}
        onClose={() => setShowAdminAuthModal(false)}
        onSuccessLogin={handleAdminLoginSuccess}
        users={users}
      />

      {/* Event Detail & Tier Selection Modal */}
      {selectedEventForDetail && (
        <EventDetailModal
          event={selectedEventForDetail}
          ticketTypes={ticketTypes}
          currentUser={currentUser}
          initialTierId={preferredTierId}
          onClose={() => {
            setSelectedEventForDetail(null);
            setPreferredTierId(undefined);
          }}
          onProceedToCheckout={handleProceedToCheckout}
        />
      )}

      {/* Checkout & Payment Gateway Modal */}
      {activeBookingForPayment && (
        <CheckoutPaymentModal
          booking={activeBookingForPayment}
          event={events.find((e) => e.id === activeBookingForPayment.eventId) || events[0]}
          onPaymentSuccess={handlePaymentSuccess}
          onCancel={() => {
            storageService.cancelExpiredBookings();
            setActiveBookingForPayment(null);
          }}
        />
      )}

      {/* Customer E-Ticket Preview Modal */}
      {customerSuccessTicket && (
        <ETicketModal
          ticket={customerSuccessTicket}
          event={events.find((e) => e.id === customerSuccessTicket.eventId) || events[0]}
          onClose={() => setCustomerSuccessTicket(null)}
        />
      )}

      {/* Quiet Footer */}
      <footer className="border-t border-pink-900/30 bg-[#170b16]/90 py-6 sm:py-8 px-4 text-xs text-stone-400 mt-auto no-print backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="font-bold text-pink-300">Alas Cerita Event Organizer</span>
            <span aria-hidden="true">&middot;</span>
            <span className="text-amber-300/90 font-medium">Sistem Pemesanan &amp; Validasi E-Ticket Resmi</span>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 text-[11px] font-mono text-stone-400">
            <span>Kalura Secret Garden, Yogyakarta</span>
            <span aria-hidden="true">&middot;</span>
            <button
              type="button"
              onClick={() => setShowAdminAuthModal(true)}
              className="text-pink-300 hover:text-amber-300 transition-colors underline cursor-pointer"
            >
              Portal Admin
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
