import {
  Award, BookOpen, CalendarCheck, ClipboardList, Clock, CreditCard, FileText, FlaskConical,
  GraduationCap, HelpCircle, IndianRupee, Library, Monitor, UserRound, Wrench,
} from 'lucide-react';

const MAP: Record<string, any> = {
  monitor: Monitor, 'calendar-check': CalendarCheck, 'file-text': FileText, 'graduation-cap': GraduationCap,
  'clipboard-list': ClipboardList, 'book-open': BookOpen, award: Award, 'indian-rupee': IndianRupee,
  'id-card': CreditCard, clock: Clock, library: Library, wrench: Wrench, 'user-round': UserRound,
  'flask-conical': FlaskConical, 'help-circle': HelpCircle,
};

export function CategoryIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && MAP[name]) || HelpCircle;
  return <Icon className={className} aria-hidden />;
}
