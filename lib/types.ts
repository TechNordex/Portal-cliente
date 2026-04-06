export type UserRole = 'client' | 'admin'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: UserRole
}

export interface PortalUser {
  id: string
  email: string
  name: string
  role: UserRole
  position?: string
  avatar_url?: string
  bio?: string
  tour_completed_at?: string | null
  created_at: string
}

export interface ProjectAssignment {
  id: string
  project_id: string
  user_id: string
  assigned_at: string
}

export interface Project {
  id: string
  client_id: string
  client_name?: string
  client_email?: string
  name: string
  description: string | null
  preview_url: string | null
  preview_status: 'none' | 'pending' | 'approved' | 'rejected'
  preview_feedback: string | null
  current_stage: number
  created_at: string
  updated_at: string
  estimated_hours?: number
  stage_url?: string | null
  prod_url?: string | null
  updates?: ProjectUpdate[]
  squad?: { id: string, name: string, avatar_url: string, position: string, bio?: string }[]
}

export interface ProjectUpdate {
  id: string
  project_id: string
  stage: number
  title: string
  message: string | null
  client_note?: string | null
  status: 'pending' | 'authorized' | 'denied'
  feedback?: string | null
  viewed_at?: string | null
  preview_url?: string | null
  hours_spent?: number
  revision_of?: string | null  // UUID of the update this corrects
  created_at: string
}

export const STAGES = [
  { id: 1, label: 'Briefing',        icon: 'ClipboardList', desc: 'Requisitos levantados'       },
  { id: 2, label: 'Design',          icon: 'Palette',       desc: 'Protótipos e wireframes'     },
  { id: 3, label: 'Desenvolvimento', icon: 'Code2',         desc: 'Codificação em andamento'    },
  { id: 4, label: 'Testes',          icon: 'FlaskConical',  desc: 'QA e correções'              },
  { id: 5, label: 'Revisão',         icon: 'Eye',           desc: 'Aguardando aprovação'        },
  { id: 6, label: 'Entregue',        icon: 'Rocket',        desc: 'Projeto finalizado'          },
] as const
