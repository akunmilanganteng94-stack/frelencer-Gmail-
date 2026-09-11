import { createContext, useContext, useState, ReactNode } from 'react';
import { ContactAdminModal, ContactAdminFloatingButton } from '../components/ContactAdminModal';
import { ChannelPopup } from '../components/ChannelPopup';

interface ContactAdminContextType {
  openContactModal: () => void;
  closeContactModal: () => void;
  openChannelModal: () => void;
  closeChannelModal: () => void;
}

const ContactAdminContext = createContext<ContactAdminContextType | undefined>(undefined);

export function ContactAdminProvider({ children }: { children: ReactNode }) {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isChannelOpen, setIsChannelOpen] = useState(false);

  const openContactModal = () => setIsAdminOpen(true);
  const closeContactModal = () => setIsAdminOpen(false);

  const openChannelModal = () => setIsChannelOpen(true);
  const closeChannelModal = () => setIsChannelOpen(false);

  return (
    <ContactAdminContext.Provider
      value={{ openContactModal, closeContactModal, openChannelModal, closeChannelModal }}
    >
      {children}
      <ContactAdminModal isOpen={isAdminOpen} onClose={closeContactModal} />
      <ChannelPopup isOpen={isChannelOpen} onClose={closeChannelModal} />
      <ContactAdminFloatingButton
        onClickAdmin={openContactModal}
        onClickChannel={openChannelModal}
      />
    </ContactAdminContext.Provider>
  );
}

export function useContactAdmin() {
  const context = useContext(ContactAdminContext);
  if (!context) {
    throw new Error('useContactAdmin must be used within a ContactAdminProvider');
  }
  return context;
}

