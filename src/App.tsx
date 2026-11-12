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
import { CheckCircle2, Ticket } from 'lucide-react';

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

  // Modals state
  const [showAdminAuthModal, setShowAdminAuthModal] = useState<boolean>(false);
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<Event | null>(null);
  const [preferredTierId, setPreferredTierId] = useState<string | undefined>(undefined);
  const [activeBookingForPayment, setActiveBookingForPayment] = useState<Booking | null>(null);
  const [initialTicketToScan, setInitialTicketToScan] = useState<IssuedTicket | null>(null);
  const [customerSuccessTicket, setCustomerSuccessTicket] = useState<IssuedTicket | null>(null);

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

  // When switching user or logging in
  const handleSwitchUser = (userId: string) => {
    storageService.setCurrentUser(userId);
    const user = users.find((u) => u.id === userId);
    if (user) {
      setCurrentUser(user);
      if (user.role !== 'customer') {
        setActiveTab('admin_dashboard');
      } else {
        setActiveTab('catalog');
      }
    }
  };

  const handleAdminLoginSuccess = (adminUser: User) => {
    storageService.setCurrentUser(adminUser.id);
    setCurrentUser(adminUser);
    setActiveTab('admin_dashboard');
    setShowAdminAuthModal(false);
  };

  const handleLogoutAdmin = () => {
    // Revert to customer account
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
    attendees: Array<{ name: string; email: string; phone: string; idLast4: string }>;
  }) => {
    const res = storageService.createBooking({
      userId: currentUser.id,
      ...payload,
    });

    if (res.success && res.booking) {
      setSelectedEventForDetail(null);
      setActiveBookingForPayment(res.booking);
    } else {
      alert(res.error || 'Gagal membuat pesanan checkout.');
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
    // If not admin, require admin login first
    if (currentUser.role === 'customer') {
      setShowAdminAuthModal(true);
    } else {
      setActiveTab('admin_dashboard');
    }
  };

  const handleResetData = () => {
    if (confirm('Kembalikan semua database dan tiket ke data awal contoh?')) {
      storageService.resetAllData();
      setActiveTab('catalog');
    }
  };

  const isAdminOrStaff = currentUser.role !== 'customer';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1c0f1c] via-[#261421] to-[#22170f] text-stone-100 flex flex-col font-sans selection:bg-pink-500/40 selection:text-pink-200 relative overflow-x-hidden">
      {/* Radiant ambient glow in pink & yellow */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-pink-500/15 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full bg-amber-400/15 blur-[120px]" />
        <div className="absolute -bottom-32 left-1/4 w-[600px] h-[600px] rounded-full bg-rose-500/12 blur-[130px]" />
      </div>

      {/* Top Bar Header with Alas Cerita Branding & Auth Gate */}
      <Header
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        users={users}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'admin_dashboard' && !isAdminOrStaff) {
            setShowAdminAuthModal(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onResetData={handleResetData}
        onOpenAdminLogin={() => setShowAdminAuthModal(true)}
        onLogoutAdmin={handleLogoutAdmin}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
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

        {/* ADMIN UNIFIED DASHBOARD: Only accessible by authenticated Admin/Staff */}
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

        {/* Protection fallback if non-admin somehow hits admin_dashboard tab */}
        {activeTab === 'admin_dashboard' && !isAdminOrStaff && (
          <div className="p-12 text-center bg-stone-900/60 rounded-3xl border border-stone-800 space-y-4 max-w-md mx-auto my-12">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-[#FA7022] flex items-center justify-center mx-auto">
              <Ticket className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Akses Dibatasi</h2>
            <p className="text-xs text-stone-400">
              Dashboard Gate Scanner dan Manajemen Tiket hanya dapat diakses oleh Admin dan Petugas resmi Alas Cerita.
            </p>
            <button
              onClick={() => setShowAdminAuthModal(true)}
              className="px-6 py-2.5 bg-[#FA7022] hover:bg-[#e05e13] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-orange-500/30 cursor-pointer"
            >
              Login Admin Sekarang (admin / admin)
            </button>
          </div>
        )}
      </main>

      {/* Admin Authentication Modal: username: admin / password: admin */}
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

      {/* Checkout & Payment Gateway Simulator */}
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

      {/* Customer E-Ticket Preview Modal (Shown right after successful checkout) */}
      {customerSuccessTicket && (
        <ETicketModal
          ticket={customerSuccessTicket}
          event={events.find((e) => e.id === customerSuccessTicket.eventId) || events[0]}
          onClose={() => setCustomerSuccessTicket(null)}
        />
      )}

      {/* Quiet Technical Footer with Alas Cerita Branding */}
      <footer className="border-t border-pink-900/30 bg-[#170b16]/90 py-8 px-4 text-xs text-stone-400 mt-auto no-print backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-pink-400">Alas Cerita Event Organizer</span>
            <span>&middot;</span>
            <span className="text-yellow-300/90 font-medium">Sistem Pemesanan &amp; Validasi E-Ticket Resmi</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono text-stone-400">
            <span>UUID v4 Encrypted QR</span>
            <span>&middot;</span>
            <span>Anti-Double Scan Engine</span>
            <span>&middot;</span>
            <button
              onClick={() => setShowAdminAuthModal(true)}
              className="text-pink-400 hover:text-yellow-300 transition-colors underline cursor-pointer"
            >
              Login Admin (admin / admin)
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
