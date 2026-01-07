import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface WalletTransaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'escrow_fund' | 'escrow_release' | 'refund';
  amount: number;
  balance_after: number;
  description: string;
  reference: string | null;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  escrow_id: string | null;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export const useWallet = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  const fetchWallet = useCallback(async () => {
    if (!user) {
      setWallet(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      // If wallet doesn't exist, it will be created on first fund operation
      setWallet(data);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      setTransactionsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setTransactions((data || []) as WalletTransaction[]);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setTransactionsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, [fetchWallet, fetchTransactions]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const walletChannel = supabase
      .channel('wallet-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchWallet();
        }
      )
      .subscribe();

    const transactionChannel = supabase
      .channel('wallet-transaction-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchTransactions();
          fetchWallet();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(transactionChannel);
    };
  }, [user, fetchWallet, fetchTransactions]);

  const fundWallet = async (amount: number, reference?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.rpc('fund_wallet', {
        p_amount: amount,
        p_reference: reference || null
      });

      if (error) throw error;

      await fetchWallet();
      await fetchTransactions();
      
      return { success: true };
    } catch (error: any) {
      console.error('Error funding wallet:', error);
      return { success: false, error: error.message };
    }
  };

  const withdrawWallet = async (amount: number, bankDetails?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.rpc('withdraw_wallet', {
        p_amount: amount,
        p_bank_details: bankDetails || null
      });

      if (error) throw error;

      await fetchWallet();
      await fetchTransactions();
      
      return { success: true };
    } catch (error: any) {
      console.error('Error withdrawing from wallet:', error);
      return { success: false, error: error.message };
    }
  };

  const getBalance = () => wallet?.balance || 0;

  const getDeposits = () => 
    transactions.filter(t => t.type === 'deposit' || t.type === 'escrow_release' || t.type === 'refund');

  const getOutflows = () => 
    transactions.filter(t => t.type === 'withdrawal' || t.type === 'escrow_fund');

  return {
    wallet,
    balance: getBalance(),
    transactions,
    deposits: getDeposits(),
    outflows: getOutflows(),
    loading,
    transactionsLoading,
    fundWallet,
    withdrawWallet,
    refetch: () => {
      fetchWallet();
      fetchTransactions();
    }
  };
};
