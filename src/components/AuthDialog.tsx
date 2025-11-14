'use client';

import { useState, useEffect, JSX, SVGProps } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { ProfilePictureSelector } from '@/components/ProfilePictureSelector';

const Logo = (props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) => (
  <svg
    fill="currentColor"
    height="48"
    viewBox="0 0 40 48"
    width="40"
    {...props}
  >
    <clipPath id="a">
      <path d="m0 0h40v48h-40z" />
    </clipPath>
    <g clipPath="url(#a)">
      <path d="m25.0887 5.05386-3.933-1.05386-3.3145 12.3696-2.9923-11.16736-3.9331 1.05386 3.233 12.0655-8.05262-8.0526-2.87919 2.8792 8.83271 8.8328-10.99975-2.9474-1.05385625 3.933 12.01860625 3.2204c-.1376-.5935-.2104-1.2119-.2104-1.8473 0-4.4976 3.646-8.1436 8.1437-8.1436 4.4976 0 8.1436 3.646 8.1436 8.1436 0 .6313-.0719 1.2459-.2078 1.8359l10.9227 2.9267 1.0538-3.933-12.0664-3.2332 11.0005-2.9476-1.0539-3.933-12.0659 3.233 8.0526-8.0526-2.8792-2.87916-8.7102 8.71026z" />
      <path d="m27.8723 26.2214c-.3372 1.4256-1.0491 2.7063-2.0259 3.7324l7.913 7.9131 2.8792-2.8792z" />
      <path d="m25.7665 30.0366c-.9886 1.0097-2.2379 1.7632-3.6389 2.1515l2.8794 10.746 3.933-1.0539z" />
      <path d="m21.9807 32.2274c-.65.1671-1.3313.2559-2.0334.2559-.7522 0-1.4806-.102-2.1721-.2929l-2.882 10.7558 3.933 1.0538z" />
      <path d="m17.6361 32.1507c-1.3796-.4076-2.6067-1.1707-3.5751-2.1833l-7.9325 7.9325 2.87919 2.8792z" />
      <path d="m13.9956 29.8973c-.9518-1.019-1.6451-2.2826-1.9751-3.6862l-10.95836 2.9363 1.05385 3.933z" />
    </g>
  </svg>
);

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  // Dialog size reducer - adjust this value to change dialog size
  // Options: 'max-w-xs' (smallest), 'max-w-sm', 'max-w-md' (default), 'max-w-lg', 'max-w-xl', 'max-w-2xl' (largest)
  const dialogSize = 'max-w-md';
  const [isSignUp, setIsSignUp] = useState(false);

  // Reset to sign in mode when dialog opens
  useEffect(() => {
    if (open) {
      setIsSignUp(false);
      setError(null);
      setEmail('');
      setPassword('');
      setUsername('');
      setFirstName('');
      setLastName('');
      setPasswordStrength(null);
    }
  }, [open]);
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPfpSelector, setShowPfpSelector] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);

  // Check if Supabase is configured
  const isSupabaseConfigured = 
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && 
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  const getSupabaseClient = () => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Please set up your environment variables.');
    }
    return createClient();
  };

  const calculatePasswordStrength = (pwd: string): 'weak' | 'medium' | 'strong' | null => {
    if (!pwd) return null;
    
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;
    
    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'medium';
    return 'strong';
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordStrength(calculatePasswordStrength(value));
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);


    try {
      const supabase = getSupabaseClient();
      
      if (isSignUp) {
        // Sign up
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username,
              first_name: firstName,
              last_name: lastName,
            },
          },
        });

        if (signUpError) throw signUpError;

        // Profile will be created automatically by the database trigger
        // No need to manually insert - the trigger handles it

        if (data.user) {
          // Show profile picture selector
          setNewUserId(data.user.id);
          setShowPfpSelector(true);
          // Don't close the auth dialog yet, wait for pfp selection
        }
        // Reset form
        setEmail('');
        setPassword('');
        setUsername('');
        setFirstName('');
        setLastName('');
      } else {
        // Sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        onOpenChange(false);
        setEmail('');
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google') => {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (oauthError) throw oauthError;
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${dialogSize} bg-gradient-to-br from-black/80 via-[#0a0a0a]/90 to-black/80 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-lg p-0`}>
        <DialogTitle className="sr-only">
          {isSignUp ? 'Sign Up' : 'Sign In'}
        </DialogTitle>
        
        <div className="flex items-center justify-center">
          <div className={`w-full ${dialogSize}`}>
            <Card className="border-none shadow-none pb-0 bg-transparent backdrop-blur-sm">
              <CardHeader className="flex flex-col items-center space-y-3 pb-6 pt-8 px-8">
                <div className="relative">
                  <Logo className="w-14 h-14 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
                  <div className="absolute inset-0 bg-white/20 blur-xl rounded-full -z-10" />
                </div>
                <div className="space-y-1 flex flex-col items-center">
                  <h2 className="text-3xl font-bold text-white font-mono tracking-tight">
                    {isSignUp ? 'Create an account' : 'Sign in to your account'}
                  </h2>
                  <div className="w-16 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  <p className="text-white/70 font-mono text-sm mt-2">
                    {isSignUp ? 'Welcome! Create an account to get started.' : 'Welcome back! Enter your details to continue.'}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 px-8 pb-6">
                {/* Configuration Warning */}
                {!isSupabaseConfigured && (
                  <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-white/70 text-sm font-mono backdrop-blur-sm">
                    Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-mono">
                    {error}
                  </div>
                )}

                {/* Google OAuth Button */}
                {isSupabaseConfigured && (
                  <Button
                    onClick={() => handleOAuth('google')}
                    disabled={loading}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono transition-all duration-300 hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] backdrop-blur-sm focus:outline-none focus:ring-0 focus-visible:ring-0"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Continue with Google
                  </Button>
                )}

                {isSupabaseConfigured && (
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/20"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-[#1a1a1a] text-white/60 font-mono">OR</span>
                    </div>
                  </div>
                )}

                <form onSubmit={handleEmailAuth} className="space-y-6">
                  {isSignUp && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-white/80 font-mono">First name</Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required={isSignUp}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/10 focus-visible:ring-1 focus-visible:outline-none backdrop-blur-sm font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-white/80 font-mono">Last name</Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required={isSignUp}
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/10 focus-visible:ring-1 focus-visible:outline-none backdrop-blur-sm font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {isSignUp && (
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-white/80 font-mono">Username</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required={isSignUp}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20 font-mono"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white/80 font-mono">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20 font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white/80 font-mono">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/10 focus-visible:ring-1 focus-visible:outline-none backdrop-blur-sm font-mono pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 text-white/60 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    {/* Password Strength Indicator */}
                    <AnimatePresence>
                      {isSignUp && password && passwordStrength && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3 }}
                          className="space-y-2"
                        >
                          <div className="flex gap-1.5 h-1.5">
                            <motion.div
                              key={passwordStrength}
                              initial={{ width: 0 }}
                              animate={{
                                width:
                                  passwordStrength === 'weak'
                                    ? '33%'
                                    : passwordStrength === 'medium'
                                    ? '66%'
                                    : '100%',
                              }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                              className={`h-full rounded-full ${
                                passwordStrength === 'weak'
                                  ? 'bg-red-500/70'
                                  : passwordStrength === 'medium'
                                  ? 'bg-yellow-500/70'
                                  : 'bg-green-500/70'
                              }`}
                            />
                            {passwordStrength !== 'strong' && (
                              <div className="h-full flex-1 rounded-full bg-white/10" />
                            )}
                            {passwordStrength === 'weak' && (
                              <div className="h-full flex-1 rounded-full bg-white/10" />
                            )}
                          </div>
                          <motion.p
                            key={passwordStrength}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            className={`text-xs font-mono ${
                              passwordStrength === 'weak'
                                ? 'text-red-400/90'
                                : passwordStrength === 'medium'
                                ? 'text-yellow-400/90'
                                : 'text-green-400/90'
                            }`}
                          >
                            {passwordStrength === 'weak' && 'Weak password'}
                            {passwordStrength === 'medium' && 'Medium password'}
                            {passwordStrength === 'strong' && 'Strong password'}
                          </motion.p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Spacer - adjust h-8 to move button up (lower number) or down (higher number) */}
                  <div className="h-8"></div>

                  <div>
                    <InteractiveHoverButton
                      type="submit"
                      text={isSignUp ? 'Sign up' : 'Login'}
                      disabled={loading || !isSupabaseConfigured}
                      className="w-full"
                    />
                  </div>
                </form>
              </CardContent>

              <CardFooter className="flex justify-center border-t border-white/10 !py-6 px-8">
                <p className="text-center text-sm text-white/60 font-mono">
                  {isSignUp ? (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSignUp(false);
                          setError(null);
                        }}
                        className="text-white hover:text-white/80 hover:underline font-mono transition-colors duration-200"
                      >
                        Sign in
                      </button>
                    </>
                  ) : (
                    <>
                      Don&apos;t have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setIsSignUp(true);
                          setError(null);
                        }}
                        className="text-white hover:text-white/80 hover:underline font-mono transition-colors duration-200"
                      >
                        Sign up
                      </button>
                    </>
                  )}
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </DialogContent>

      {/* Profile Picture Selector */}
      {newUserId && (
        <ProfilePictureSelector
          open={showPfpSelector}
          onOpenChange={(open) => {
            setShowPfpSelector(open);
            if (!open) {
              // Close both dialogs after pfp selection
              onOpenChange(false);
              setNewUserId(null);
            }
          }}
          userId={newUserId}
          onComplete={() => {
            // Account created and pfp selected - close dialogs
            // Nav bar will automatically update via auth state listener
            setShowPfpSelector(false);
            onOpenChange(false);
            setNewUserId(null);
          }}
        />
      )}
    </Dialog>
  );
}
