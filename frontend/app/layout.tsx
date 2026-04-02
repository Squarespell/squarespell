import { ClerkProvider } from '@clerk/nextjs';
import { Poppins } from 'next/font/google';
import './globals.css';
const poppins = Poppins({ subsets: ['latin'], weight: ['400','500','600','700','800'], variable: '--font-poppins' });
export const metadata = { title: 'Squarespell', description: 'AI quiz funnels for Squarespace' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={poppins.variable}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
