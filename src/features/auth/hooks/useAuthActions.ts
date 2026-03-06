import { useCallback, type MutableRefObject } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { clearCachedSession } from '../../../lib/sessionCache';
import { deriveUserProfile } from '../services/authProfile';
import type { Contact, ContactStatus, Event } from '../../../types';
import type { Founder, Incubatee } from '../../incubatees/components/IncubateeTable';

interface CachedSession {
  accessToken: string;
  user: any;
}

interface UseAuthActionsParams {
  cachedSessionRef: MutableRefObject<CachedSession | null>;
  setIsLoggedIn: (value: boolean) => void;
  setActiveTab: (value: string) => void;
  setShowForm: (value: boolean) => void;
  setEditingContact: (value: Contact | null) => void;
  setViewingContact: (value: Contact | null) => void;
  setShowImport: (value: boolean) => void;
  setShowExport: (value: boolean) => void;
  setSelectedContacts: (value: string[]) => void;
  setShowCreateEvent: (value: boolean) => void;
  setViewingEvent: (value: Event | null) => void;
  setShowDeleteConfirm: (value: boolean) => void;
  setShowPersonalSettings: (value: boolean) => void;
  setCurrentUserName: (value: string) => void;
  setCurrentUserEmail: (value: string) => void;
  setHasExistingPassword: (value: boolean) => void;
  setIncubatees: (value: Incubatee[]) => void;
  setUnassignedFounders: (value: Founder[]) => void;
  setSelectedIncubatees: (value: string[]) => void;
  setShowIncubateeForm: (value: boolean) => void;
  setEditingIncubatee: (value: Incubatee | null) => void;
  setViewingIncubatee: (value: Incubatee | null) => void;
  setViewingFounder: (value: { founder: Founder; incubatee: Incubatee } | null) => void;
  setShowAddFounderModal: (value: boolean) => void;
  setShowDeleteIncubateeConfirm: (value: boolean) => void;
  setShowIncubateeExport: (value: boolean) => void;
  setShowFounderExport: (value: boolean) => void;
  setSearchQuery: (value: string) => void;
  setGraduatedFrom: (value: string) => void;
  setGraduatedTo: (value: string) => void;
  setStatusFilter: (value: 'all' | ContactStatus) => void;
}

export function useAuthActions({
  cachedSessionRef,
  setIsLoggedIn,
  setActiveTab,
  setShowForm,
  setEditingContact,
  setViewingContact,
  setShowImport,
  setShowExport,
  setSelectedContacts,
  setShowCreateEvent,
  setViewingEvent,
  setShowDeleteConfirm,
  setShowPersonalSettings,
  setCurrentUserName,
  setCurrentUserEmail,
  setHasExistingPassword,
  setIncubatees,
  setUnassignedFounders,
  setSelectedIncubatees,
  setShowIncubateeForm,
  setEditingIncubatee,
  setViewingIncubatee,
  setViewingFounder,
  setShowAddFounderModal,
  setShowDeleteIncubateeConfirm,
  setShowIncubateeExport,
  setShowFounderExport,
  setSearchQuery,
  setGraduatedFrom,
  setGraduatedTo,
  setStatusFilter,
}: UseAuthActionsParams) {
  const handleLogin = useCallback(async () => {
    setIsLoggedIn(true);
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      const { name, email } = deriveUserProfile(data.session.user);
      setCurrentUserEmail(email);
      setCurrentUserName(name);
    }
  }, [setCurrentUserEmail, setCurrentUserName, setIsLoggedIn]);

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Supabase: failed to sign out', error);
    }

    clearCachedSession();
    cachedSessionRef.current = null;
    localStorage.removeItem('auth_method');
    localStorage.removeItem('login_initiated');
    localStorage.removeItem('pending_google_oauth');
    setIsLoggedIn(false);
    setActiveTab('home');
    setShowForm(false);
    setEditingContact(null);
    setViewingContact(null);
    setShowImport(false);
    setShowExport(false);
    setSelectedContacts([]);
    setShowCreateEvent(false);
    setViewingEvent(null);
    setShowDeleteConfirm(false);
    setShowPersonalSettings(false);
    setCurrentUserName('');
    setCurrentUserEmail('');
    setHasExistingPassword(false);
    setIncubatees([]);
    setUnassignedFounders([]);
    setSelectedIncubatees([]);
    setShowIncubateeForm(false);
    setEditingIncubatee(null);
    setViewingIncubatee(null);
    setViewingFounder(null);
    setShowAddFounderModal(false);
    setShowDeleteIncubateeConfirm(false);
    setShowIncubateeExport(false);
    setShowFounderExport(false);
    setSearchQuery('');
    setGraduatedFrom('');
    setGraduatedTo('');
    setStatusFilter('all');
    localStorage.removeItem('auth_method');
  }, [
    cachedSessionRef,
    setActiveTab,
    setCurrentUserEmail,
    setCurrentUserName,
    setEditingContact,
    setEditingIncubatee,
    setGraduatedFrom,
    setGraduatedTo,
    setHasExistingPassword,
    setIncubatees,
    setIsLoggedIn,
    setSearchQuery,
    setSelectedContacts,
    setSelectedIncubatees,
    setShowAddFounderModal,
    setShowCreateEvent,
    setShowDeleteConfirm,
    setShowDeleteIncubateeConfirm,
    setShowExport,
    setShowForm,
    setShowFounderExport,
    setShowImport,
    setShowIncubateeExport,
    setShowIncubateeForm,
    setShowPersonalSettings,
    setStatusFilter,
    setUnassignedFounders,
    setViewingContact,
    setViewingEvent,
    setViewingFounder,
    setViewingIncubatee,
  ]);

  return { handleLogin, handleLogout };
}
