'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AuthDialog } from '@/components/AuthDialog';
import { createClient } from '@/lib/supabase/client';

interface NavItem {
  label: string;
  href: string;
}

interface MonochromeNavBarProps {
  items?: NavItem[];
  className?: string;
}

const MonochromeNavBar: React.FC<MonochromeNavBarProps> = ({
  items = [
    { label: 'HOME', href: '/' },
    { label: 'GAME MODES', href: '/lobby' },
    { label: 'LEADERBOARD', href: '/leaderboard' },
    { label: 'SHOP', href: '/shop' },
  ],
  className,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('HOME');
  const [navOpacity, setNavOpacity] = useState<number>(1);
  const [isLoginHovered, setIsLoginHovered] = useState<boolean>(false);
  const [authDialogOpen, setAuthDialogOpen] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check authentication state and fetch profile
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          setUser(authUser);
          // Fetch profile picture
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('profile_pic')
            .eq('id', authUser.id)
            .single();
          
          if (profileError) {
            console.error('Error fetching profile:', profileError);
          }
          
          if (profile?.profile_pic) {
            setProfilePic(profile.profile_pic);
          } else {
            // Profile exists but no profile_pic set yet
            setProfilePic(null);
          }
        } else {
          setUser(null);
          setProfilePic(null);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Fetch profile picture
        supabase
          .from('profiles')
          .select('profile_pic')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile, error: profileError }) => {
            if (profileError) {
              console.error('Error fetching profile in auth listener:', profileError);
            }
            if (profile?.profile_pic) {
              setProfilePic(profile.profile_pic);
            } else {
              setProfilePic(null);
            }
          });
      } else {
        setUser(null);
        setProfilePic(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Determine active tab based on pathname and scroll position
  React.useEffect(() => {
    const getActiveTab = () => {
      if (pathname !== '/') {
        if (pathname === '/lobby') return 'GAME MODES';
        if (pathname === '/leaderboard') return 'LEADERBOARD';
        if (pathname === '/shop') return 'SHOP';
        return 'HOME';
      }

      // On home page, check scroll position
      const homeSection = document.getElementById('home');
      const gamemodesSection = document.getElementById('gamemodes');
      
      if (homeSection && gamemodesSection) {
        const scrollY = window.scrollY;
        const viewportHeight = window.innerHeight;
        const navOffset = 120; // Account for fixed nav bar
        const homeBottom = homeSection.offsetTop + homeSection.offsetHeight;
        const gamemodesTop = gamemodesSection.offsetTop;
        
        // If scrolled past the home section (with some threshold), show GAME MODES as active
        // This ensures the nav highlights GAME MODES when user reaches the gamemodes section
        if (scrollY + navOffset >= gamemodesTop - viewportHeight * 0.3) {
          return 'GAME MODES';
        }
        
        // If still in home section, show HOME as active
        if (scrollY < homeBottom - viewportHeight * 0.5) {
          return 'HOME';
        }
      }
      
      return 'HOME';
    };

    const updateActiveTab = () => {
      setActiveTab(getActiveTab());
    };

    // Initial check
    updateActiveTab();

    // Listen to scroll events
    window.addEventListener('scroll', updateActiveTab);
    
    return () => {
      window.removeEventListener('scroll', updateActiveTab);
    };
  }, [pathname]);

  // Handle scroll-based opacity
  React.useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      // Start fading after 50px, fully faded at 200px
      const fadeStart = 50;
      const fadeEnd = 200;
      
      if (scrollY <= fadeStart) {
        setNavOpacity(1);
      } else if (scrollY >= fadeEnd) {
        setNavOpacity(0.3); // Minimum opacity
      } else {
        // Linear interpolation between fadeStart and fadeEnd
        const fadeProgress = (scrollY - fadeStart) / (fadeEnd - fadeStart);
        setNavOpacity(1 - fadeProgress * 0.7); // Fade from 1 to 0.3
      }
    };

    // Initial check
    handleScroll();

    // Listen to scroll events
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const smoothScrollTo = (targetY: number, duration: number = 1500) => {
    const startY = window.pageYOffset;
    const distance = targetY - startY;
    let startTime: number | null = null;

    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animation = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const ease = easeInOutCubic(progress);

      window.scrollTo(0, startY + distance * ease);

      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      }
    };

    requestAnimationFrame(animation);
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, item: NavItem) => {
    if (item.label === 'HOME') {
      setActiveTab('HOME');
      if (pathname === '/') {
        e.preventDefault();
        smoothScrollTo(0, 1500);
      } else {
        e.preventDefault();
        router.push('/');
        setTimeout(() => {
          smoothScrollTo(0, 1500);
        }, 100);
      }
    } else if (item.label === 'GAME MODES') {
      setActiveTab('GAME MODES');
      e.preventDefault();
      if (pathname === '/') {
        const gamemodesSection = document.getElementById('gamemodes');
        if (gamemodesSection) {
          // Account for fixed nav bar height + extra scroll down
          const navOffset = 70;
          const extraScroll = 0; // Additional scroll down
          const targetY = gamemodesSection.offsetTop - navOffset - extraScroll;
          smoothScrollTo(targetY, 1500);
        }
      } else {
        router.push('/');
        // Wait for page to load before scrolling
        setTimeout(() => {
          const gamemodesSection = document.getElementById('gamemodes');
          if (gamemodesSection) {
            const navOffset = 120;
            const extraScroll = 80; // Additional scroll down
            const targetY = gamemodesSection.offsetTop - navOffset - extraScroll;
            smoothScrollTo(targetY, 1500);
          }
        }, 300);
      }
    } else {
      setActiveTab(item.label);
    }
    // For other items (LEADERBOARD, SHOP), let Link handle navigation normally
  };

  return (
    <nav
      className={cn(
        'fixed top-4 left-0 right-0 z-50 flex items-center justify-center',
        className
      )}
      style={{ paddingTop: '1.5rem', paddingBottom: '1.5rem' }}
    >
      <div 
        className="relative flex items-center gap-8 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl transition-opacity duration-300"
        style={{ 
          paddingLeft: '2.5rem', 
          paddingRight: '2.5rem',
          paddingTop: '1rem',
          paddingBottom: '1rem',
          minHeight: '3.5rem',
          opacity: navOpacity
        }}
      >
        {items.map((item) => {
          const isActive = activeTab === item.label;
          const isHovered = hoveredTab === item.label;

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={(e) => handleClick(e, item)}
              onMouseEnter={() => setHoveredTab(item.label)}
              onMouseLeave={() => setHoveredTab(null)}
              className={cn(
                'relative cursor-pointer text-lg font-bold px-6 py-3 rounded-full transition-all duration-300 z-10 font-mono',
                isActive
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-200'
              )}
            >
              <span className="relative z-20 font-mono">{item.label}</span>

              {isActive && (
                <motion.div
                  layoutId="activeBackground"
                  className="absolute -inset-1 bg-white/15 rounded-full -z-10"
                  initial={false}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 30,
                  }}
                />
              )}

              {isActive && (
                <motion.div
                  layoutId="activeGlow"
                  className="absolute inset-0 rounded-full -z-20"
                  initial={false}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 30,
                  }}
                >
                  <div className="absolute -inset-4 bg-white/8 rounded-full blur-2xl" />
                  <div className="absolute -inset-2 bg-white/5 rounded-full blur-xl" />
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-white/80 rounded-full">
                    <div className="absolute w-24 h-12 bg-white/25 rounded-full blur-2xl -top-4 -left-4" />
                  </div>
                </motion.div>
              )}

              {isHovered && !isActive && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="absolute -inset-1 bg-white/8 rounded-full -z-10"
                />
              )}

              {isHovered && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 rounded-full -z-20"
                >
                  <div className="absolute -inset-2 bg-gradient-radial from-white/15 to-transparent rounded-full blur-xl" />
                  <div className="absolute inset-0 bg-gradient-radial from-white/8 to-transparent rounded-full blur-md" />
                </motion.div>
              )}
            </Link>
          );
        })}
        
        {/* Separator */}
        <div className="h-8 w-px bg-white/20 mx-2" />
        
        {/* User Profile Picture or Login / Sign Up Button */}
        {!loading && user && profilePic ? (
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              setUser(null);
              setProfilePic(null);
            }}
            onMouseEnter={() => setIsLoginHovered(true)}
            onMouseLeave={() => setIsLoginHovered(false)}
            className={cn(
              'relative cursor-pointer text-2xl px-4 py-2 rounded-full transition-all duration-300 z-10 hover:bg-white/10 font-mono'
            )}
            title="Sign Out"
          >
            <span className="relative z-20">{profilePic}</span>

            {isLoginHovered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="absolute -inset-1 bg-white/8 rounded-full -z-10"
              />
            )}

            {isLoginHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 rounded-full -z-20"
              >
                <div className="absolute -inset-2 bg-gradient-radial from-white/15 to-transparent rounded-full blur-xl" />
                <div className="absolute inset-0 bg-gradient-radial from-white/8 to-transparent rounded-full blur-md" />
              </motion.div>
            )}
          </button>
        ) : (
          <button
            onClick={() => setAuthDialogOpen(true)}
            onMouseEnter={() => setIsLoginHovered(true)}
            onMouseLeave={() => setIsLoginHovered(false)}
            className={cn(
              'relative cursor-pointer text-lg font-bold px-8 py-4 rounded-full transition-all duration-300 z-10 text-gray-400 hover:text-gray-200 font-mono'
            )}
          >
            <span className="relative z-20 font-mono">Login / Sign Up</span>

            {isLoginHovered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="absolute -inset-1 bg-white/8 rounded-full -z-10"
              />
            )}

            {isLoginHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 rounded-full -z-20"
              >
                <div className="absolute -inset-2 bg-gradient-radial from-white/15 to-transparent rounded-full blur-xl" />
                <div className="absolute inset-0 bg-gradient-radial from-white/8 to-transparent rounded-full blur-md" />
              </motion.div>
            )}
          </button>
        )}
      </div>
      
      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </nav>
  );
};

export default function NavHeader() {
  const pathname = usePathname();
  
  // Only show nav bar on home, leaderboard, and shop pages
  const allowedPaths = ['/', '/leaderboard', '/shop'];
  if (!allowedPaths.includes(pathname)) {
    return null;
  }
  
  return (
    <>
      <MonochromeNavBar />
    </>
  );
}
