'use client';

import { CreateTableForm } from '@/components/CreateTableForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function LobbyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen text-white flex items-center justify-center">
      <div className="container mx-auto px-4 py-16 w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="mb-8 text-white/70 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>

          <CreateTableForm />
        </motion.div>
      </div>
    </div>
  );
}

