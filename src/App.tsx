import React, { useEffect } from 'react';
import { useStore } from './store/useStore';
import { LoginPage } from './components/auth/LoginPage';
import { Header } from './components/layout/Header';
import { Navigation } from './components/layout/Navigation';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { CashierPOS } from './components/pos/CashierPOS';
import { OpenShiftModal } from './components/pos/OpenShiftModal';
import { CloseShiftModal } from './components/pos/CloseShiftModal';
import { ProductList } from './components/inventory/ProductList';
import { CashflowManager } from './components/finance/CashflowManager';
import { ReportsDashboard } from './components/reports/ReportsDashboard';
import { AuditLogViewer } from './components/audit/AuditLogViewer';
import { SettingsManager } from './components/settings/SettingsManager';
import { AIAssistantDrawer } from './components/ai/AIAssistantDrawer';
import { FloatingTeamChat } from './components/chat/FloatingTeamChat';

export function App() {
  const {
    users,
    addUser,
    updateUser,
    deleteUser,
    isLoggedIn,
    login,
    logout,
    storeName,
    setStoreName,
    storeLogoUrl,
    setStoreLogoUrl,
    currentUser,
    switchRole,
    branches,
    addBranch,
    updateBranch,
    deleteBranch,
    activeBranch,
    setActiveBranch,
    isOnline,
    unsyncedCount,
    checkUnsyncedQueue,
    activeTab,
    setActiveTab,
    activeShift,
    setActiveShift,
    isAIDrawerOpen,
    setIsAIDrawerOpen,
    isOpenShiftModalOpen,
    setIsOpenShiftModalOpen,
    isCloseShiftModalOpen,
    setIsCloseShiftModalOpen,
    cartItems,
    heldCarts,
    holdCurrentCart,
    restoreHeldCart,
    deleteHeldCart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    cartSubtotal,
    cartItemDiscounts,
    promoDiscount,
    cartGrandTotal,
    selectedCustomer,
    setSelectedCustomer,
    appliedPromotion,
    setAppliedPromotion,
    isMultiBranchEnabled,
    setIsMultiBranchEnabled,
    initializeStore
  } = useStore();

  useEffect(() => {
    initializeStore();
  }, []);

  if (!isLoggedIn) {
    return (
      <LoginPage
        onLoginSuccess={(user, branch) => login(user, undefined, branch)}
        onLogin={(role, userDetails) => login(role, userDetails)}
        storeName={storeName || activeBranch?.name}
        storeLogoUrl={storeLogoUrl}
        users={users}
        branches={branches}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#eef2f6] text-slate-800 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Main Navigation Header */}
      <Header
        currentUser={currentUser}
        switchRole={switchRole}
        onLogout={logout}
        storeName={storeName || activeBranch?.name || 'Mart Segar Utama'}
        storeLogoUrl={storeLogoUrl}
        activeBranchName={activeBranch?.name || 'Toko Utama'}
        isMultiBranchEnabled={isMultiBranchEnabled}
        activeShift={activeShift}
        setIsOpenShiftModalOpen={setIsOpenShiftModalOpen}
        setIsCloseShiftModalOpen={setIsCloseShiftModalOpen}
        isOnline={isOnline}
        unsyncedCount={unsyncedCount}
        triggerSync={checkUnsyncedQueue}
        setIsAIAssistantOpen={setIsAIDrawerOpen}
      />

      {/* Role-Based Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={currentUser.role}
        currentUser={currentUser}
        switchRole={switchRole}
        onLogout={logout}
      />

      {/* Main Active Tab Screen Container */}
      <main className="transition-all duration-200 pb-20 md:pb-6 max-w-full overflow-x-hidden">
        {activeTab === 'dashboard' && (
          <DashboardOverview
            userRole={currentUser.role}
            activeBranch={activeBranch}
            activeShift={activeShift}
            setActiveTab={setActiveTab}
            onOpenShift={() => setIsOpenShiftModalOpen(true)}
            setIsAIAssistantOpen={setIsAIDrawerOpen}
          />
        )}

        {activeTab === 'pos' && (
          <CashierPOS
            currentUser={currentUser}
            activeBranch={activeBranch}
            activeShift={activeShift}
            setIsOpenShiftModalOpen={setIsOpenShiftModalOpen}
            cartItems={cartItems}
            heldCarts={heldCarts}
            holdCurrentCart={holdCurrentCart}
            restoreHeldCart={restoreHeldCart}
            deleteHeldCart={deleteHeldCart}
            addToCart={addToCart}
            updateCartQuantity={updateCartQuantity}
            removeFromCart={removeFromCart}
            clearCart={clearCart}
            cartSubtotal={cartSubtotal}
            cartItemDiscounts={cartItemDiscounts}
            promoDiscount={promoDiscount}
            cartGrandTotal={cartGrandTotal}
            selectedCustomer={selectedCustomer}
            setSelectedCustomer={setSelectedCustomer}
            appliedPromotion={appliedPromotion}
            setAppliedPromotion={setAppliedPromotion}
          />
        )}

        {activeTab === 'inventory' && (
          <ProductList userRole={currentUser.role} activeBranch={activeBranch} currentUser={currentUser} />
        )}

        {activeTab === 'finance' && (
          <CashflowManager userRole={currentUser.role} currentUser={currentUser} activeBranch={activeBranch} />
        )}

        {activeTab === 'reports' && <ReportsDashboard userRole={currentUser.role} />}

        {activeTab === 'audit' && <AuditLogViewer />}

        {activeTab === 'settings' && (
          <SettingsManager
            activeBranch={activeBranch}
            setActiveBranch={setActiveBranch}
            isMultiBranchEnabled={isMultiBranchEnabled}
            setIsMultiBranchEnabled={setIsMultiBranchEnabled}
            currentUser={currentUser}
            storeName={storeName}
            setStoreName={setStoreName}
            storeLogoUrl={storeLogoUrl}
            setStoreLogoUrl={setStoreLogoUrl}
            users={users}
            onAddUser={addUser}
            onUpdateUser={updateUser}
            onDeleteUser={deleteUser}
            branches={branches}
            onAddBranch={addBranch}
            onUpdateBranch={updateBranch}
            onDeleteBranch={deleteBranch}
          />
        )}
      </main>

      {/* Modals & Drawers */}
      {isOpenShiftModalOpen && (
        <OpenShiftModal
          currentUser={currentUser}
          activeBranch={activeBranch}
          setActiveShift={setActiveShift}
          onClose={() => setIsOpenShiftModalOpen(false)}
        />
      )}

      {isCloseShiftModalOpen && (
        <CloseShiftModal
          activeShift={activeShift}
          setActiveShift={setActiveShift}
          currentUser={currentUser}
          onClose={() => setIsCloseShiftModalOpen(false)}
        />
      )}

      <AIAssistantDrawer isOpen={isAIDrawerOpen} onClose={() => setIsAIDrawerOpen(false)} />
      
      {/* Global Floating Team Chat FAB for Manager, Owner & Cashier */}
      <FloatingTeamChat currentUser={currentUser} />
    </div>
  );
}

export default App;

