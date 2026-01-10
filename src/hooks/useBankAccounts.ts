import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface BankAccount {
  id: string;
  user_id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_default: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export const useBankAccounts = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    if (!user) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts((data || []) as BankAccount[]);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const addAccount = async (
    bankName: string,
    accountNumber: string,
    accountName: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate inputs
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      return { success: false, error: 'All fields are required' };
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      return { success: false, error: 'Account number must be 10 digits' };
    }

    if (accountName.length > 100) {
      return { success: false, error: 'Account name is too long' };
    }

    try {
      const { error } = await supabase
        .from('bank_accounts')
        .insert({
          user_id: user.id,
          bank_name: bankName.trim(),
          account_number: accountNumber.trim(),
          account_name: accountName.trim(),
        });

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'This bank account already exists' };
        }
        throw error;
      }

      await fetchAccounts();
      return { success: true };
    } catch (error: any) {
      console.error('Error adding bank account:', error);
      return { success: false, error: error.message };
    }
  };

  const setDefaultAccount = async (accountId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { error } = await supabase
        .from('bank_accounts')
        .update({ is_default: true })
        .eq('id', accountId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchAccounts();
      return { success: true };
    } catch (error: any) {
      console.error('Error setting default account:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteAccount = async (accountId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const account = accounts.find(a => a.id === accountId);
    if (account?.is_default && accounts.length > 1) {
      return { success: false, error: 'Cannot delete default account. Set another account as default first.' };
    }

    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', accountId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchAccounts();
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting bank account:', error);
      return { success: false, error: error.message };
    }
  };

  const getDefaultAccount = () => accounts.find(a => a.is_default) || accounts[0] || null;

  return {
    accounts,
    loading,
    addAccount,
    setDefaultAccount,
    deleteAccount,
    getDefaultAccount,
    refetch: fetchAccounts,
  };
};
