import { createContext, useContext, useState, ReactNode } from 'react';
import { ContactAdminModal, ContactAdminFloatingButton } from '../components/ContactAdminModal';

interface ContactAdminContextType {
  openContactModal: () => void;
  closeContactModal: () => void;
}

const ContactAdminContext = createContext<ContactAdminContextType | undefined>(undefined);

export function ContactAdminProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openContactModal = () => setIsOpen(true);
  const closeContactModal = () => setIsOpen(false);

  return (
    <ContactAdminContext.Provider value={{ openContactModal, closeContactModal }}>
      {children}
      <ContactAdminModal isOpen={isOpen} onClose={closeContactModal} />
      <ContactAdminFloatingButton onClick={openContactModal} />
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
