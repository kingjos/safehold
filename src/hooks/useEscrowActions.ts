import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from './useWallet';
import { useAuth } from './useAuth';

export const useEscrowActions = () => {
  const [loading, setLoading] = useState(false);
  const { refetch: refetchWallet } = useWallet();
  const { user } = useAuth();

  const fundEscrow = async (escrowId: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('fund_escrow_from_wallet', {
        p_escrow_id: escrowId
      });

      if (error) throw error;

      refetchWallet();
      return { success: true };
    } catch (error: any) {
      console.error('Error funding escrow:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const releaseEscrow = async (escrowId: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('release_escrow_funds', {
        p_escrow_id: escrowId
      });

      if (error) throw error;

      refetchWallet();
      return { success: true };
    } catch (error: any) {
      console.error('Error releasing escrow:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const startWork = async (escrowId: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', escrowId);

      if (error) throw error;

      // Create transaction event
      await supabase.from('transaction_events').insert({
        transaction_id: escrowId,
        user_id: user?.id,
        event_type: 'started',
        description: 'Vendor started working on the project'
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error starting work:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const markComplete = async (escrowId: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'pending_release' })
        .eq('id', escrowId);

      if (error) throw error;

      // Create transaction event
      await supabase.from('transaction_events').insert({
        transaction_id: escrowId,
        user_id: user?.id,
        event_type: 'pending_release',
        description: 'Vendor marked the project as completed'
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error marking complete:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const cancelEscrow = async (escrowId: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'cancelled' })
        .eq('id', escrowId);

      if (error) throw error;

      // Create transaction event
      await supabase.from('transaction_events').insert({
        transaction_id: escrowId,
        user_id: user?.id,
        event_type: 'cancelled',
        description: 'Transaction was cancelled'
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error cancelling escrow:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    fundEscrow,
    releaseEscrow,
    startWork,
    markComplete,
    cancelEscrow
  };
};
