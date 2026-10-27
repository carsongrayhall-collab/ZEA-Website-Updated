import { Header } from '@/components/Header';
import Dashboard from './dashboard';
export const metadata = { title: 'Pai Sho Archive | ZEA Brokers', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default function Page() {
  return <main className="mx-auto max-w-7xl px-5 pb-16 md:px-10"><Header /><Dashboard /></main>;
}
