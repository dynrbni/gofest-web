import {
  Dumbbell,
  Film,
  GalleryVerticalEnd,
  GraduationCap,
  HandHeart,
  MapPinned,
  MicVocal,
  Music2,
  Palette,
  Ticket,
  Trophy,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const styles = {
  musik: { icon: Music2, color: 'bg-blue-50 text-blue-700' },
  film: { icon: Film, color: 'bg-amber-50 text-amber-700' },
  komunitas: { icon: Users, color: 'bg-teal-50 text-teal-700' },
  workshop: { icon: GraduationCap, color: 'bg-orange-50 text-orange-700' },
  'seni-pertunjukan': { icon: Palette, color: 'bg-rose-50 text-rose-700' },
  religi: { icon: HandHeart, color: 'bg-teal-50 text-teal-700' },
  olahraga: { icon: Dumbbell, color: 'bg-blue-50 text-blue-700' },
  pameran: { icon: GalleryVerticalEnd, color: 'bg-rose-50 text-rose-700' },
  wisata: { icon: MapPinned, color: 'bg-teal-50 text-teal-700' },
  talkshow: { icon: MicVocal, color: 'bg-orange-50 text-orange-700' },
  kompetisi: { icon: Trophy, color: 'bg-amber-50 text-amber-700' },
  kuliner: { icon: UtensilsCrossed, color: 'bg-orange-50 text-orange-700' },
};

export function CategoryIcon({ slug, className }: { slug?: string; className?: string }) {
  const style = styles[slug as keyof typeof styles] ?? {
    icon: Ticket,
    color: 'bg-blue-50 text-blue-700',
  };
  return (
    <span className={cn('category-symbol shrink-0', style.color, className)}>
      <style.icon aria-hidden />
    </span>
  );
}
