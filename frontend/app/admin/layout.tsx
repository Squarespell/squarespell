import { ClerkProvider } from '@clerk/nextjs';

export var metadata = {
  title: 'Squarespell Admin',
  description: 'Owner analytics dashboard',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
