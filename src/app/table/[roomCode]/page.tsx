'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTableStore } from '@/store/useTableStore';
import { PokerTable } from '@/components/TableCanvas/PokerTable';
import { TableTopBar } from '@/components/TableCanvas/TableTopBar';
import { TableState } from '@/types/poker';
import { Button } from '@/components/ui/button';
import { Card as UICard, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@radix-ui/react-label';
import { HyperText } from '@/components/HyperText';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { ArrowLeft } from 'lucide-react';
import { LeaveTableDialog } from '@/components/LeaveTableDialog';
import { RebuyDialog } from '@/components/RebuyDialog';
import { WinnerDisplay } from '@/components/TableCanvas/WinnerDisplay';
import { CountdownTimer } from '@/components/TableCanvas/CountdownTimer';
import { createClient } from '@/lib/supabase/client';
import { AuthDialog } from '@/components/AuthDialog';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';


function TablePageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomCode = params.roomCode as string;
  const [playerName, setPlayerName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [rebuyDialogOpen, setRebuyDialogOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState<string>('');
  const [userChips, setUserChips] = useState<number>(0);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [insufficientChipsDialogOpen, setInsufficientChipsDialogOpen] = useState(false);
  const [requiredChips, setRequiredChips] = useState<number>(0);
  const [originalBuyIn, setOriginalBuyIn] = useState<number>(0); // Track original buy-in for net profit calculation
  const [tableSettingsFetched, setTableSettingsFetched] = useState(false);
  const [chipsCheckedAfterJoin, setChipsCheckedAfterJoin] = useState(false);
  const [tableMinBuyIn, setTableMinBuyIn] = useState<number>(0);
  const [tableMaxBuyIn, setTableMaxBuyIn] = useState<number>(0);

  const state = useTableStore((state) => state.state);
  const playerId = useTableStore((state) => state.playerId);
  const isConnected = useTableStore((state) => state.isConnected);
  const connect = useTableStore((state) => state.connect);
  const disconnect = useTableStore((state) => state.disconnect);
  const rebuy = useTableStore((state) => state.rebuy);
  const winnerInfo = useTableStore((state) => state.winnerInfo);
  const countdown = useTableStore((state) => state.countdown);

  // Check authentication on mount and listen for changes
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          setUser(authUser);
          // Fetch username and chips from profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, chips')
            .eq('id', authUser.id)
            .single();
          
          if (profile) {
            setUsername(profile.username);
            // Only update userChips if we haven't already deducted (i.e., not joined yet)
            // This prevents overwriting the deducted amount
            if (!hasJoined) {
              setUserChips(profile.chips || 0);
            }
            setPlayerName(profile.username); // Auto-fill player name
          }
        } else {
          // If not logged in, redirect to home (user should have been checked at game mode selection)
          router.push('/');
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        checkAuth();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  // When joining by code, connect first to get table state and settings
  useEffect(() => {
    const hasUrlParams = searchParams.get('minBuyIn') || searchParams.get('maxBuyIn');
    
    // If joining by code (no URL params), connect first to get table settings
    if (!hasUrlParams && !checkingAuth && user && !isConnected && !hasJoined && !tableSettingsFetched) {
      // Connect to socket to get table state
      const tempSocket = require('socket.io-client')(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5050');
      
      tempSocket.on('connect', () => {
        // Join room to get state (we'll disconnect after)
        tempSocket.emit('room:join', { roomCode, name: 'settings_check', buyIn: 0 });
      });
      
      tempSocket.on('table:state', (tableState: any) => {
        // Got table state - extract settings
        if (tableState.maxBet) {
          const maxBuyIn = tableState.maxBet;
          const minBuyIn = Math.floor(maxBuyIn * 0.2); // 20% of max as minimum
          console.log(`📋 Table settings from server: minBuyIn=${minBuyIn}, maxBuyIn=${maxBuyIn}`);
          // Store table settings
          setTableMinBuyIn(minBuyIn);
          setTableMaxBuyIn(maxBuyIn);
          setTableSettingsFetched(true);
        }
        // Disconnect after getting state
        setTimeout(() => {
          tempSocket.disconnect();
        }, 100);
      });
      
      tempSocket.on('error', (error: any) => {
        console.error('Error getting table settings:', error);
        tempSocket.disconnect();
      });
      
      return () => {
        tempSocket.disconnect();
      };
    }
  }, [checkingAuth, user, isConnected, hasJoined, tableSettingsFetched, searchParams, roomCode]);

  // Auto-join when user and username are available
  useEffect(() => {
    const hasUrlParams = searchParams.get('minBuyIn') || searchParams.get('maxBuyIn');
    const isReady = hasUrlParams || tableSettingsFetched;
    
    if (!checkingAuth && user && username && !hasJoined && isReady) {
      // Auto-join with chip deduction
      handleJoin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingAuth, user, username, hasJoined, tableSettingsFetched]);

  // Debug countdown changes
  useEffect(() => {
    console.log('⏱️ Countdown value changed in page:', countdown);
  }, [countdown]);

  // Debug logging
  useEffect(() => {
    if (state) {
      console.log('Table state updated:', {
        players: state.players.length,
        street: state.street,
        pot: state.pot,
        toActPlayerId: state.toActPlayerId,
        communityCards: state.community.length,
      });
    }
  }, [state]);

  const handleJoin = async () => {
    // Prevent multiple joins
    if (hasJoined) {
      console.log('⚠️ Already joined, skipping handleJoin');
      return;
    }
    
    // Check if user is logged in
    if (!user) {
      setAuthDialogOpen(true);
      return;
    }

    // Use username if available, otherwise use entered name
    const nameToUse = username || playerName.trim();
    
    if (!nameToUse) {
      alert('Please enter your name');
      return;
    }

    // Get table settings from URL params
    let minBuyIn = parseInt(searchParams.get('minBuyIn') || '0');
    let maxBuyIn = parseInt(searchParams.get('maxBuyIn') || '0');
    const buyIn = parseInt(searchParams.get('buyIn') || '0');
    const smallBlind = parseInt(searchParams.get('smallBlind') || '0');
    const bigBlind = parseInt(searchParams.get('bigBlind') || '0');

    // If joining by code (no URL params), use table settings we fetched
    if (minBuyIn === 0 && maxBuyIn === 0) {
      if (tableMinBuyIn > 0 && tableMaxBuyIn > 0) {
        // Use settings we fetched from the table
        minBuyIn = tableMinBuyIn;
        maxBuyIn = tableMaxBuyIn;
        console.log(`📋 Joining by code - using table settings: minBuyIn=${minBuyIn}, maxBuyIn=${maxBuyIn}`);
      } else {
        // Fallback to defaults if we couldn't get table settings
        maxBuyIn = 1000;
        minBuyIn = 200;
        console.log(`⚠️ Joining by code - using fallback defaults: minBuyIn=${minBuyIn}, maxBuyIn=${maxBuyIn}`);
      }
    }

    // Skip chip validation here - we'll check after joining
    // This allows join-by-code to work smoothly

    // Determine buy-in amount based on user's available chips and table limits
    // Rules:
    // - If user has >= maxBuyIn, use maxBuyIn (NOT their total chips)
    // - If user has < maxBuyIn but >= minBuyIn, use user's available chips
    // - If user has < minBuyIn, use what they have (we'll check after joining)
    let buyInAmount: number;
    if (minBuyIn > 0 && maxBuyIn > 0) {
      if (userChips >= maxBuyIn) {
        // User has enough for max, use max (NOT their total chips)
        buyInAmount = maxBuyIn;
      } else if (userChips >= minBuyIn) {
        // User has between min and max, use their available amount
        buyInAmount = userChips;
      } else {
        // User has less than min - use what they have (we'll check after joining)
        buyInAmount = userChips > 0 ? userChips : 0;
      }
    } else if (minBuyIn > 0) {
      // Only min specified, use user's chips (even if less than min)
      buyInAmount = userChips > 0 ? userChips : 0;
    } else if (maxBuyIn > 0) {
      // Only max specified, use user's chips if <= max, otherwise max
      buyInAmount = Math.min(userChips, maxBuyIn);
    } else {
      // Fallback to buyIn param or user's chips
      buyInAmount = buyIn > 0 ? Math.min(userChips, buyIn) : userChips;
    }
    
    // Store original buy-in for net profit calculation when leaving
    setOriginalBuyIn(buyInAmount);

    // Deduct chips from user profile IMMEDIATELY before connecting
    try {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        setHasJoined(false); // Reset to allow retry
        alert('You must be logged in to join a table.');
        return;
      }

      // Fetch current chips
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('chips')
        .eq('id', authUser.id)
        .single();

      if (fetchError) {
        console.error('Error fetching profile:', fetchError);
        setHasJoined(false); // Reset to allow retry
        alert('Failed to fetch your profile. Please try again.');
        return;
      }

      if (!profile) {
        setHasJoined(false); // Reset to allow retry
        alert('Profile not found. Please try again.');
        return;
      }

      // Check if user has enough chips - if not, use what they have
      const actualBuyIn = Math.min(profile.chips, buyInAmount);
      if (profile.chips < buyInAmount) {
        console.warn(`⚠️ User has ${profile.chips} chips but calculated buy-in is ${buyInAmount}. Using ${actualBuyIn} instead.`);
        buyInAmount = actualBuyIn;
        setOriginalBuyIn(actualBuyIn);
      }

      // Only deduct if user has chips
      if (actualBuyIn <= 0) {
        console.warn(`⚠️ User has no chips to buy in with`);
        // Still allow join, but we'll check and prompt after
        buyInAmount = 0;
        setOriginalBuyIn(0);
      } else {
        // Deduct chips - CRITICAL: This must complete before connecting
        const newChips = profile.chips - actualBuyIn;
        console.log(`💰 Deducting ${actualBuyIn} chips. Current: ${profile.chips}, New: ${newChips}`);
        
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({ chips: newChips })
          .eq('id', authUser.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error deducting chips:', updateError);
          setHasJoined(false); // Reset to allow retry
          alert(`Failed to deduct chips: ${updateError.message}. Please try again.`);
          return;
        }

        if (!updatedProfile) {
          console.error('No profile returned after update');
          setHasJoined(false); // Reset to allow retry
          alert('Failed to update chips. Please try again.');
          return;
        }

        // Verify the update worked
        if (updatedProfile.chips !== newChips) {
          console.error(`Chip update mismatch! Expected: ${newChips}, Got: ${updatedProfile.chips}`);
          setHasJoined(false); // Reset to allow retry
          alert('Chip deduction verification failed. Please try again.');
          return;
        }

        // Update local state
        setUserChips(updatedProfile.chips);
        console.log(`✅ Successfully deducted ${actualBuyIn} chips. Remaining: ${updatedProfile.chips}`);
      }
      
    } catch (error) {
      console.error('Error processing buy-in:', error);
      setHasJoined(false); // Reset to allow retry
      alert(`Failed to process buy-in: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
      return;
    }
    
    // Ensure buyInAmount is a valid positive number
    if (!buyInAmount || buyInAmount <= 0) {
      console.error('❌ Invalid buyInAmount:', buyInAmount);
      setHasJoined(false); // Reset to allow retry
      alert('Invalid buy-in amount. Please try again.');
      return;
    }
    
    // Fetch user's profile picture before connecting
    let profilePic: string | null = null;
    try {
      const supabase = createClient();
      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_pic')
        .eq('id', user.id)
        .single();
      if (profile?.profile_pic) {
        profilePic = profile.profile_pic;
      }
    } catch (error) {
      console.error('Error fetching profile picture:', error);
    }
    
    console.log('🔵 Join button clicked, connecting...', { roomCode, playerName: nameToUse, buyInAmount, smallBlind, bigBlind, buyInType: typeof buyInAmount, profilePic });
    setHasJoined(true);
    connect(roomCode, nameToUse, buyInAmount, smallBlind, bigBlind, profilePic);
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Check chips after joining - if insufficient, prompt to leave
  useEffect(() => {
    if (hasJoined && playerId && state && !chipsCheckedAfterJoin) {
      const currentPlayer = state.players.find(p => p.id === playerId);
      if (currentPlayer) {
        setChipsCheckedAfterJoin(true);
        
        // Get table settings
        const hasUrlParams = searchParams.get('minBuyIn') || searchParams.get('maxBuyIn');
        let minBuyIn = parseInt(searchParams.get('minBuyIn') || '0');
        
        // If joining by code, get from state
        if (!hasUrlParams && state.maxBet) {
          minBuyIn = Math.floor(state.maxBet * 0.2); // 20% of max as minimum
        }
        
        // Check if player has enough chips for minimum buy-in
        if (minBuyIn > 0 && userChips < minBuyIn) {
          console.log(`⚠️ Player has ${userChips} chips but needs ${minBuyIn} for this table`);
          setRequiredChips(minBuyIn);
          setInsufficientChipsDialogOpen(true);
        }
      }
    }
  }, [hasJoined, playerId, state, chipsCheckedAfterJoin, userChips, searchParams, disconnect, router]);

  const currentState = state; // Only use real state from socket, no demo state
  const currentPlayerId = playerId;

  // Listen for custom event to show rebuy dialog after hand ends and pot is distributed
  // Only show rebuy dialog if player still has 0 stack AFTER the winner gets the pot
  useEffect(() => {
    const handleShowRebuy = () => {
      // Double-check that player still has 0 stack before showing dialog
      const currentPlayer = currentState?.players.find((p) => p.id === currentPlayerId);
      const hasZeroStack = currentPlayer && currentPlayer.stack === 0;
      
      // Only show if player has 0 stack and dialog is not already open
      if (hasZeroStack && !rebuyDialogOpen) {
        console.log('💸 Showing rebuy dialog - player has 0 stack after hand ended');
        setRebuyDialogOpen(true);
      }
    };
    
    window.addEventListener('showRebuyDialog', handleShowRebuy);
    return () => {
      window.removeEventListener('showRebuyDialog', handleShowRebuy);
    };
  }, [currentState, currentPlayerId, rebuyDialogOpen]);

  const handleRebuy = async () => {
    // Get table settings from URL params
    const minBuyIn = parseInt(searchParams.get('minBuyIn') || '0');
    const maxBuyIn = parseInt(searchParams.get('maxBuyIn') || '0');
    
    try {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        alert('You must be logged in to rebuy.');
        return;
      }

      // Fetch current chips
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('chips')
        .eq('id', authUser.id)
        .single();

      if (fetchError || !profile) {
        console.error('Error fetching profile for rebuy:', fetchError);
        alert('Failed to fetch your profile. Please try again.');
        return;
      }

      const currentChips = profile.chips || 0;

      // Calculate rebuy amount using same logic as initial join
      let rebuyAmount: number;
      if (minBuyIn > 0 && maxBuyIn > 0) {
        if (currentChips >= maxBuyIn) {
          rebuyAmount = maxBuyIn;
        } else if (currentChips >= minBuyIn) {
          rebuyAmount = currentChips; // Use all available chips if between min and max
        } else {
          // User has less than minimum - can't rebuy
          alert(`You need at least ${minBuyIn} chips to rebuy. You currently have ${currentChips} chips.`);
          setRebuyDialogOpen(false);
          return;
        }
      } else if (minBuyIn > 0) {
        if (currentChips >= minBuyIn) {
          rebuyAmount = currentChips;
        } else {
          alert(`You need at least ${minBuyIn} chips to rebuy. You currently have ${currentChips} chips.`);
          setRebuyDialogOpen(false);
          return;
        }
      } else if (maxBuyIn > 0) {
        rebuyAmount = Math.min(currentChips, maxBuyIn);
      } else {
        // Fallback to original buy-in or user's chips
        rebuyAmount = originalBuyIn > 0 ? Math.min(currentChips, originalBuyIn) : currentChips;
      }

      if (rebuyAmount <= 0) {
        alert('You don\'t have enough chips to rebuy.');
        setRebuyDialogOpen(false);
        return;
      }

      // Deduct chips from profile
      const newChips = currentChips - rebuyAmount;
      console.log(`💰 Rebuy: Deducting ${rebuyAmount} chips. Current: ${currentChips}, New: ${newChips}`);
      
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ chips: newChips })
        .eq('id', authUser.id)
        .select()
        .single();

      if (updateError || !updatedProfile) {
        console.error('Error deducting chips for rebuy:', updateError);
        alert(`Failed to deduct chips: ${updateError?.message || 'Unknown error'}. Please try again.`);
        return;
      }

      // Verify the update worked
      if (updatedProfile.chips !== newChips) {
        console.error(`Rebuy chip update mismatch! Expected: ${newChips}, Got: ${updatedProfile.chips}`);
        alert('Chip deduction verification failed. Please try again.');
        return;
      }

      // Update local state
      setUserChips(updatedProfile.chips);
      setOriginalBuyIn(rebuyAmount); // Update original buy-in for future rebuys
      console.log(`✅ Successfully rebought with ${rebuyAmount} chips. Remaining: ${updatedProfile.chips}`);

      // Now call rebuy with the calculated amount
      rebuy(rebuyAmount);
      setRebuyDialogOpen(false);
      
    } catch (error) {
      console.error('Error processing rebuy:', error);
      alert(`Failed to process rebuy: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
  };

  // Show join form if not joined yet and user doesn't have username
  // If user has username, auto-join will happen via handleJoin
  if (!hasJoined || !playerId) {
    if (checkingAuth) {
      return (
        <div className="min-h-screen text-white flex items-center justify-center relative z-10">
          <div className="text-center">
            <div className="text-lg font-mono mb-2">Loading...</div>
          </div>
        </div>
      );
    }

    // If user is logged in and has username, don't show the name input form
    // Just show loading while handleJoin processes
    if (user && username) {
      return (
        <div className="min-h-screen text-white flex items-center justify-center relative z-10">
          <div className="text-center">
            <div className="text-lg font-mono mb-2">Joining table...</div>
            <div className="text-sm text-white/60 font-mono">Processing buy-in...</div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen text-white flex items-center justify-center px-4 relative z-10">
        <div className="max-w-md w-full">
          <UICard className="bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)] font-mono">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-2">
                <HyperText
                  text="Join Table"
                  className="text-2xl font-semibold text-white tracking-tight"
                  animateOnLoad={false}
                />
              </div>
              <CardDescription className="text-white/60">
                {user ? `Join ${roomCode}` : 'Please login to join the table'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {user ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="playerName" className="text-white/90">Your Name</Label>
                    <Input
                      id="playerName"
                      type="text"
                      placeholder="Your name"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-0 focus-visible:outline-none"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-0">
                    <InteractiveHoverButton
                      onClick={handleJoin}
                      text="Join"
                      className="flex-1 rounded-r-none min-h-12 py-6"
                      disabled={!playerName.trim()}
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => router.push('/')}
                      className="border-white/20 text-white/70 hover:text-white hover:border-white/30 bg-white/5 min-h-12 py-6 px-6 font-semibold rounded-l-none border-l-0"
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <p className="text-white/70 text-center font-mono text-sm">
                    You need to be logged in to join a table.
                  </p>
                  <InteractiveHoverButton
                    onClick={() => setAuthDialogOpen(true)}
                    text="Login / Sign Up"
                    className="w-full min-h-12 py-6"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => router.push('/')}
                    className="w-full border-white/20 text-white/70 hover:text-white hover:border-white/30 bg-white/5 min-h-12 py-6 font-semibold"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </UICard>
        </div>
        <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
        
        {/* Insufficient Chips Dialog */}
        <Dialog open={insufficientChipsDialogOpen} onOpenChange={setInsufficientChipsDialogOpen}>
          <DialogContent className="max-w-md bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)] rounded-lg p-8 font-mono">
            <DialogTitle className="sr-only">Insufficient Chips</DialogTitle>
            <div className="text-center space-y-6">
              <div>
                <div className="text-6xl mb-4">💸</div>
                <h2 className="text-2xl font-bold text-white mb-2 font-mono">Not Enough Chips</h2>
                <div className="w-16 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto mb-4" />
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <p className="text-white/60 font-mono text-sm mb-2">Your Chips</p>
                  <p className="text-2xl font-bold text-white font-mono">{userChips.toLocaleString()}</p>
                </div>
                
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-red-400/80 font-mono text-sm mb-2">Required Minimum</p>
                  <p className="text-2xl font-bold text-red-400 font-mono">{requiredChips.toLocaleString()}</p>
                </div>
              </div>
              
              <p className="text-white/70 font-mono text-sm">
                You need at least <span className="text-white font-semibold">{requiredChips.toLocaleString()}</span> chips to join this table.
              </p>
              
              <div className="pt-4">
                <Button
                  onClick={() => {
                    setInsufficientChipsDialogOpen(false);
                    // Make player leave the table
                    disconnect();
                    router.push('/');
                  }}
                  className="w-full bg-white/10 hover:bg-white/15 border border-white/20 text-white font-mono transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                >
                  Go Back
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Show loading only if joined but state not received yet
  if (!currentState) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-mono mb-2">Loading table...</div>
          <div className="text-sm text-white/60 font-mono">Connecting to server...</div>
        </div>
      </div>
    );
  }


  return (
    <div className="h-screen text-white flex flex-col overflow-hidden relative bg-transparent">
      <div className="overflow-visible relative z-10">
        <TableTopBar roomCode={roomCode} />
      </div>
      <div className="flex-1 relative overflow-hidden z-10 bg-transparent">
        {/* Show player count and waiting message if needed */}
        {currentState.players.length < 2 && (
          <div className="absolute top-48 left-1/2 transform -translate-x-1/2 bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border border-white/20 rounded-xl px-6 py-3 z-10 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            <p className="text-white text-sm font-mono">
              Waiting for players... <span className="text-[#ffd54a]">({currentState.players.length}/2 minimum)</span>
            </p>
          </div>
        )}
        {currentPlayerId && (
          <PokerTable 
            tableState={currentState} 
            playerId={currentPlayerId} 
            onBackClick={() => setLeaveDialogOpen(true)}
          />
        )}
      </div>
      <LeaveTableDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen} userId={user?.id} originalBuyIn={originalBuyIn} />
      <RebuyDialog 
        open={rebuyDialogOpen} 
        onOpenChange={setRebuyDialogOpen}
        onRebuy={handleRebuy}
        buyInAmount={originalBuyIn || 1000}
        minBuyIn={parseInt(searchParams.get('minBuyIn') || '0')}
        maxBuyIn={parseInt(searchParams.get('maxBuyIn') || '0')}
      />
      {winnerInfo && (
        <WinnerDisplay 
          winnerName={winnerInfo.winnerName} 
          potAmount={winnerInfo.potAmount}
          isSplit={winnerInfo.isSplit}
          winnerNames={winnerInfo.winnerNames}
        />
      )}
      {countdown !== null && countdown > 0 && (
        <CountdownTimer key={countdown} count={countdown} />
      )}
    </div>
  );
}

export default function TablePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="text-white/60 font-mono">Loading...</div>
      </div>
    }>
      <TablePageContent />
    </Suspense>
  );
}

