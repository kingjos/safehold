import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from './useWallet';

export const useEscrowActions = () => {
  const [loading, setLoading] = useState(false);
  const { refetch: refetchWallet } = useWallet();

  const callRpc = async (
    fn:
      | 'fund_escrow_from_wallet'
      | 'release_escrow_funds'
      | 'vendor_accept_escrow'
      | 'vendor_mark_complete'
      | 'vendor_decline_escrow'
      | 'client_cancel_pending_escrow',
    params: Record<string, unknown>,
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc(fn as any, params as any);
      if (error) throw error;
      refetchWallet();
      return { success: true };
    } catch (error: any) {
      console.error(`Error calling ${fn}:`, error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const fundEscrow = (escrowId: string) =>
    callRpc('fund_escrow_from_wallet', { p_escrow_id: escrowId });

  const releaseEscrow = (escrowId: string) =>
    callRpc('release_escrow_funds', { p_escrow_id: escrowId });

  // "Start work" is now an explicit accept action
  const startWork = (escrowId: string) =>
    callRpc('vendor_accept_escrow', { p_escrow_id: escrowId });

  const acceptEscrow = startWork;

  const declineEscrow = (escrowId: string, reason?: string) =>
    callRpc('vendor_decline_escrow', { p_escrow_id: escrowId, p_reason: reason ?? null });

  const markComplete = (escrowId: string) =>
    callRpc('vendor_mark_complete', { p_escrow_id: escrowId });

  const cancelEscrow = (escrowId: string) =>
    callRpc('client_cancel_pending_escrow', { p_escrow_id: escrowId });

  return {
    loading,
    fundEscrow,
    releaseEscrow,
    startWork,
    acceptEscrow,
    declineEscrow,
    markComplete,
    cancelEscrow,
  };
};
