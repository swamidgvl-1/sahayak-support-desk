export type Role = 'student' | 'faculty' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: Role;
  department_id: string | null;
  status: 'active' | 'disabled';
}
export interface Status { key: string; label: string; kind: 'open' | 'active' | 'waiting' | 'resolved' | 'closed'; sort: number; is_system: boolean }
export interface Priority { key: string; label: string; sla_hours: number; sort: number; student_selectable: boolean }
export interface Category { id: string; name: string; description: string | null; icon: string | null; department_id: string | null; default_assignee: string | null; sort: number; active: boolean }
export interface Subcategory { id: string; category_id: string; name: string; active: boolean }
export interface Department { id: string; name: string; active: boolean }

export interface TicketRow {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  sla_deadline: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  assigned_to: string | null;
  student_id: string;
  category_id: string | null;
  course: string | null;
  semester: string | null;
  academic_year: string | null;
  tags: string[];
  rating: number | null;
  category?: { name: string } | null;
  student?: { full_name: string; email: string } | null;
  assignee?: { full_name: string } | null;
}
