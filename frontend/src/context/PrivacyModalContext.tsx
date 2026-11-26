import React, { createContext, useContext, useState } from 'react';
import { PrivacyInventoryModal } from '../components/privacy/PrivacyInventoryModal';

export interface PrivacyModalContextType {
  openPrivacyModal: () => void;
  closePrivacyModal: () => void;
  isPrivacyModalOpen: boolean;
}

const PrivacyModalContext = createContext<PrivacyModalContextType | undefined>(undefined);

export const PrivacyModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openPrivacyModal = () => setIsOpen(true);
  const closePrivacyModal = () => setIsOpen(false);

  return (
    <PrivacyModalContext.Provider
      value={{
        openPrivacyModal,
        closePrivacyModal,
        isPrivacyModalOpen: isOpen,
      }}
    >
      {children}
      <PrivacyInventoryModal isOpen={isOpen} onClose={closePrivacyModal} />
    </PrivacyModalContext.Provider>
  );
};

export const usePrivacyModal = (): PrivacyModalContextType => {
  const context = useContext(PrivacyModalContext);
  if (!context) {
    throw new Error('usePrivacyModal must be used within a PrivacyModalProvider');
  }
  return context;
};
