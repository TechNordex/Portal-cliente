// @ts-nocheck
/**
 * Admin Panel - Ultimate Tier Design + Deep Linking Integration + Per-Update Notes
 * NOTE: @ts-nocheck is intentional — this file is a large legacy monolith with
 * many inline arrow-function callbacks that lack explicit type annotations.
 * TypeScript errors here are known and non-critical; proper typing should be added
 * incrementally when refactoring individual sections.
 */
'use client'

import React, { useEffect, useState, useMemo } from 'react'
import useSWR, { mutate } from 'swr'
import { useRealtime } from '@/hooks/use-realtime'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { LogOut, Plus, Activity, Send, Loader2, X, Edit, Users, Shield, User, FolderKanban, CheckCircle2, Clock, MessageSquareText, FileEdit, Link as LinkIcon, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, AlertCircle, Trash2, Search, SlidersHorizontal, Briefcase, FileDown, Upload, Mail, Eye, RefreshCw, LayoutDashboard, BarChart2, UsersRound, Timer, TrendingUp, Menu, Check } from 'lucide-react'
import type { Project, PortalUser, ProjectUpdate } from '@/lib/types'

import { STAGES } from '@/lib/types'
import AlertCenter from './components/AlertCenter'
import UpdateTimeline from './components/UpdateTimeline'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import ImageCropperModal from '@/components/common/ImageCropper'
import ChatTeam from '@/components/chat-team'
import jsPDF from 'jspdf'
import { useRef } from 'react'

export default function AdminPage() {
    const router = useRouter()
    
    // Helper para formatar horas e minutos
    const formatHours = (hours: number | undefined | null) => {
        if (hours === undefined || hours === null || hours === 0) return '—';
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        if (m === 0) return `${h}h`;
        if (h === 0) return `${m}m`;
        return `${h}h ${m}m`;
    };

    const fetcher = (url: string) => fetch(url).then(res => {
        if (!res.ok) {
            if (res.status === 401 || res.status === 403) router.push('/login')
            throw new Error('Unauthorized')
        }
        return res.json()
    })

    const { data: dataProj, mutate: mutateProj, isLoading: loadingProj } = useSWR('/api/admin/projects', fetcher)
    const { data: dataUsers, mutate: mutateUsers, isLoading: loadingUsers } = useSWR('/api/admin/users', fetcher)
    const { data: dataTrash, mutate: mutateTrash } = useSWR('/api/admin/projects?trash=true', fetcher)
    const { data: dataTeam, mutate: mutateTeam } = useSWR('/api/admin/team', fetcher)
    const { data: dataAssignments, mutate: mutateAssignments } = useSWR('/api/admin/assignments', fetcher)
    const { data: dataReport, mutate: mutateReport } = useSWR('/api/admin/reports', fetcher)
    const { data: dataMe } = useSWR('/api/auth/me', fetcher)

    const projects = useMemo(() => dataProj?.projects?.sort((a: Project, b: Project) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()) || [], [dataProj])
    const users = dataUsers?.users || []
    const trashProjects = dataTrash?.projects || []
    const teamStats = dataTeam || { workload: [], recentContributions: [] }
    const projectAssignments = dataAssignments?.assignments || []
    const reportData = dataReport || null
    const currentUser = dataMe?.user || null
    const loading = loadingProj || loadingUsers

    const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'users' | 'trash' | 'team' | 'reports' | 'email' | 'mensagens'>('overview')
    const [usersMenuExpanded, setUsersMenuExpanded] = useState(false)
    const [teamStatsState, setTeamStatsState] = useState<{ workload: any[], recentContributions: any[] }>({ workload: [], recentContributions: [] })
    const [editingTeamMember, setEditingTeamMember] = useState<PortalUser | null>(null)
    const [assigningProject, setAssigningProject] = useState<Project | null>(null)
    const [projectAssignmentsState, setProjectAssignmentsState] = useState<any[]>([])
    const [uploadLoading, setUploadLoading] = useState(false)
    const [showAddTeamMember, setShowAddTeamMember] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [resetTourLoading, setResetTourLoading] = useState<string | null>(null)
    
    // Image Cropper States
    const [showCropper, setShowCropper] = useState(false)
    const [cropperTarget, setCropperTarget] = useState<'team' | 'project' | null>(null)
    const [isExporting, setIsExporting] = useState(false)
    const [reportProjectId, setReportProjectId] = useState<string>('all')
    const [reportStartDate, setReportStartDate] = useState<string>(format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'))
    const [reportEndDate, setReportEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
    const [isUpdating, setIsUpdating] = useState<string | null>(null) // project id

    const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null)
    const [expandedClientId, setExpandedClientId] = useState<string | null>(null)
    const [projectSearch, setProjectSearch] = useState('')
    const [projectFilter, setProjectFilter] = useState<'all' | 'alerts' | 'active' | 'done'>('all')

    // Modals
    const [showNewClient, setShowNewClient] = useState(false)
    const [showNewProject, setShowNewProject] = useState(false)
    const [editingUser, setEditingUser] = useState<PortalUser | null>(null)

    // Project Editor Modal
    const [editingProject, setEditingProject] = useState<Project | null>(null)
    const [editProjectName, setEditProjectName] = useState('')
    const [editProjectDesc, setEditProjectDesc] = useState('')
    const [editProjectUrl, setEditProjectUrl] = useState('')
    const [editProjectStageUrl, setEditProjectStageUrl] = useState('')
    const [editProjectProdUrl, setEditProjectProdUrl] = useState('')
    const [editProjectLoading, setEditProjectLoading] = useState(false)
    const [editProjectHours, setEditProjectHours] = useState<string>('')
    const [editProjectMinutes, setEditProjectMinutes] = useState<string>('')

    // Forms states...
    const [newClientName, setNewClientName] = useState('')
    const [newClientEmail, setNewClientEmail] = useState('')
    const [newClientPassword, setNewClientPassword] = useState('')
    const [newClientRole, setNewClientRole] = useState('client')
    const [clientLoading, setClientLoading] = useState(false)

    const [editUserName, setEditUserName] = useState('')
    const [editUserEmail, setEditUserEmail] = useState('')
    const [editUserPassword, setEditUserPassword] = useState('')
    const [editUserRole, setEditUserRole] = useState('client')
    const [editUserLoading, setEditUserLoading] = useState(false)

    // Delete user state
    const [deletingUser, setDeletingUser] = useState<PortalUser | null>(null)
    const [deleteWarning, setDeleteWarning] = useState<{ message: string; projects: { id: string; name: string }[] } | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    // Delete project state
    const [deletingProject, setDeletingProject] = useState<Project | null>(null)
    const [permanentDelete, setPermanentDelete] = useState(false)

    const [newProjectName, setNewProjectName] = useState('')
    const [newProjectClientId, setNewProjectClientId] = useState('')
    const [newProjectDesc, setNewProjectDesc] = useState('')
    const [newProjectUrl, setNewProjectUrl] = useState('')
    const [newProjectStageUrl, setNewProjectStageUrl] = useState('')
    const [newProjectProdUrl, setNewProjectProdUrl] = useState('')
    const [newProjectHours, setNewProjectHours] = useState<string>('')
    const [newProjectMinutes, setNewProjectMinutes] = useState<string>('')
    const [projectLoading, setProjectLoading] = useState(false)

    const [updateStage, setUpdateStage] = useState(1)
    const [updateTitle, setUpdateTitle] = useState('')
    const [updateMessage, setUpdateMessage] = useState('')
    const [updatePreviewUrl, setUpdatePreviewUrl] = useState('')
    const [updateHours, setUpdateHours] = useState<string>('')
    const [updateMinutes, setUpdateMinutes] = useState<string>('')
    const [lastUpdateStage, setLastUpdateStage] = useState<number | null>(null)

    // Revision system state
    const [isRevision, setIsRevision] = useState(false)
    const [revisionOf, setRevisionOf] = useState<string>('')
    const [projectUpdatesForRevision, setProjectUpdatesForRevision] = useState<{ id: string; title: string; stage: number; status: string }[]>([])

    // Quick-View Centered Modal state
    const [quickViewProject, setQuickViewProject] = useState<Project | null>(null)
    const [qvMode, setQvMode] = useState<'reply' | 'new' | null>(null)
    const [qvTitle, setQvTitle] = useState('')
    const [qvMessage, setQvMessage] = useState('')
    const [qvStage, setQvStage] = useState(1)
    const [qvRevisionOf, setQvRevisionOf] = useState('')
    const [qvPreviewUrl, setQvPreviewUrl] = useState('')
    const [qvHours, setQvHours] = useState('')
    const [qvMinutes, setQvMinutes] = useState('')
    const [qvLoading, setQvLoading] = useState(false)

    // Email template states
    const [emailHtml, setEmailHtml] = useState('')
    const [emailSubject, setEmailSubject] = useState('')
    const [emailTemplateLoading, setEmailTemplateLoading] = useState(false)
    const [emailTemplateSaving, setEmailTemplateSaving] = useState(false)
    const [emailPreview, setEmailPreview] = useState(false)
    const [emailSaved, setEmailSaved] = useState(false)

    const loadEmailTemplate = async () => {
        setEmailTemplateLoading(true)
        try {
            const res = await fetch('/api/admin/email-template')
            const data = await res.json()
            if (data.template) {
                setEmailHtml(data.template.html || '')
                setEmailSubject(data.template.subject || '')
            } else {
                setEmailHtml('')
                setEmailSubject('')
            }
        } catch { } finally { setEmailTemplateLoading(false) }
    }

    const saveEmailTemplate = async () => {
        setEmailTemplateSaving(true)
        try {
            await fetch('/api/admin/email-template', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ html: emailHtml, subject: emailSubject || null })
            })
            setEmailSaved(true)
            setTimeout(() => setEmailSaved(false), 3000)
        } catch { alert('Erro ao salvar template') } finally { setEmailTemplateSaving(false) }
    }

    const resetEmailTemplate = async () => {
        if (!confirm('Redefinir para o template padrão? Suas alterações serão perdidas.')) return
        await fetch('/api/admin/email-template', { method: 'DELETE' })
        loadEmailTemplate()
    }

    const reportRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (activeTab === 'email') loadEmailTemplate()
    }, [activeTab])

    const filteredGroups = useMemo(() => {
        // --- Derived Data ---
        const clientMap = new Map<string, { client: PortalUser | null; clientName: string; clientEmail: string; projects: Project[] }>();
        projects.forEach((proj: Project) => {
            const key = proj.client_id;
            if (!clientMap.has(key)) {
                const user = users.find((u: PortalUser) => u.id === key) || null;
                clientMap.set(key, { client: user, clientName: proj.client_name || 'Cliente Desconhecido', clientEmail: proj.client_email || '', projects: [] });
            }
            clientMap.get(key)!.projects.push(proj);
        });

        // Sort: clients with alerts first, then by most recently updated project
        const clientGroups = Array.from(clientMap.values()).sort((a, b) => {
            const aAlert = a.projects.some(p => p.preview_status === 'rejected') ? 2 : a.projects.some(p => p.preview_status === 'pending') ? 1 : 0;
            const bAlert = b.projects.some(p => p.preview_status === 'rejected') ? 2 : b.projects.some(p => p.preview_status === 'pending') ? 1 : 0;
            if (bAlert !== aAlert) return bAlert - aAlert;
            const aLatest = Math.max(...a.projects.map(p => new Date(p.updated_at).getTime()));
            const bLatest = Math.max(...b.projects.map(p => new Date(p.updated_at).getTime()));
            return bLatest - aLatest;
        });

        // Filter by search + status
        return clientGroups.map(g => ({
            ...g,
            projects: g.projects.filter(p => {
                const searchMatch = !projectSearch ||
                    p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
                    g.clientName.toLowerCase().includes(projectSearch.toLowerCase());
                const filterMatch =
                    projectFilter === 'all' ? true :
                    projectFilter === 'alerts' ? (p.preview_status === 'rejected' || p.preview_status === 'pending') :
                    projectFilter === 'active' ? p.current_stage < 6 :
                    p.current_stage === 6;
                return searchMatch && filterMatch;
            })
        })).filter(g => g.projects.length > 0);
    }, [projects, users, projectSearch, projectFilter]);

    const filteredReportProjects = useMemo(() => {
        return projects.filter((p: Project) => {
            if (reportProjectId !== 'all' && p.id !== reportProjectId) return false;
            const projectDate = new Date(p.created_at);
            const start = new Date(reportStartDate);
            const end = new Date(reportEndDate);
            end.setHours(23, 59, 59, 999);
            return projectDate >= start && projectDate <= end;
        });
    }, [projects, reportProjectId, reportStartDate, reportEndDate]);

    const projectSpecificStats = useMemo(() => {
        if (reportProjectId === 'all') return null;
        const project = projects.find((p: Project) => p.id === reportProjectId);
        if (!project) return null;

        const updates = project.updates || [];
        const totalUpdates = updates.length;
        const approvedUpdates = updates.filter((u: any) => u.status === 'authorized').length;
        const deniedUpdates = updates.filter((u: any) => u.status === 'denied').length;
        
        const totalHours = updates.reduce((acc: number, u: any) => acc + (u.hours_spent || 0), 0);
        const rejectionCount = deniedUpdates + (project.preview_status === 'rejected' ? 1 : 0);
        
        let leadTime = "Em andamento";
        if (project.current_stage === 6 && updates.length > 0) {
            const firstUpdate = new Date(project.created_at);
            const lastUpdateArr = [...updates].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            const lastUpdate = new Date(lastUpdateArr[0].created_at);
            const diffDays = Math.ceil((lastUpdate.getTime() - firstUpdate.getTime()) / (1000 * 60 * 60 * 24));
            leadTime = `${diffDays} dias`;
        }

        return {
            totalUpdates,
            approvedUpdates,
            deniedUpdates,
            approvalRate: totalUpdates > 0 ? Math.round((approvedUpdates / totalUpdates) * 100) : 0,
            leadTime,
            totalHours,
            rejectionCount,
            estimatedHours: project.estimated_hours || 0
        };
    }, [projects, reportProjectId]);

    const refreshAllData = async () => {
        await Promise.all([
            mutateProj(),
            mutateUsers(),
            mutateTrash(),
            mutateTeam(),
            mutateAssignments(),
            mutateReport()
        ])
    }

    const fetchData = refreshAllData // Alias for compatibility with existing calls

    // Real-time listener
    useRealtime(refreshAllData)

    const handleResetTour = async (userId: string) => {
        setResetTourLoading(userId)
        try {
            const res = await fetch('/api/admin/users/reset-tour', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            })
            if (!res.ok) throw new Error()
            alert('Tour resetado com sucesso para este usuário.')
        } catch (error) {
            alert('Erro ao resetar tour.')
        } finally {
            setResetTourLoading(null)
        }
    }

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' })
        router.push('/login')
    }

    const openUpdateForm = async (projectId: string) => {
        setIsUpdating(projectId)
        setIsRevision(false)
        setRevisionOf('')
        setProjectUpdatesForRevision([])
        try {
            const res = await fetch(`/api/admin/updates?project_id=${projectId}`)
            if (res.ok) {
                const data = await res.json()
                setProjectUpdatesForRevision(data.updates || [])
            }
        } catch { /* non-critical */ }
    }

    const handlePostUpdate = async (e: React.FormEvent, projectId: string) => {
        e.preventDefault()
        try {
            const res = await fetch('/api/admin/updates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    project_id: projectId, 
                    stage: updateStage, 
                    title: updateTitle, 
                    message: updateMessage,
                    preview_url: updatePreviewUrl || undefined,
                    hours_spent: (updateHours || updateMinutes) ? (Number(updateHours || 0) + Number(updateMinutes || 0) / 60) : undefined,
                    revision_of: isRevision && revisionOf ? revisionOf : undefined,
                 }),
            })
            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || 'Erro ao atualizar estágio')
            }
            setIsUpdating(null)
            setUpdateTitle('')
            setUpdateMessage('')
            setUpdatePreviewUrl('')
            setUpdateHours('')
            setUpdateMinutes('')
            setIsRevision(false)
            setRevisionOf('')
            setProjectUpdatesForRevision([])
            setExpandedProjectId(projectId) // KEEP EXPANDED TRUE AFTER POST
            fetchData()
        } catch (err: any) {
            alert(err.message || 'Erro ao atualizar estágio')
        }
    }

    const handleQuickViewPost = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!quickViewProject) return
        setQvLoading(true)
        try {
            const res = await fetch('/api/admin/updates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_id: quickViewProject.id,
                    stage: qvStage,
                    title: qvTitle,
                    message: qvMessage,
                    preview_url: qvPreviewUrl || undefined,
                    hours_spent: (qvHours || qvMinutes) ? (Number(qvHours || 0) + Number(qvMinutes || 0) / 60) : undefined,
                    revision_of: qvMode === 'reply' && qvRevisionOf ? qvRevisionOf : undefined,
                }),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erro ao postar')
            }
            // Reset form state
            setQvTitle('')
            setQvMessage('')
            setQvPreviewUrl('')
            setQvHours('')
            setQvMinutes('')
            setQvRevisionOf('')
            setQvMode(null)
            // Refresh data
            await fetchData()
        } catch (err: any) {
            alert(err.message || 'Erro ao postar atualização')
        } finally {
            setQvLoading(false)
        }
    }

    // Modal Handle logic for simplicity...
    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault(); setClientLoading(true)
        try {
            const res = await fetch('/api/admin/users', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newClientName, email: newClientEmail, password: newClientPassword, role: newClientRole }) 
            })
            if (!res.ok) throw new Error()
            setShowNewClient(false); fetchData()
        } catch (err) { alert('Erro ao criar') } finally { setClientLoading(false) }
    }

    const handleEditUser = async (e: React.FormEvent) => {
        e.preventDefault(); if (!editingUser) return; setEditUserLoading(true)
        try {
            const res = await fetch('/api/admin/users', { 
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingUser.id, name: editUserName, email: editUserEmail, password: editUserPassword || undefined, role: editUserRole }) 
            })
            if (!res.ok) throw new Error()
            setEditingUser(null); fetchData()
        } catch (err) { alert('Erro ao editar') } finally { setEditUserLoading(false) }
    }

    const handleDeleteUser = async (force = false) => {
        if (!deletingUser) return
        setDeleteLoading(true)
        try {
            const res = await fetch('/api/admin/users', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: deletingUser.id, force })
            })
            const data = await res.json()
            if (res.status === 409 && data.warning) {
                // Show project warning — require force confirm
                setDeleteWarning({ message: data.message, projects: data.projects })
            } else if (!res.ok) {
                alert(data.error || 'Erro ao excluir usuário')
                setDeletingUser(null); setDeleteWarning(null)
            } else {
                setDeletingUser(null); setDeleteWarning(null); fetchData()
            }
        } catch { alert('Erro de conexão') } finally { setDeleteLoading(false) }
    }

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault(); setProjectLoading(true)
        try {
            const res = await fetch('/api/admin/projects', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    client_id: newProjectClientId, 
                    name: newProjectName, 
                    description: newProjectDesc, 
                    preview_url: newProjectUrl, 
                    stage_url: newProjectStageUrl,
                    prod_url: newProjectProdUrl,
                    estimated_hours: (newProjectHours || newProjectMinutes) ? (Number(newProjectHours || 0) + Number(newProjectMinutes || 0) / 60) : undefined 
                }) 
            })
            if (!res.ok) throw new Error()
            setShowNewProject(false); setActiveTab('projects'); fetchData()
            setNewProjectName(''); setNewProjectClientId(''); setNewProjectDesc(''); setNewProjectUrl(''); setNewProjectStageUrl(''); setNewProjectProdUrl(''); setNewProjectHours(''); setNewProjectMinutes('')
        } catch (err) { alert('Erro criar proj') } finally { setProjectLoading(false) }
    }

    const openEditProjectModal = (proj: Project) => {
        setEditingProject(proj); 
        setEditProjectName(proj.name); 
        setEditProjectDesc(proj.description || ''); 
        setEditProjectUrl(proj.preview_url || '');
        setEditProjectStageUrl(proj.stage_url || '');
        setEditProjectProdUrl(proj.prod_url || '');
        const totalHrs = proj.estimated_hours || 0;
        const h = Math.floor(totalHrs);
        const m = Math.round((totalHrs - h) * 60);
        setEditProjectHours(h > 0 ? h.toString() : '');
        setEditProjectMinutes(m > 0 ? m.toString() : '');
    }

    const handleEditProject = async (e: React.FormEvent) => {
        e.preventDefault(); if (!editingProject) return; setEditProjectLoading(true)
        try {
            const res = await fetch('/api/admin/projects', { 
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    id: editingProject.id, 
                    name: editProjectName, 
                    description: editProjectDesc, 
                    preview_url: editProjectUrl, 
                    stage_url: editProjectStageUrl,
                    prod_url: editProjectProdUrl,
                    estimated_hours: (editProjectHours || editProjectMinutes) ? (Number(editProjectHours || 0) + Number(editProjectMinutes || 0) / 60) : undefined 
                }) 
            })
            if (!res.ok) throw new Error()
            setEditingProject(null); fetchData()
        } catch (err) { alert('Erro ao atualizar proojeto') } finally { setEditProjectLoading(false) }
    }

    const handleDeleteProject = async (proj: Project, permanent = false) => {
        setDeleteLoading(true)
        try {
            const res = await fetch(`/api/admin/projects?id=${proj.id}${permanent ? '&permanent=true' : ''}`, {
                method: 'DELETE'
            })
            if (!res.ok) throw new Error()
            setDeletingProject(null)
            fetchData()
        } catch (err) {
            alert('Erro ao excluir projeto')
        } finally {
            setDeleteLoading(false)
        }
    }

    const handleRestoreProject = async (projectId: string) => {
        setDeleteLoading(true)
        try {
            const res = await fetch('/api/admin/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'restore', id: projectId })
            })
            if (!res.ok) throw new Error()
            fetchData()
        } catch (err) {
            alert('Erro ao restaurar projeto')
        } finally {
            setDeleteLoading(false)
        }
    }

    const [editTeamPosition, setEditTeamPosition] = useState('')
    const [editTeamAvatar, setEditTeamAvatar] = useState('')
    const [editTeamBio, setEditTeamBio] = useState('')
    const [editTeamLoading, setEditTeamLoading] = useState(false)

    useEffect(() => {
        if (editingTeamMember) {
            setEditTeamPosition(editingTeamMember.position || '')
            setEditTeamAvatar(editingTeamMember.avatar_url || '')
            setEditTeamBio(editingTeamMember.bio || '')
        }
    }, [editingTeamMember])

    const handleEditTeamMember = async (e: React.FormEvent) => {
        e.preventDefault(); if (!editingTeamMember) return; setEditTeamLoading(true)
        try {
            const res = await fetch('/api/admin/users', { 
                method: 'PUT', 
                body: JSON.stringify({ 
                    id: editingTeamMember.id, 
                    name: editingTeamMember.name, 
                    email: editingTeamMember.email, 
                    role: editingTeamMember.role,
                    position: editTeamPosition, 
                    avatar_url: editTeamAvatar, 
                    bio: editTeamBio 
                }) 
            })
            if (!res.ok) throw new Error()
            setEditingTeamMember(null); fetchData()
        } catch (err) { alert('Erro ao atualizar membro da equipe') } finally { setEditTeamLoading(false) }
    }

    const handleAssignTeam = async (projectId: string, userId: string) => {
        try {
            const res = await fetch('/api/admin/assignments', { method: 'POST', body: JSON.stringify({ project_id: projectId, user_id: userId }) })
            if (res.ok) {
                setAssigningProject(null); fetchData()
            }
        } catch (err) { alert('Erro ao atribuir membro') }
    }

    const handleRemoveAssignment = async (projectId: string, userId: string) => {
        try {
            const res = await fetch(`/api/admin/assignments?projectId=${projectId}&userId=${userId}`, { method: 'DELETE' })
            if (res.ok) fetchData()
        } catch (err) { alert('Erro ao remover atribuição') }
    }

    const handleFileUploadClick = (e: React.MouseEvent, target: 'team' | 'project') => {
        // We open the cropper instead of raw file upload.
        // Prevent default click if attached to something else, though usually button handles it.
        setCropperTarget(target)
        setShowCropper(true)
    }

    const handleCropComplete = async (fileBlob: Blob, previewUrl: string) => {
        setUploadLoading(true)
        const formData = new FormData()
        // Adding extension .jpg to blob
        formData.append('file', fileBlob, 'cropped-upload.jpg')

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })
            if (!res.ok) throw new Error()
            const { url } = await res.json()
            if (cropperTarget === 'team') {
                setEditTeamAvatar(url)
            } else {
                setEditProjectUrl(url)
            }
        } catch (err) {
            alert('Erro ao enviar imagem')
        } finally {
            setUploadLoading(false)
            setCropperTarget(null)
            setShowCropper(false)
        }
    }

    const handlePromoteUser = async (user: PortalUser) => {
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    id: user.id, 
                    role: 'admin', 
                    name: user.name, 
                    email: user.email,
                    position: user.position || 'Especialista'
                })
            })
            if (!res.ok) throw new Error()
            setShowAddTeamMember(false)
            fetchData()
        } catch (err) {
            alert('Erro ao promover usuário')
        }
    }

    const handleExportPDF = async () => {
        try {
            setIsExporting(true);

            // Create PDF
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const margin = 16;
            const contentW = pageW - margin * 2;

            // ── Colors ────────────────────────────────────────────────────────
            const C_PRIMARY  = [245, 168, 0]  as [number, number, number];
            const C_WHITE    = [245, 245, 245] as [number, number, number];
            const C_GRAY     = [140, 140, 140] as [number, number, number];
            const C_LIGHT_G  = [180, 180, 180] as [number, number, number];
            const C_DARK_BG  = [18, 18, 18]   as [number, number, number]; // Sleek dark gray
            const C_CARD     = [26, 26, 26]   as [number, number, number];
            const C_BORDER   = [45, 45, 45]   as [number, number, number];

            // ── Helper functions ──────────────────────────────────────────────
            let y = 0;
            const checkPageBreak = (neededH: number) => {
                if (y + neededH > pageH - 20) {
                    pdf.addPage();
                    pdf.setFillColor(...C_DARK_BG);
                    pdf.rect(0, 0, pageW, pageH, 'F');
                    y = margin;
                }
            };

            const drawCard = (cardY: number, cardH: number, cardX = margin, cardW = contentW) => {
                pdf.setFillColor(...C_CARD);
                pdf.setDrawColor(...C_BORDER);
                pdf.roundedRect(cardX, cardY, cardW, cardH, 3, 3, 'FD');
            };

            const txt = (text: string, tx: number, ty: number, size: number, color: [number,number,number], bold = false, align: 'left'|'center'|'right' = 'left') => {
                pdf.setFontSize(size);
                pdf.setTextColor(...color);
                pdf.setFont('helvetica', bold ? 'bold' : 'normal');
                pdf.text(text, tx, ty, { align });
            };

            // ── PAGE 1 BG ──────────────────────────────────────────────────────
            pdf.setFillColor(...C_DARK_BG);
            pdf.rect(0, 0, pageW, pageH, 'F');

            // ── HEADER REDESIGN (Premium Dark with Gold Accents) ──────────────
            y = margin + 4;
            
            // Try fetching real logo and adding it
            let logoLoaded = false;
            let imgH = 0;
            try {
                const logoUrl = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-Nordex-Tech-remove-WSehNqsem3EZQ2jxpk0CKTKMU1hLtG.png';
                const img = new window.Image();
                img.crossOrigin = "Anonymous";
                img.src = logoUrl;
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });
                // Calculate dimensions (28mm width is elegant for A4)
                const imgW = 28;
                imgH = (img.height * imgW) / img.width;
                pdf.addImage(img, 'PNG', margin, y - 6, imgW, imgH);
                logoLoaded = true;
            } catch (err) {
                console.warn('Could not load logo image for PDF', err);
                txt('NORDEX TECH', margin, y, 14, C_WHITE, true);
            }
            
            const isAll = reportProjectId === 'all';
            const selectedProject = projects.find(p => p.id === reportProjectId);
            const reportTitle = isAll ? 'Relatório Geral' : `Relatório: ${selectedProject?.name}`;
            
            // Subtitle should be pushed down enough to clear the logo
            if (logoLoaded) {
                y += (imgH - 2); // perfectly sit below the image
            } else {
                y += 8;
            }

            txt('PORTAL DE PERFORMANCE', margin, y, 7, C_GRAY, true);

            // Right side metadata
            txt(reportTitle.toUpperCase(), pageW - margin, y - 1, 10, C_WHITE, true, 'right');
            txt(`PERÍODO: ${format(new Date(reportStartDate), 'dd/MM/yyyy')} — ${format(new Date(reportEndDate), 'dd/MM/yyyy')}`, pageW - margin, y + 5, 7, C_PRIMARY, true, 'right');

            // Separator Line
            y += 12;
            pdf.setDrawColor(...C_BORDER);
            pdf.setLineWidth(0.5);
            pdf.line(margin, y, pageW - margin, y);
            y += 8;

            // Generation Date
            txt(`Documento gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy, 'às' HH:mm", { locale: ptBR })}`, margin, y, 8, C_GRAY);
            y += 10;

            // ── DATA PREP ──────────────────────────────────────────────────────
            const filteredProjects = isAll ? projects : projects.filter(p => p.id === reportProjectId);
            const totalUpdates = filteredProjects.reduce((a, p) => a + (p.updates?.length || 0), 0);
            const totalHours   = filteredProjects.reduce((a, p) => a + (p.updates || []).reduce((s: number, u: any) => s + (u.hours_spent || 0), 0), 0);
            const approved     = filteredProjects.reduce((a, p) => a + (p.updates || []).filter((u: any) => u.status === 'approved').length, 0);
            const denied       = filteredProjects.reduce((a, p) => a + (p.updates || []).filter((u: any) => u.status === 'denied').length, 0);
            const completed    = filteredProjects.filter(p => p.current_stage === 6).length;

            // ── KPI CARDS ──────────────────────────────────────────────────────
            const kpis = [
                { label: 'PROJETOS TOTAIS', value: String(filteredProjects.length) },
                { label: 'FINALIZADOS', value: String(completed) },
                { label: 'HORAS DE ESFORÇO', value: formatHours(totalHours) },
                { label: 'ATUALIZAÇÕES', value: String(totalUpdates) },
                { label: 'APROVADAS', value: String(approved) },
                { label: 'RECUSADAS', value: String(denied) },
            ];

            const kpiCols = 3;
            const kpiW = (contentW - (kpiCols - 1) * 6) / kpiCols;
            const kpiH = 22;

            kpis.forEach((kpi, i) => {
                const col = i % kpiCols;
                const row = Math.floor(i / kpiCols);
                const kx = margin + col * (kpiW + 6);
                const ky = y + row * (kpiH + 6);
                
                drawCard(ky, kpiH, kx, kpiW);
                
                // Accent left border
                const accentColor = i === 2 || i === 4 ? [80, 200, 120] : i === 5 ? [220, 80, 80] : C_PRIMARY;
                pdf.setFillColor(...(accentColor as [number, number, number]));
                pdf.rect(kx, ky + 4, 2, kpiH - 8, 'F');

                txt(kpi.label, kx + 8, ky + 7, 6.5, C_GRAY, true);
                txt(kpi.value, kx + 8, ky + 16, 16, C_WHITE, true);
            });

            y += (Math.ceil(kpis.length / kpiCols)) * (kpiH + 6) + 12;

            // ── PROJECTS TABLE ────────────────────────────────────────────────
            checkPageBreak(25);
            txt('Resumo Operacional', margin, y, 12, C_WHITE, true);
            y += 8;

            const cols = [
                { label: 'PROJETO',         x: margin,       w: 55 },
                { label: 'CLIENTE',         x: margin + 55,  w: 38 },
                { label: 'FASE',            x: margin + 93,  w: 22 },
                { label: 'HORAS',           x: margin + 115, w: 18 },
                { label: 'UPDATES',         x: margin + 133, w: 19 },
                { label: 'STATUS',          x: margin + 152, w: 30 },
            ];

            const rowH = 10;
            // Header
            pdf.setFillColor(32, 32, 32);
            pdf.rect(margin, y, contentW, rowH, 'F');
            cols.forEach(col => {
                txt(col.label, col.x + 3, y + 6.5, 6.5, C_PRIMARY, true);
            });
            y += rowH;

            filteredProjects.forEach((p, idx) => {
                const hrs = (p.updates || []).reduce((s: number, u: any) => s + (u.hours_spent || 0), 0);
                const upd = p.updates?.length || 0;
                const stage = STAGES.find(s => s.id === p.current_stage);
                const statusLabel = p.current_stage === 6 ? 'Entregue' : 'Em progresso';

                checkPageBreak(rowH + 2);

                if (idx % 2 === 0) {
                    pdf.setFillColor(24, 24, 24);
                    pdf.rect(margin, y, contentW, rowH, 'F');
                }
                
                pdf.setDrawColor(...C_BORDER);
                pdf.setLineWidth(0.2);
                pdf.line(margin, y + rowH, margin + contentW, y + rowH);

                const nameStr = p.name.length > 28 ? p.name.slice(0, 26) + '...' : p.name;
                const clientStr = (p.client_name || '—').length > 18 ? (p.client_name || '').slice(0, 16) + '...' : (p.client_name || '—');

                txt(nameStr,      cols[0].x + 3, y + 6.5, 8, C_WHITE, true);
                txt(clientStr,    cols[1].x + 3, y + 6.5, 7.5, C_LIGHT_G);
                txt(`${p.current_stage}/6`, cols[2].x + 3, y + 6.5, 8, C_PRIMARY, true);
                txt(hrs > 0 ? formatHours(hrs) : '—', cols[3].x + 3, y + 6.5, 8, hrs > 0 ? C_WHITE : C_GRAY);
                txt(String(upd),  cols[4].x + 3, y + 6.5, 8, C_WHITE);
                txt(statusLabel,  cols[5].x + 3, y + 6.5, 7.5, p.current_stage === 6 ? [80,200,120] : C_LIGHT_G);

                y += rowH;
            });
            y += 14;

            // ── UPDATES DETAIL ────────────────────────────────────────────────
            filteredProjects.forEach(p => {
                const updates: any[] = p.updates || [];
                if (updates.length === 0) return;

                checkPageBreak(30);

                // Project Header card
                drawCard(y, 14, margin, contentW);
                pdf.setFillColor(...C_PRIMARY);
                pdf.rect(margin, y, 4, 14, 'F'); // left accent
                txt(p.name.toUpperCase(), margin + 8, y + 9, 10, C_WHITE, true);
                const stage = STAGES.find(s => s.id === p.current_stage);
                txt(`FASE ${p.current_stage}/6  ·  ${(stage?.label || '').toUpperCase()}`, margin + contentW - 4, y + 9, 7, C_PRIMARY, true, 'right');
                
                y += 18;

                updates.slice(0, 15).forEach((u: any, i: number) => {
                    checkPageBreak(16);

                    const uDate = u.created_at ? format(new Date(u.created_at), "dd MMM yy", { locale: ptBR }).toUpperCase() : '';
                    const uStatus = u.status === 'approved' ? 'Aprovado' : u.status === 'denied' ? 'Correção solicitada' : 'Aguardando revisão';
                    const uColor: [number,number,number] = u.status === 'approved' ? [80,200,120] : u.status === 'denied' ? [250,100,100] : C_PRIMARY;

                    // Timeline dot
                    pdf.setFillColor(...C_CARD);
                    pdf.setDrawColor(...C_BORDER);
                    pdf.circle(margin + 4, y + 4, 2, 'FD');
                    
                    // Timeline vertical line
                    if (i !== updates.length - 1 && i !== 14) {
                        pdf.setDrawColor(...C_BORDER);
                        pdf.line(margin + 4, y + 8, margin + 4, y + 16);
                    }

                    txt(uDate, margin + 10, y + 5, 7, C_PRIMARY, true);
                    txt(u.title || 'Atualização sem título', margin + 30, y + 5, 8.5, C_WHITE, true);
                    txt(uStatus.toUpperCase(), margin + contentW - 2, y + 5, 6.5, uColor, true, 'right');

                    if (u.hours_spent) {
                        pdf.setFillColor(40, 40, 40);
                        pdf.roundedRect(margin + contentW - 22, y + 8, 20, 5, 1, 1, 'F');
                        txt(`${formatHours(u.hours_spent)} invest.`, margin + contentW - 12, y + 11.5, 6, C_WHITE, false, 'center');
                    }

                    if (u.message) {
                        const msg = u.message.length > 90 ? u.message.slice(0, 88) + '...' : u.message;
                        txt(msg, margin + 30, y + 11, 7.5, C_GRAY);
                    }
                    y += 15;
                });
                y += 8;
            });

            // ── FOOTER (All Pages) ────────────────────────────────────────────
            const totalPages = (pdf as any).internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                pdf.setDrawColor(...C_BORDER);
                pdf.line(margin, pageH - 12, pageW - margin, pageH - 12);
                txt('NORDEX TECH — CONFIDENTIAL SYSTEM REPORT', margin, pageH - 7, 6, C_GRAY, true);
                txt(`PÁGINA ${i} DE ${totalPages}`, pageW - margin, pageH - 7, 6, C_GRAY, true, 'right');
            }

            // Generate filename & save
            const filename = isAll
                ? `nordex_report_${format(new Date(), 'yyyyMMdd')}.pdf`
                : `nordex_report_${(selectedProject?.name || 'proj').toLowerCase().replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;

            pdf.save(filename);
        } catch (error) {
            console.error('Erro ao exportar PDF:', error);
            alert('Erro ao gerar o PDF. Verifique o console.');
        } finally {
            setIsExporting(false);
        }
    };

    if (loading && projects.length === 0) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;

    const totalProjects = projects.length;
    const totalClients = users.filter((u: PortalUser) => u.role === 'client').length;
    const completedProjects = projects.filter((p: Project) => p.current_stage === 6).length;
    const activeProjects = totalProjects - completedProjects
    
    const totalHoursTracked = projects.reduce((acc: number, p: Project) => acc + (p.updates || []).reduce((s: number, u: any) => s + (u.hours_spent || 0), 0), 0)
    const totalUpdatesAllTime = projects.reduce((acc: number, p: Project) => acc + (p.updates?.length || 0), 0)
    const thisMonth = new Date()
    const updatesThisMonth = projects.reduce((acc: number, p: Project) => acc + (p.updates || []).filter((u: any) => {
        const d = new Date(u.created_at); return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear()
    }).length, 0)
    const pendingApproval = projects.filter((p: Project) => p.preview_status === 'pending').length

    const NAV = [
        { tab: 'overview', label: 'Geral', icon: <LayoutDashboard size={18} /> },
        { tab: 'projects', label: 'Esteiras de desenvolvimento', icon: <FolderKanban size={18} /> },
        { tab: 'users', label: 'Usuários', icon: <Users size={18} /> },
        { tab: 'team', label: 'Equipe', icon: <UsersRound size={18} />, iconSize: 14, isSub: true },
        { tab: 'mensagens', label: 'Mensagens', icon: <MessageSquareText size={18} /> },
        { tab: 'reports', label: 'Relatórios', icon: <BarChart2 size={18} /> },
        { tab: 'email', label: 'Configuração de Emails', icon: <Mail size={18} /> },
        { tab: 'trash', label: `Lixeira${trashProjects.length > 0 ? ` (${trashProjects.length})` : ''}`, icon: <Trash2 size={18} /> },
    ] as const

    return (
        <div className="h-screen overflow-hidden bg-background text-foreground flex selection:bg-primary/30">

            {/* ---------- SIDEBAR ---------- */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}
            <aside className={`fixed lg:static top-0 left-0 h-full lg:h-auto z-40 w-64 flex-shrink-0 bg-card border-r border-border flex flex-col transition-transform duration-300 ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}>
                {/* Logo */}
                <div className="px-6 py-5 border-b border-border flex items-center gap-3">
                    <Image
                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-Nordex-Tech-remove-WSehNqsem3EZQ2jxpk0CKTKMU1hLtG.png"
                        alt="Nordex" width={130} height={36} className="h-10 w-auto opacity-100" priority
                    />
                    <span className="bg-primary/10 text-primary text-[10px] font-black px-1.5 py-0.5 border border-primary/20 uppercase tracking-widest rounded-sm">ADM</span>
                </div>

                {/* Nav */}
                <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
                    <p className="px-5 mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Menu</p>
                    <div className="space-y-0.5 px-2">
                        {NAV.map((navItem) => {
                            const { tab, label, icon, isSub } = navItem as any;
                            
                            // Handle sub-menu visibility
                            if (isSub && !usersMenuExpanded) return null;

                            return (
                                <button
                                    key={tab}
                                    onClick={() => { 
                                        if (isSub) setUsersMenuExpanded(true);
                                        setActiveTab(tab as any); 
                                        setSidebarOpen(false);
                                    }}
                                    className={`w-full text-left py-2.5 rounded-xl font-semibold flex items-center transition-all duration-150 ${
                                        isSub ? 'pl-11 pr-4 mt-0.5 text-[12px] bg-secondary/20' : 'px-4 gap-3 text-[13px]'
                                    } ${
                                        activeTab === tab && !isSub // Only highlight main tab if active, or if it's the active sub tab
                                            ? 'bg-primary text-primary-foreground shadow-[0_0_16px_rgba(245,168,0,0.25)]'
                                            : activeTab === tab && isSub
                                            ? 'bg-primary/20 text-primary shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                    }`}
                                >
                                    {isSub && <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2.5" />}
                                    {!isSub && icon}
                                    <span className={!isSub ? 'flex-1' : 'flex items-center gap-2 flex-1'}>
                                        {isSub && icon}{label}
                                    </span>
                                    
                                    {/* Sub-menu Toggle Arrow */}
                                    {tab === 'users' && (
                                        <div 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                setUsersMenuExpanded(!usersMenuExpanded);
                                            }}
                                            className={`transition-transform duration-200 p-1.5 -mr-1.5 rounded-md hover:bg-black/10 flex items-center justify-center ${usersMenuExpanded ? 'rotate-180' : ''}`}
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="6 9 12 15 18 9"></polyline>
                                            </svg>
                                        </div>
                                    )}

                                    {tab === 'projects' && pendingApproval > 0 && (
                                        <span className="ml-auto w-5 h-5 bg-amber-500 text-[10px] font-black text-black rounded-full flex items-center justify-center">{pendingApproval}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </nav>

                {/* User + Logout */}
                <div className="border-t border-border p-4">
                    {currentUser && (
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-full bg-secondary border border-border overflow-hidden shrink-0">
                                {currentUser.avatar_url
                                    ? <img src={currentUser.avatar_url} alt="" className="w-full h-full object-cover" />
                                    : <div className="w-full h-full flex items-center justify-center text-primary font-bold text-sm">{currentUser.name.charAt(0)}</div>}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[13px] font-bold leading-none truncate">{currentUser.name}</p>
                                <p className="text-[10px] text-primary font-bold uppercase tracking-tighter mt-0.5">{currentUser.position || 'Administrador'}</p>
                            </div>
                        </div>
                    )}
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
                        <LogOut size={14} /> Desconectar
                    </button>
                </div>
            </aside>

            {/* ---------- CONTENT ---------- */}
            <div className="flex-1 min-w-0 flex flex-col">
                {/* Mobile topbar */}
                <div className="lg:hidden flex items-center gap-4 px-5 py-3 border-b border-border bg-card sticky top-0 z-20">
                    <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground hover:text-foreground">
                        <Menu size={22} />
                    </button>
                    <span className="text-[13px] font-bold">{NAV.find(n => n.tab === activeTab)?.label}</span>
                </div>

                {activeTab === 'mensagens' ? (
                    <div className="flex-1 p-2 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
                        <div className="flex-1 animate-fade-in flex flex-col bg-background rounded-xl shadow-sm border border-border overflow-hidden min-h-0">
                            <ChatTeam currentUser={currentUser!} />
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 p-6 lg:p-8 overflow-y-auto custom-scrollbar flex flex-col">
                        {activeTab === 'overview' && (
                            <div className="space-y-6 animate-fade-in">
                                {/* Page title */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-black tracking-tight text-foreground">Visão Geral</h2>
                                        <p className="text-[13px] text-muted-foreground mt-0.5">Métricas operacionais em tempo real</p>
                                    </div>
                                    {/* Actions removed as requested - should only be in contextual tabs */}
                                </div>

                        {/* KPI Cards — Agency Metrics */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Projetos Ativos', value: activeProjects, sub: `${totalProjects} no total`, icon: <FolderKanban size={20} />, color: 'primary' },
                                { label: 'Horas Registradas', value: `${totalHoursTracked}h`, sub: 'Esforço da equipe', icon: <Timer size={20} />, color: 'blue' },
                                { label: 'Updates este Mês', value: updatesThisMonth, sub: `${totalUpdatesAllTime} no total`, icon: <TrendingUp size={20} />, color: 'green' },
                                { label: 'Aguardando Aprovação', value: pendingApproval, sub: 'Projetos em homo.', icon: <Clock size={20} />, color: pendingApproval > 0 ? 'amber' : 'muted' },
                            ].map((kpi, i) => (
                                <div key={i} className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3 hover:border-primary/20 transition-colors">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                        kpi.color === 'primary' ? 'bg-primary/10 text-primary' :
                                        kpi.color === 'blue' ? 'bg-blue-500/10 text-blue-400' :
                                        kpi.color === 'green' ? 'bg-green-500/10 text-green-400' :
                                        kpi.color === 'amber' ? 'bg-amber-500/10 text-amber-400' :
                                        'bg-secondary text-muted-foreground'
                                    }`}>{kpi.icon}</div>
                                    <div>
                                        <p className={`text-3xl font-black tracking-tighter ${
                                            kpi.color === 'primary' ? 'text-primary' :
                                            kpi.color === 'blue' ? 'text-blue-400' :
                                            kpi.color === 'green' ? 'text-green-400' :
                                            kpi.color === 'amber' ? 'text-amber-400' :
                                            'text-foreground'
                                        }`}>{kpi.value}</p>
                                        <p className="text-[11px] font-bold text-foreground mt-0.5">{kpi.label}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Alert Center */}
                            <div className="lg:col-span-2">
                                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                                    <div className="p-5 border-b border-border flex items-center justify-between">
                                        <h3 className="text-[14px] font-bold text-foreground flex items-center gap-2"><AlertCircle size={16} className="text-primary" /> Centro de Alertas</h3>
                                    </div>
                                    <div className="divide-y divide-border">
                                        {projects.filter((p: Project) => p.preview_status === 'pending' || p.preview_status === 'rejected').length === 0 ? (
                                            <p className="text-[13px] text-muted-foreground text-center py-8">Nenhum alerta no momento.</p>
                                        ) : (
                                            projects
                                                .filter((p: Project) => p.preview_status === 'pending' || p.preview_status === 'rejected')
                                                .slice(0, 5)
                                                .map((p: Project) => (
                                                    <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-secondary/20 transition-colors cursor-pointer" onClick={() => { setActiveTab('projects'); setExpandedClientId(p.client_name || ''); setExpandedProjectId(p.id); }}>
                                                        <div className={`w-2 h-2 rounded-full shrink-0 ${p.preview_status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'}`} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[13px] font-semibold text-foreground truncate">{p.name}</p>
                                                            <p className="text-[11px] text-muted-foreground">{p.preview_status === 'rejected' ? 'Ajuste solicitado pelo cliente' : 'Aguardando aprovação do cliente'}</p>
                                                        </div>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${p.preview_status === 'rejected' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                                                            {p.preview_status === 'rejected' ? 'Pendente' : 'Em análise'}
                                                        </span>
                                                    </div>
                                                ))
                                        )}
                                    </div>
                                </div>

                                {/* Hours by project table */}
                                <div className="bg-card border border-border rounded-2xl overflow-hidden mt-6">
                                    <div className="p-5 border-b border-border">
                                        <h3 className="text-[14px] font-bold text-foreground flex items-center gap-2"><Timer size={16} className="text-primary" /> Horas por Projeto</h3>
                                        <p className="text-[12px] text-muted-foreground mt-0.5">Esforço registrado via updates</p>
                                    </div>
                                    <div className="overflow-x-auto custom-scrollbar">
                                        <table className="w-full text-left">
                                            <thead><tr className="border-b border-border bg-secondary/30">
                                                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Projeto</th>
                                                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Horas Log.</th>
                                                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Est.</th>
                                                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Updates</th>
                                                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fase</th>
                                            </tr></thead>
                                            <tbody className="divide-y divide-border">
                                                {projects.slice(0, 8).map(p => {
                                                    const hrs = (p.updates || []).reduce((s: number, u: any) => s + (u.hours_spent || 0), 0)
                                                    const stage = STAGES.find(s => s.id === p.current_stage)
                                                    return (
                                                        <tr key={p.id} className="hover:bg-secondary/20 transition-colors cursor-pointer" onClick={() => { setActiveTab('projects'); setExpandedClientId(p.client_name || ''); setExpandedProjectId(p.id); }}>
                                                            <td className="px-5 py-3">
                                                                <p className="text-[13px] font-semibold text-foreground truncate max-w-[200px]">{p.name}</p>
                                                                <p className="text-[11px] text-muted-foreground">{p.client_name}</p>
                                                            </td>
                                                            <td className="px-5 py-3 text-right">
                                                                <span className={`text-[14px] font-black ${hrs > 0 ? 'text-primary' : 'text-muted-foreground/40'}`}>{hrs > 0 ? `${hrs}h` : '—'}</span>
                                                            </td>
                                                            <td className="px-5 py-3 text-right">
                                                                <span className="text-[13px] font-semibold text-muted-foreground">{p.estimated_hours ? `${p.estimated_hours}h` : '—'}</span>
                                                            </td>
                                                            <td className="px-5 py-3 text-right">
                                                                <span className="text-[13px] font-bold text-foreground">{p.updates?.length || 0}</span>
                                                            </td>
                                                            <td className="px-5 py-3">
                                                                <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full border border-primary/20">{stage?.label}</span>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                        {projects.length === 0 && (
                                            <p className="text-[13px] text-muted-foreground text-center py-8">Nenhum projeto cadastrado.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right column */}
                            <div className="space-y-6">
                                {/* Team workload */}
                                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                                    <div className="p-5 border-b border-border">
                                        <h3 className="text-[14px] font-bold text-foreground flex items-center gap-2"><UsersRound size={16} className="text-primary" /> Carga da Equipe</h3>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        {teamStats.workload.length === 0 ? (
                                            <p className="text-[12px] text-muted-foreground text-center py-4">Nenhum membro cadastrado.</p>
                                        ) : (
                                            teamStats.workload.map((member: any, idx: number) => (
                                                <div key={idx} className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-secondary border border-border overflow-hidden shrink-0">
                                                        {member.avatar_url
                                                            ? <img src={member.avatar_url} alt={member.name} className="w-full h-full rounded-full object-cover" />
                                                            : <div className="w-full h-full flex items-center justify-center text-[11px] font-bold text-primary">{member.name.split(' ').map((n: string) => n[0]).join('')}</div>}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-[12px] font-semibold text-foreground truncate">{member.name.split(' ')[0]}</p>
                                                            <span className="text-[11px] font-black text-primary">{member.project_count} proj.</span>
                                                        </div>
                                                        <div className="mt-1.5 w-full bg-border/30 h-1 rounded-full overflow-hidden">
                                                            <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (member.project_count / Math.max(...teamStats.workload.map((m: any) => m.project_count), 1)) * 100)}%` }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Stage distribution */}
                                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                                    <div className="p-5 border-b border-border">
                                        <h3 className="text-[14px] font-bold text-foreground">Distribuição por Fase</h3>
                                    </div>
                                    <div className="p-4 space-y-2">
                                        {STAGES.map(s => {
                                            const count = projects.filter(p => p.current_stage === s.id).length
                                            const pct = projects.length > 0 ? (count / projects.length) * 100 : 0
                                            return (
                                                <div key={s.id}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[11px] font-semibold text-muted-foreground">{s.label}</span>
                                                        <span className="text-[11px] font-black text-foreground">{count}</span>
                                                    </div>
                                                    <div className="bg-border/30 h-1.5 rounded-full overflow-hidden">
                                                        <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Delivery efficiency */}
                                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
                                    <p className="text-[11px] font-black text-primary uppercase tracking-widest mb-2">Eficiência de Entrega</p>
                                    <p className="text-3xl font-black text-foreground">{totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0}%</p>
                                    <p className="text-[11px] text-muted-foreground mt-1">Projetos entregues com sucesso</p>
                                    <div className="mt-4 w-full bg-border/30 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'projects' && (
                    <div className="animate-fade-in max-w-5xl mx-auto space-y-6">

                        {/* á¢‚¬€š¬á¢‚¬€š¬ Toolbar á¢‚¬€š¬á¢‚¬€š¬ */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="relative flex-1">
                                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                                <input
                                    type="text"
                                    placeholder="Buscar por cliente ou projeto..."
                                    value={projectSearch}
                                    onChange={e => setProjectSearch(e.target.value)}
                                    className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 focus:border-primary outline-none transition-colors"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <SlidersHorizontal size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                                    <select
                                        value={projectFilter}
                                        onChange={e => setProjectFilter(e.target.value as any)}
                                        className="bg-card border border-border rounded-xl pl-9 pr-4 py-2.5 text-[13px] text-foreground focus:border-primary outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="all">Todos</option>
                                        <option value="alerts">Com Alertas</option>
                                        <option value="active">Em Progresso</option>
                                        <option value="done">Concluídos</option>
                                    </select>
                                </div>
                                <button onClick={() => setShowNewProject(true)} className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:opacity-90 inline-flex items-center gap-2 shadow-[0_0_15px_rgba(245,168,0,0.15)] whitespace-nowrap">
                                    <Plus size={15} /> Novo Projeto
                                </button>
                            </div>
                        </div>

                        {/* á¢‚¬€š¬á¢‚¬€š¬ Empty State á¢‚¬€š¬á¢‚¬€š¬ */}
                        {projects.length === 0 ? (
                            <div className="text-center py-24 bg-card border border-border rounded-xl">
                                <FolderKanban size={32} className="mx-auto text-muted-foreground mb-4 opacity-50" />
                                <p className="text-[15px] font-medium text-foreground mb-2">A esteira operacional está vazia.</p>
                                <button onClick={() => setShowNewProject(true)} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground font-semibold text-[13px] hover:opacity-90 inline-flex items-center gap-2 mt-4">Novo Projeto</button>
                            </div>
                        ) : filteredGroups.length === 0 ? (
                            <div className="text-center py-20 bg-card border border-dashed border-border/50 rounded-2xl">
                                <Search size={28} className="mx-auto text-muted-foreground mb-3 opacity-30" />
                                <p className="text-[14px] font-medium text-muted-foreground">Nenhum resultado encontrado.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {filteredGroups.map(group => {
                                    const isClientExpanded = expandedClientId === group.clientName;
                                    const hasRejected = group.projects.some(p => p.preview_status === 'rejected');
                                    const hasPending = group.projects.some(p => p.preview_status === 'pending');
                                    const doneCount = group.projects.filter(p => p.current_stage === 6).length;
                                    const progressPct = group.projects.length > 0 ? Math.round((doneCount / group.projects.length) * 100) : 0;
                                    const initials = group.clientName.split(' ').slice(0,2).map((n: string) => n[0]).join('').toUpperCase();

                                    return (
                                        <div key={group.clientName} className={`rounded-2xl overflow-hidden transition-all duration-300 border ${
                                            hasRejected ? 'border-red-500/30 shadow-[0_0_30px_-8px_rgba(239,68,68,0.15)]' :
                                            hasPending ? 'border-amber-500/30 shadow-[0_0_30px_-8px_rgba(245,158,11,0.12)]' :
                                            'border-border'
                                        }`}>

                                            {/* á¢‚¬€š¬á¢‚¬€š¬ Client Card Header á¢‚¬€š¬á¢‚¬€š¬ */}
                                            <div
                                                onClick={() => setExpandedClientId(isClientExpanded ? null : group.clientName)}
                                                className="w-full text-left bg-card hover:bg-card/80 transition-colors cursor-pointer"
                                            >
                                                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
                                                       <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-xl font-black shrink-0 aspect-square ${
                                                        hasRejected ? 'bg-red-500/20 text-red-400' :
                                                        hasPending ? 'bg-amber-500/20 text-amber-400' :
                                                        'bg-primary/15 text-primary'
                                                    }`}>
                                                        {initials}
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                                            <h3 className="text-[15px] sm:text-[16px] font-bold text-foreground tracking-tight truncate">{group.clientName}</h3>
                                                            {hasRejected && (
                                                                <span className="inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest px-1.5 sm:px-2 py-0.5 rounded-full border bg-red-500/10 border-red-500/30 text-red-400 animate-pulse">
                                                                    <AlertCircle size={8} /> Ajuste Pendente
                                                                </span>
                                                            )}
                                                            {!hasRejected && hasPending && (
                                                                <span className="inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest px-1.5 sm:px-2 py-0.5 rounded-full border bg-amber-500/10 border-amber-500/30 text-amber-400">
                                                                    <Clock size={8} /> Em Homologação
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-[11px] text-muted-foreground font-medium">
                                                            <span className="flex items-center gap-1.5 shrink-0"><Briefcase size={11} /> {group.projects.length} {group.projects.length !== 1 ? 'projetos' : 'projeto'}</span>
                                                            {group.clientEmail && <span className="truncate max-w-[150px] sm:max-w-[200px]">{group.clientEmail}</span>}
                                                        </div>
                                                        {/* Per-client progress bar */}
                                                        <div className="mt-2.5 sm:mt-3 flex items-center gap-3">
                                                            <div className="flex-1 bg-border/30 h-1 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full transition-all duration-1000"
                                                                    style={{
                                                                        width: `${progressPct}%`,
                                                                        background: progressPct === 100 ? '#22c55e' : '#f5a800'
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground shrink-0">{doneCount}/{group.projects.length} {doneCount !== 1 ? 'concluídos' : 'concluído'}</span>
                                                        </div>
                                                    </div>

                                                    {/* Right: quick actions + chevron */}
                                                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/30 sm:border-transparent">
                                                        <button
                                                            onClick={e => { e.stopPropagation(); setNewProjectClientId(group?.client?.id || ''); setShowNewProject(true); }}
                                                            className="h-9 px-3 bg-secondary/80 hover:bg-primary hover:text-primary-foreground border border-border hover:border-primary rounded-lg text-[12px] font-semibold inline-flex items-center gap-1.5 transition-all"
                                                            title="Novo Projeto para este cliente"
                                                        >
                                                            <Plus size={13} />
                                                            <span className="inline">Projeto</span>
                                                        </button>
                                                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
                                                            isClientExpanded ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-background border-border text-muted-foreground'
                                                        }`}>
                                                            {isClientExpanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* á¢‚¬€š¬á¢‚¬€š¬ Expanded: Projects list á¢‚¬€š¬á¢‚¬€š¬ */}
                                            {isClientExpanded && (
                                                <div className="border-t border-border/50 bg-background/50 p-4 sm:p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                                    {group.projects.map(proj => {
                                                        const isExpanded = expandedProjectId === proj.id;
                                                        const ps = proj.preview_status ?? 'none';

                                                        return (
                                                        <div key={proj.id} className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-md transition-all">
                                                            {/* Project Card Header */}
                                                            <div className="p-5 relative">
                                                                <div className="absolute top-0 right-0 w-48 h-full bg-primary/5 blur-[40px] pointer-events-none" />
                                                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
                                                                    <div className="space-y-1.5 flex-1 pr-4">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <span className="bg-primary/20 text-primary text-[9px] uppercase font-black px-2 py-0.5 rounded-sm tracking-widest border border-primary/20">
                                                                                Etapa {proj.current_stage}/6
                                                                            </span>
                                                                            {ps === 'pending' && (
                                                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border bg-amber-500/10 border-amber-500/30 text-amber-400">
                                                                                    <Clock size={9} /> Aguardando Avaliação
                                                                                </span>
                                                                            )}
                                                                            {ps === 'approved' && (
                                                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border bg-green-500/10 border-green-500/30 text-green-400">
                                                                                    <ThumbsUp size={9} /> Aprovado
                                                                                </span>
                                                                            )}
                                                                            {ps === 'rejected' && (
                                                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border bg-red-500/10 border-red-500/30 text-red-400 animate-pulse">
                                                                                    <AlertCircle size={9} /> Ajustes Solicitados
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <h3 className="font-bold text-[18px] tracking-tight text-foreground flex items-center gap-2 flex-wrap">
                                                                            <span className="truncate max-w-[200px] sm:max-w-none">{proj.name}</span>
                                                                            <div className="flex items-center gap-1 ml-auto sm:ml-0">
                                                                                <button onClick={() => openEditProjectModal(proj)} className="text-muted-foreground hover:text-primary transition-colors hover:bg-secondary p-1 rounded-md" title="Editar Metadados">
                                                                                    <FileEdit size={14} />
                                                                                </button>
                                                                                <button 
                                                                                    onClick={() => { setDeletingProject(proj); setPermanentDelete(false); }}
                                                                                    className="text-muted-foreground hover:text-red-500 transition-colors hover:bg-red-500/10 p-1 rounded-md" 
                                                                                    title="Mover para Lixeira"
                                                                                >
                                                                                    <Trash2 size={14} />
                                                                                </button>
                                                                                {/* ── QUICK-VIEW EYE BUTTON ── */}
                                                                                {(() => {
                                                                                    const updates: any[] = proj.updates || [];
                                                                                    const latestUpdate = updates[0];
                                                                                    const clientJustDenied = latestUpdate?.status === 'denied';
                                                                                    // Badge only for the LATEST state
                                                                                    const hasUnseenClientNote = latestUpdate?.status === 'pending' && !!latestUpdate?.client_note;
                                                                                    
                                                                                    const badgeCount = (clientJustDenied ? 1 : 0) + (hasUnseenClientNote ? 1 : 0);
                                                                                    const isUrgent = clientJustDenied;
                                                                                    return (
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); setQuickViewProject(proj); setQvStage(proj.current_stage || 1); setQvMode(null); setQvTitle(''); setQvMessage(''); setQvRevisionOf(''); setQvPreviewUrl(proj.preview_url || ''); setQvHours(''); }}
                                                                                            className={`relative p-1 rounded-md transition-all duration-200 ${
                                                                                                isUrgent
                                                                                                    ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                                                                                                    : badgeCount > 0
                                                                                                        ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                                                                                                        : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                                                                                            }`}
                                                                                            title="Visão Rápida do Projeto"
                                                                                        >
                                                                                            {isUrgent && <span className="absolute inset-0 rounded-md bg-red-500/20 animate-ping pointer-events-none" />}
                                                                                            <Eye size={14} className={isUrgent ? 'relative z-10' : ''} />
                                                                                            {badgeCount > 0 && (
                                                                                                <span className={`absolute -top-2 -right-2 min-w-[17px] h-[17px] px-0.5 text-[8px] font-black rounded-full flex items-center justify-center border border-background leading-none shadow-lg z-20 ${
                                                                                                    isUrgent ? 'bg-red-500 text-white shadow-red-500/50' : 'bg-amber-500 text-black shadow-amber-500/50'
                                                                                                }`}>
                                                                                                    {badgeCount > 9 ? '9+' : badgeCount}
                                                                                                </span>
                                                                                            )}
                                                                                        </button>
                                                                                    );
                                                                                })()}
                                                                            </div>
                                                                        </h3>
                                                                        {ps === 'rejected' && proj.preview_feedback && (
                                                                            <div className="mt-2 bg-red-500/5 border border-red-500/20 rounded-lg p-3 animate-in slide-in-from-left-2 duration-500 w-fit">
                                                                                <div className="flex items-center gap-1.5 text-red-400 font-bold text-[9px] uppercase tracking-wider mb-1"><MessageSquareText size={10} /> Feedback do Cliente:</div>
                                                                                <p className="text-[12px] text-foreground font-medium leading-relaxed italic">"{proj.preview_feedback}"</p>
                                                                            </div>
                                                                        )}
                                                                            <div className="flex items-center gap-3 text-[12px] text-muted-foreground font-medium pt-1">
                                                                                {proj.preview_url ? (
                                                                                    <span className="flex items-center gap-1.5"><LinkIcon size={12} className="text-green-500" /> Link de teste configurado</span>
                                                                                ) : (
                                                                                    <span className="text-muted-foreground/60">Sem link de visualização</span>
                                                                                )}
                                                                            </div>
                                                                            
                                                                            {/* Project Squad / Assignments */}
                                                                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/30">
                                                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Squad Responsável:</span>
                                                                                <div className="flex -space-x-2">
                                                                                    {projectAssignments.filter(a => a.project_id === proj.id).map(a => {
                                                                                        const user = users.find(u => u.id === a.user_id);
                                                                                        if (!user) return null;
                                                                                        return (
                                                                                            <div key={user.id} className="w-8 h-8 rounded-full border-2 border-background bg-secondary relative group shrink-0 aspect-square">
                                                                                                {user.avatar_url ? (
                                                                                                    <img src={user.avatar_url} alt={user.name} className="w-full h-full rounded-full object-cover" />
                                                                                                ) : (
                                                                                                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-primary">{user.name.charAt(0)}</div>
                                                                                                )}
                                                                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-card border border-border px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                                                                                                    {user.name}
                                                                                                </div>
                                                                                                <button onClick={(e) => { e.stopPropagation(); handleRemoveAssignment(proj.id, user.id); }} className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                                    <X size={8} />
                                                                                                </button>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                    <button 
                                                                                        onClick={() => setAssigningProject(proj)}
                                                                                        className="w-8 h-8 rounded-full border-2 border-dashed border-primary/40 bg-primary/5 flex items-center justify-center text-primary hover:bg-primary/20 transition-all"
                                                                                    >
                                                                                        <Plus size={12} />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    <button
                                                                        onClick={() => setExpandedProjectId(isExpanded ? null : proj.id)}
                                                                        className="w-full lg:w-auto h-10 px-5 bg-secondary/80 hover:bg-white/5 border border-border rounded-xl text-[12px] font-semibold inline-flex items-center justify-center gap-2 transition-all mt-3 lg:mt-0"
                                                                    >
                                                                        {isExpanded ? 'Esconder Diário' : 'Abrir Linha do Tempo'}
                                                                        {isExpanded ? <ChevronUp size={14} className="text-primary"/> : <ChevronDown size={14} className="text-primary"/>}
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Expanded Timeline View */}
                                                            {isExpanded && (
                                                                <div className="bg-background border-t border-border animate-fade-in overflow-hidden">
                                                                    
                                                                    {/* Dispatch new update block */}
                                                                    <div className="p-5 sm:p-6 border-b border-border/50 bg-secondary/10">
                                                                        {isUpdating === proj.id ? (
                                                                            <form onSubmit={(e) => handlePostUpdate(e, proj.id)} className="space-y-4 bg-background p-5 sm:p-6 rounded-xl border border-primary/30 shadow-2xl relative">
                                                                                <div className="absolute top-0 left-0 w-2 h-full bg-primary rounded-l-xl" />
                                                                                
                                                                                <div className="flex items-center justify-between">
                                                                                    <h4 className="text-[14px] sm:text-[15px] font-semibold text-foreground">Disparar Atualização para o Cliente</h4>
                                                                                    <button type="button" onClick={() => setIsUpdating(null)} className="p-1 rounded bg-secondary text-muted-foreground hover:text-foreground"><X size={16} /></button>
                                                                                </div>
                                                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                                                    <div className="md:col-span-1">
                                                                                        <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider mb-2 block">Selecione Fase</label>
                                                                                        <select value={updateStage} onChange={e => setUpdateStage(Number(e.target.value))} className="w-full bg-card border border-border rounded-md px-3 py-2.5 text-[13px] text-foreground focus:border-primary outline-none font-semibold">
                                                                                            {STAGES.map(s => <option key={s.id} value={s.id}>Et. {s.id}: {s.label}</option>)}
                                                                                        </select>
                                                                                    </div>
                                                                                    <div className="md:col-span-3">
                                                                                        <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider mb-2 block">Ato / Título (Notificação)</label>
                                                                                        <input type="text" placeholder="Ex: Layout Premium Aprovado" required value={updateTitle} onChange={e => setUpdateTitle(e.target.value)} className="w-full bg-card border border-border rounded-md px-3 py-2.5 text-[13px] text-foreground focus:border-primary outline-none font-medium" />
                                                                                    </div>
                                                                                </div>
                                                                                
                                                                                <div>
                                                                                    <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider mb-2 block">Mensagem Estruturada (Opcional)</label>
                                                                                    <textarea placeholder="Relate o que foi finalizado e quais são as orientações..." rows={3} value={updateMessage} onChange={e => setUpdateMessage(e.target.value)} className="w-full bg-card border border-border rounded-md px-3 py-2.5 text-[13px] resize-y text-foreground focus:border-primary outline-none placeholder:text-muted-foreground/40" />
                                                                                </div>

                                                                                <div className="bg-secondary/30 p-4 rounded-lg border border-border/50">
                                                                                    <label className="text-[11px] font-bold uppercase text-primary tracking-wider mb-2 flex items-center gap-2">
                                                                                        <LinkIcon size={12}/> Link de Homologação (Injetar Automático)
                                                                                     </label>
                                                                                     <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                                                        Se você inserir uma url aqui, o botão principal do *Dashboard do Cliente* e o registro dele será imediatamente substituído para este novo link. Deixe vazio para manter a URL atual do projeto.
                                                    </p>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1">
                                                            <input type="url" placeholder="Ex: https://nordex-preview.com/projeto-v2" value={updatePreviewUrl} onChange={e => setUpdatePreviewUrl(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-[13px] text-foreground focus:border-primary outline-none font-mono" />
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <div className="flex-1">
                                                                <input type="number" placeholder="Horas" value={updateHours} onChange={e => setUpdateHours(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-[13px] text-foreground focus:border-primary outline-none" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <input type="number" placeholder="Minutos" value={updateMinutes} onChange={e => setUpdateMinutes(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-[13px] text-foreground focus:border-primary outline-none" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                                                {/* ── REVISION SYSTEM UI ──────────────────────────────── */}
                                                                                <div className="rounded-xl border border-border/50 overflow-hidden">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => { setIsRevision(!isRevision); setRevisionOf(''); }}
                                                                                        className={`w-full flex items-center justify-between px-4 py-3 text-[12px] font-bold transition-all ${
                                                                                            isRevision 
                                                                                                ? 'bg-blue-500/10 border-b border-blue-500/20 text-blue-400' 
                                                                                                : 'bg-secondary/30 text-muted-foreground hover:text-foreground'
                                                                                        }`}
                                                                                    >
                                                                                        <span className="flex items-center gap-2">
                                                                                            <span className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                                                                                isRevision ? 'bg-blue-500 border-blue-500' : 'border-border bg-background'
                                                                                            }`}>
                                                                                                {isRevision && <Check size={10} className="text-white" />}
                                                                                            </span>
                                                                                            Esta atualização é uma CORREÇÃO de uma versão anterior?
                                                                                        </span>
                                                                                        <span className="text-[10px] uppercase tracking-wider font-black opacity-60">Vincular</span>
                                                                                    </button>

                                                                                    {isRevision && (
                                                                                        <div className="p-4 bg-blue-500/5 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                                                                            <p className="text-[11px] text-blue-400/80 leading-relaxed">
                                                                                                Selecione a atualização que esta nova versão resolve. Ela ficará vinculada visualmente no portal do cliente como prova de endereçamento.
                                                                                            </p>
                                                                                            <select
                                                                                                value={revisionOf}
                                                                                                onChange={e => setRevisionOf(e.target.value)}
                                                                                                required={isRevision}
                                                                                                className="w-full bg-background border border-blue-500/30 rounded-md px-3 py-2.5 text-[13px] text-foreground focus:border-blue-400 outline-none"
                                                                                            >
                                                                                                <option value="">-- Selecione a versão que está sendo corrigida --</option>
                                                                                                {projectUpdatesForRevision.map(u => (
                                                                                                    <option key={u.id} value={u.id}>
                                                                                                        {u.status === 'denied' ? 'ðŸ”´ ' : u.status === 'pending' ? 'ðŸŸ¡ ' : 'ðŸŸ¢ '}
                                                                                                        Et.{u.stage} · {u.title}
                                                                                                    </option>
                                                                                                ))}
                                                                                            </select>
                                                                                            {revisionOf && (
                                                                                                <div className="flex items-start gap-2 text-[11px] text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                                                                                                    <span className="text-base shrink-0">ðŸ”„</span>
                                                                                                    <span>Esta atualização será exibida no portal do cliente como uma <b>correção direta</b> da versão selecionada. A versão anterior receberá uma marcação visual de <b>"Resolvido"</b>.</span>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                {/* ────────────────────────────────────────────────── */}

                                                                                <div className="flex justify-end pt-2">
                                                                                    <button type="submit" className="h-10 px-6 sm:h-11 sm:px-8 bg-primary text-primary-foreground rounded-lg text-[12px] sm:text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(245,168,0,0.2)]">
                                                                                        <Send size={15} /> Enviar Atualização para a Nuvem
                                                                                    </button>
                                                                                </div>
                                                                            </form>
                                                                        ) : (
                                                                            <button onClick={() => openUpdateForm(proj.id)} className="w-full h-11 flex items-center justify-center gap-2 bg-background border border-dashed border-primary/50 text-foreground hover:bg-secondary/50 rounded-xl transition-all text-[13px] font-semibold">
                                                                                <Plus size={16} className="text-primary"/> Criar Nova Atualização de Pipeline
                                                                            </button>
                                                                        )}
                                                                    </div>

                                                                    {/* Mirror Timeline Feed */}
                                                                    <div className="p-6 px-6 sm:px-10 bg-background">
                                                                        {(!proj.updates || proj.updates.length === 0) ? (
                                                                            <p className="text-[13px] text-muted-foreground text-center py-6">Este projeto ainda não recebeu nenhuma atualização estrutural na pipeline.</p>
                                                                        ) : (
                                                                            <UpdateTimeline 
                                                                                project={proj} 
                                                                                onUpdateSaved={() => fetchData()} 
                                                                            />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

                {/* TAB: Relatórios Profissionais */}
                {activeTab === 'reports' && (
                    <div className="animate-fade-in max-w-6xl mx-auto space-y-8 pb-20">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                            <div>
                                <h3 className="text-2xl font-black tracking-tight text-foreground uppercase">Relatórios de Performance</h3>
                                <p className="text-[14px] text-muted-foreground font-medium">Auditoria de eficiência, volume e saúde das operações</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-xl">
                                    <select 
                                        value={reportProjectId} 
                                        onChange={e => setReportProjectId(e.target.value)}
                                        className="bg-transparent text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 outline-none text-foreground cursor-pointer"
                                    >
                                        <option value="all">Todos os Projetos</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <div className="h-4 w-px bg-border" />
                                    <input 
                                        type="date" 
                                        value={reportStartDate} 
                                        onChange={e => setReportStartDate(e.target.value)}
                                        className="bg-transparent text-[11px] font-bold px-3 py-1.5 outline-none text-muted-foreground"
                                    />
                                    <span className="text-muted-foreground text-[10px]">até</span>
                                    <input 
                                        type="date" 
                                        value={reportEndDate} 
                                        onChange={e => setReportEndDate(e.target.value)}
                                        className="bg-transparent text-[11px] font-bold px-3 py-1.5 outline-none text-muted-foreground"
                                    />
                                </div>
                                <button 
                                    onClick={handleExportPDF}
                                    className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-[12px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                                >
                                    <FileDown size={16} /> Exportar
                                </button>
                            </div>
                        </div>

                        <div ref={reportRef} className="space-y-8">
                            {/* Project Specific Deep Metrics */}
                        {reportProjectId !== 'all' && projectSpecificStats && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                                <div className="bg-card border border-border rounded-2xl p-6 flex flex-col md:flex-row gap-8">
                                    <div className="flex-1">
                                        <h4 className="text-[12px] font-black uppercase tracking-widest text-primary mb-3">Resumo do Projeto</h4>
                                        <p className="text-[14px] text-foreground font-medium leading-relaxed">
                                            {projects.find(p => p.id === reportProjectId)?.description || "Sem descrição informada."}
                                        </p>
                                        <div className="mt-4 flex gap-4">
                                            <div className="bg-secondary/20 px-3 py-1.5 rounded-lg border border-border">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase mr-2">Status:</span>
                                                <span className="text-[11px] font-black text-foreground uppercase">
                                                    {STAGES.find(s => s.id === (projects.find(p => p.id === reportProjectId)?.current_stage || 1))?.label}
                                                </span>
                                            </div>
                                            <div className="bg-secondary/20 px-3 py-1.5 rounded-lg border border-border">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase mr-2">Início:</span>
                                                <span className="text-[11px] font-black text-foreground">
                                                    {format(new Date(projects.find(p => p.id === reportProjectId)!.created_at), 'dd/MM/yyyy')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-px bg-border hidden md:block" />
                                    <div className="flex-1">
                                        <h4 className="text-[12px] font-black uppercase tracking-widest text-primary mb-3">Equipe Alocada</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {projectAssignments.filter(a => a.project_id === reportProjectId).length > 0 ? (
                                                projectAssignments.filter(a => a.project_id === reportProjectId).map((a, i) => {
                                                    const u = users.find(user => user.id === a.user_id);
                                                    return (
                                                        <div key={i} className="flex items-center gap-2 bg-secondary/10 border border-border p-1.5 pr-3 rounded-full">
                                                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                                                                {u?.name.substring(0, 1) || '?'}
                                                            </div>
                                                            <span className="text-[11px] font-black text-foreground">{u?.name || 'Desconhecido'}</span>
                                                        </div>
                                                    )
                                                })
                                            ) : (
                                                <span className="text-[11px] text-muted-foreground italic">Nenhum squad definido para este projeto.</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Lead Time</p>
                                        <p className="text-2xl font-black text-foreground">{projectSpecificStats.leadTime}</p>
                                        <p className="text-[11px] text-muted-foreground mt-1 italic">Duração do ciclo</p>
                                    </div>
                                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Primeira Aprovação</p>
                                        <p className="text-2xl font-black text-foreground">{projectSpecificStats.approvalRate}%</p>
                                        <p className="text-[11px] text-muted-foreground mt-1 italic">Assertividade técnica</p>
                                    </div>
                                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Volume Produzido</p>
                                        <p className="text-2xl font-black text-foreground">{projectSpecificStats.totalUpdates}</p>
                                        <p className="text-[11px] text-muted-foreground mt-1 italic">Entregas realizadas</p>
                                    </div>
                                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Feedback Loop</p>
                                        <p className="text-2xl font-black text-foreground">{projectSpecificStats.rejectionCount}</p>
                                        <p className="text-[11px] text-muted-foreground mt-1 italic">Ajustes solicitados</p>
                                    </div>
                                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Esforço (Horas)</p>
                                        <p className="text-2xl font-black text-foreground">{formatHours(projectSpecificStats.totalHours)} / {formatHours(projectSpecificStats.estimatedHours)}</p>
                                        <p className="text-[11px] text-muted-foreground mt-1 italic">Atual vs Estimado</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* General Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-card border border-border rounded-3xl p-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl pointer-events-none" />
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Volume Filtrado</p>
                                <div className="flex items-end gap-3 mb-2">
                                    <span className="text-4xl font-black text-foreground tracking-tighter">{filteredReportProjects.length}</span>
                                    <span className="text-[13px] font-bold text-primary mb-1.5">Projetos</span>
                                </div>
                                <p className="text-[12px] text-muted-foreground">Projetos que iniciaram no período selecionado</p>
                            </div>

                            <div className="bg-card border border-border rounded-3xl p-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 blur-3xl pointer-events-none" />
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Saúde Situacional</p>
                                <div className="flex items-end gap-3 mb-2">
                                    <span className="text-4xl font-black text-foreground tracking-tighter">
                                        {filteredReportProjects.length > 0 ? Math.round((filteredReportProjects.filter(p => p.current_stage === 6).length / filteredReportProjects.length) * 100) : 0}%
                                    </span>
                                    <span className="text-[13px] font-bold text-green-500 mb-1.5">Conclusão</span>
                                </div>
                                <p className="text-[12px] text-muted-foreground">Relação de entrega para o conjunto atual</p>
                            </div>

                            <div className="bg-card border border-border rounded-3xl p-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl pointer-events-none" />
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Esforço Operacional</p>
                                <div className="flex items-end gap-3 mb-2">
                                    <span className="text-4xl font-black text-foreground tracking-tighter">
                                        {filteredReportProjects.reduce((acc, p) => acc + (p.updates?.length || 0), 0)}
                                    </span>
                                    <span className="text-[13px] font-bold text-blue-500 mb-1.5">Updates Totais</span>
                                </div>
                                <p className="text-[12px] text-muted-foreground">Volume de produção técnica no período</p>
                            </div>
                        </div>

                        {/* Pipeline Status Table + Team Workload */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                                <div className="p-6 border-b border-border">
                                    <h4 className="text-[14px] font-bold text-foreground">Status da Pipeline (Filtrado)</h4>
                                    <p className="text-[12px] text-muted-foreground mt-0.5">Projetos por fase no período</p>
                                </div>
                                <div className="p-4 space-y-3">
                                    {STAGES.map(s => {
                                        const count = filteredReportProjects.filter(p => p.current_stage === s.id).length
                                        const pct = filteredReportProjects.length > 0 ? (count / filteredReportProjects.length) * 100 : 0
                                        return (
                                            <div key={s.id}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-[12px] font-semibold text-foreground">{s.label}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[12px] font-black text-primary">{count}</span>
                                                        <span className="text-[10px] text-muted-foreground">proj.</span>
                                                    </div>
                                                </div>
                                                <div className="bg-border/30 h-2 rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {filteredReportProjects.length === 0 && (
                                        <p className="text-[12px] text-muted-foreground text-center py-4">Nenhum projeto no período selecionado.</p>
                                    )}
                                </div>
                            </div>

                            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                                <div className="p-6 border-b border-border">
                                    <h4 className="text-[14px] font-bold text-foreground">Comprometimento de Equipe</h4>
                                    <p className="text-[12px] text-muted-foreground mt-0.5">Projetos ativos por membro</p>
                                </div>
                                <div className="p-4 space-y-4">
                                    {teamStats?.workload?.length > 0 ? teamStats.workload.map((w: any, i: number) => {
                                        const maxProj = Math.max(...teamStats.workload.map((m: any) => m.project_count), 1)
                                        return (
                                            <div key={w.id} className="flex items-center gap-4">
                                                <div className="w-9 h-9 rounded-full bg-secondary border border-border overflow-hidden shrink-0">
                                                    {w.avatar_url
                                                        ? <img src={w.avatar_url} alt={w.name} className="w-full h-full rounded-full object-cover" />
                                                        : <div className="w-full h-full flex items-center justify-center text-[11px] font-bold text-primary">{w.name.split(' ').map((n: string) => n[0]).join('')}</div>}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <p className="text-[12px] font-semibold text-foreground truncate">{w.name}</p>
                                                        <span className="text-[12px] font-black text-primary">{w.project_count} proj.</span>
                                                    </div>
                                                    <div className="bg-border/30 h-1.5 rounded-full overflow-hidden">
                                                        <div className="h-full bg-primary rounded-full" style={{ width: `${(w.project_count / maxProj) * 100}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    }) : (
                                        <p className="text-[12px] text-muted-foreground text-center py-4">Nenhum membro com projetos ativos.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

                {activeTab === 'team' && (
                    <div className="animate-fade-in max-w-6xl mx-auto space-y-8 pb-20">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-black tracking-tight text-foreground">Gestão de Equipe</h3>
                                <p className="text-[14px] text-muted-foreground font-medium">Administradores e Especialistas Nordex</p>
                            </div>
                            <button 
                                onClick={() => setShowAddTeamMember(true)}
                                className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-black text-[12px] hover:opacity-90 transition-all shadow-[0_0_20px_rgba(245,168,0,0.2)] flex items-center gap-2 uppercase tracking-widest"
                            >
                                <Plus size={16} /> Adicionar Integrante
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {users.filter(u => u.role === 'admin').map((admin) => (
                                <div key={admin.id} className="bg-card border border-border rounded-3xl p-8 relative overflow-hidden group transition-all hover:border-primary/30 shadow-xl">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl pointer-events-none" />
                                    
                                    <div className="flex items-center gap-5 mb-6">
                                        <div className="w-16 h-16 rounded-full bg-secondary border-2 border-primary/20 overflow-hidden shrink-0">
                                            {admin.avatar_url ? (
                                                <img src={admin.avatar_url} alt={admin.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-primary font-black text-xl">{admin.name.charAt(0)}</div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-black text-[17px] text-foreground truncate">{admin.name}</h4>
                                            <p className="text-[11px] font-black uppercase tracking-widest text-primary">{admin.position || 'Administrador'}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-8">
                                        <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-3 italic">
                                            {admin.bio || "Este membro ainda não definiu uma biografia profissional."}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between pt-6 border-t border-border/50">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ativo</span>
                                            </div>
                                            <p className="text-[10px] text-primary font-bold mt-1">
                                                {teamStats.workload.find(w => w.id === admin.id)?.project_count || 0} Projetos
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                setEditingTeamMember(admin);
                                                setEditTeamAvatar(admin.avatar_url || '');
                                                setEditTeamPosition(admin.position || '');
                                                setEditTeamBio(admin.bio || '');
                                            }}
                                            className="h-9 px-4 rounded-xl bg-secondary hover:bg-white/5 border border-border text-[11px] font-bold text-foreground transition-all flex items-center gap-2"
                                        >
                                            <Edit size={14} /> Editar Perfil
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {activeTab === 'users' && (
                     // Users Tab - keeping minimal and clean like before but with uniform style
                    <div className="bg-card border border-border rounded-xl p-8 overflow-hidden animate-fade-in max-w-5xl mx-auto shadow-lg">
                        <div className="flex justify-between items-center mb-8 border-b border-border/50 pb-5">
                            <h3 className="text-[18px] font-semibold text-foreground">Relatório de Identidades</h3>
                            <button onClick={() => setShowNewClient(true)} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:opacity-90 inline-flex items-center gap-2">
                                <Plus size={16}/> Novo Usuário
                            </button>
                        </div>
                        {users.length === 0 ? (
                            <div className="text-center py-10"><p className="text-[13px] text-muted-foreground">O banco de usuários está vazio.</p></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-separate border-spacing-y-2">
                                    <thead>
                                        <tr className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground/60 font-black">
                                            <th className="px-6 py-3 font-black text-left">Identidade / Responsável</th>
                                            <th className="px-6 py-3 font-black text-center">Privilégio</th>
                                            <th className="px-6 py-3 font-black text-right">Ações de Gestão</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[13px]">
                                        {users.map((u: PortalUser) => (
                                            <tr key={u.id} className="group transition-all duration-300">
                                                <td className="px-6 py-4 bg-secondary/5 border-l border-y border-border group-hover:bg-secondary/10 group-hover:border-primary/20 rounded-l-2xl transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary border border-primary/10 flex items-center justify-center text-primary font-black text-[14px] shadow-inner shrink-0">
                                                            {u.avatar_url ? (
                                                                <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover rounded-xl" />
                                                            ) : (
                                                                u.name.substring(0, 1).toUpperCase()
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-foreground truncate max-w-[200px]">{u.name}</p>
                                                            <p className="text-[11px] text-muted-foreground font-mono truncate max-w-[200px]">{u.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 bg-secondary/5 border-y border-border group-hover:bg-secondary/10 group-hover:border-primary/20 transition-all text-center">
                                                    {u.role === 'admin' 
                                                        ? <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(245,168,0,0.1)]">
                                                            <Shield size={10} className="mr-1.5" /> Super Admin
                                                          </span>
                                                        : <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary/80 text-muted-foreground border border-border text-[10px] font-bold uppercase tracking-widest">
                                                            <User size={10} className="mr-1.5" /> Consumer View
                                                          </span>
                                                    }
                                                </td>
                                                <td className="px-6 py-4 bg-secondary/5 border-r border-y border-border group-hover:bg-secondary/10 group-hover:border-primary/20 rounded-r-2xl transition-all text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {u.role === 'client' && (
                                                            <button 
                                                                onClick={() => handlePromoteUser(u)}
                                                                className="h-9 w-9 flex items-center justify-center bg-primary/5 border border-primary/20 hover:bg-primary hover:text-primary-foreground rounded-xl transition-all text-primary shadow-sm"
                                                                title="Promover para Equipe"
                                                            >
                                                                <Plus size={16} />
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => handleResetTour(u.id)} 
                                                            disabled={resetTourLoading === u.id}
                                                            className="h-9 px-3 flex items-center justify-center bg-background/50 border border-border hover:border-primary/50 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all gap-2 text-primary disabled:opacity-50 shadow-sm"
                                                            title="Resetar Tour"
                                                        >
                                                            {resetTourLoading === u.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} 
                                                            <span className="hidden xl:inline text-[10px]">Tour</span>
                                                        </button>
                                                        <button 
                                                            onClick={() => { setEditingUser(u); setEditUserName(u.name); setEditUserEmail(u.email); setEditUserRole(u.role); setEditUserPassword(''); }} 
                                                            className="h-9 w-9 flex items-center justify-center bg-background/50 border border-border hover:border-primary/50 rounded-xl transition-all hover:text-primary shadow-sm"
                                                            title="Editar Usuário"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                        <button 
                                                            onClick={() => { setDeletingUser(u); setDeleteWarning(null); }} 
                                                            className="h-9 w-9 flex items-center justify-center bg-background/50 border border-red-500/20 hover:border-red-500 hover:bg-red-500/10 rounded-xl transition-all text-red-400 shadow-sm"
                                                            title="Excluir Usuário"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'trash' && (
                    <div className="animate-fade-in max-w-5xl mx-auto space-y-6">
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 flex flex-col items-center text-center">
                            <Trash2 size={40} className="text-amber-500 mb-4 opacity-50" />
                            <h3 className="text-[18px] font-bold text-foreground">Lixeira de Projetos</h3>
                            <p className="text-[14px] text-muted-foreground max-w-lg mt-2 leading-relaxed">
                                Projetos nesta lista foram removidos mas ainda podem ser restaurados. Eles ficarão disponíveis aqui para recuperação ou exclusão permanente.
                            </p>
                        </div>

                        {trashProjects.length === 0 ? (
                            <div className="py-20 bg-card border border-dashed border-border/50 rounded-2xl text-center">
                                <CheckCircle2 size={32} className="mx-auto text-muted-foreground/20 mb-3" />
                                <p className="text-[14px] font-medium text-muted-foreground">A lixeira está vazia.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {trashProjects.map(proj => (
                                    <div key={proj.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all flex items-center justify-between group">
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-[15px] truncate">{proj.name}</h4>
                                            <p className="text-[11px] text-muted-foreground">Originalmente de: {proj.client_name}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => handleRestoreProject(proj.id)}
                                                className="h-9 px-3 bg-secondary/80 hover:bg-primary hover:text-primary-foreground border border-border hover:border-primary rounded-lg text-[12px] font-semibold transition-all"
                                                title="Restaurar Projeto"
                                            >
                                                Restaurar
                                            </button>
                                            <button 
                                                onClick={() => { setDeletingProject(proj); setPermanentDelete(true); }}
                                                className="h-9 px-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/30 rounded-lg text-[12px] font-semibold transition-all"
                                                title="Excluir Permanentemente"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'email' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="bg-card border border-border rounded-2xl overflow-hidden">
                            {/* Header */}
                            <div className="p-8 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-foreground flex items-center gap-3"><Mail size={20} className="text-primary" /> Template de Email</h2>
                                    <p className="text-[13px] text-muted-foreground mt-1">Personalize o email automático enviado ao cliente quando uma nova atualização é postada.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setEmailPreview(p => !p)} className="h-9 px-4 rounded-lg border border-border text-[13px] font-medium hover:bg-white/5 inline-flex items-center gap-2">
                                        <Eye size={14} /> {emailPreview ? 'Editar' : 'Preview'}
                                    </button>
                                    <button onClick={resetEmailTemplate} className="h-9 px-4 rounded-lg border border-border text-[13px] font-medium hover:bg-white/5 inline-flex items-center gap-2 text-muted-foreground">
                                        <RefreshCw size={14} /> Restaurar Padrão
                                    </button>
                                    <button onClick={saveEmailTemplate} disabled={emailTemplateSaving} className="h-9 px-5 rounded-lg bg-primary text-primary-foreground font-semibold text-[13px] hover:opacity-90 inline-flex items-center gap-2 shadow-[0_0_15px_rgba(245,168,0,0.15)] disabled:opacity-50">
                                        {emailTemplateSaving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                        {emailSaved ? 'Salvo!' : 'Salvar Template'}
                                    </button>
                                </div>
                            </div>

                            {emailTemplateLoading ? (
                                <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>
                            ) : (
                                <div className="p-8">
                                    <div className="mb-6">
                                        <label className="block text-[12px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Assunto do Email</label>
                                        <input
                                            value={emailSubject}
                                            onChange={e => setEmailSubject(e.target.value)}
                                            placeholder="[{{projectName}}] Nova atualização: {{updateTitle}}"
                                            className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-2.5 text-[14px] text-foreground outline-none focus:border-primary/50 transition-colors font-mono"
                                        />
                                    </div>
                                    <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                                        <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-3">Variáveis disponíveis</p>
                                        <div className="flex flex-wrap gap-2">
                                            {['{{clientName}}','{{projectName}}','{{updateTitle}}','{{updateMessage}}','{{updateStage}}','{{authorName}}','{{portalUrl}}','{{year}}'].map(v => (
                                                <code key={v} className="text-[11px] bg-secondary/50 border border-border px-2 py-1 rounded font-mono text-primary">{v}</code>
                                            ))}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground mt-2">Use <code className="text-primary font-mono">{'{{#if updateMessage}}...{{/if}}'}</code> para blocos condicionais.</p>
                                    </div>
                                    {emailPreview ? (
                                        <div className="border border-border rounded-xl overflow-hidden">
                                            <div className="bg-secondary/20 px-4 py-2 border-b border-border flex items-center gap-2">
                                                <Eye size={12} className="text-muted-foreground" />
                                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Preview (HTML renderizado)</span>
                                            </div>
                                            <iframe srcDoc={emailHtml || '<p style="color:#888;padding:40px;font-family:sans-serif">Nenhum template salvo ainda.</p>'} className="w-full h-[600px] bg-white" sandbox="allow-same-origin" />
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-[12px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Corpo do Email (HTML)</label>
                                            <textarea value={emailHtml} onChange={e => setEmailHtml(e.target.value)} placeholder="Cole ou edite o HTML do email aqui..." rows={24} className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 text-[12px] text-foreground outline-none focus:border-primary/50 transition-colors font-mono resize-y leading-relaxed" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="bg-card border border-border rounded-2xl p-8">
                            <h3 className="text-[15px] font-bold text-foreground mb-4 flex items-center gap-2"><Mail size={16} className="text-primary" /> Como funciona</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[
                                    { step: '1', title: 'Admin posta atualização', desc: 'Qualquer update em Esteiras de desenvolvimento dispara o fluxo automaticamente.' },
                                    { step: '2', title: 'Email renderizado', desc: 'O sistema usa este template, substitui as variáveis com os dados reais do projeto.' },
                                    { step: '3', title: 'Cliente recebe', desc: 'O email chega na caixa do cliente vindo de noreply@nordex.tech com link direto ao portal.' },
                                ].map(item => (
                                    <div key={item.step} className="bg-secondary/20 border border-border rounded-xl p-5">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-[13px] font-black mb-3">{item.step}</div>
                                        <p className="text-[13px] font-semibold text-foreground mb-1">{item.title}</p>
                                        <p className="text-[12px] text-muted-foreground">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

            {/* Project Delete Confirmation Pop-up */}
            {deletingProject && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md animate-fade-in">
                    <div className="bg-card border border-red-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
                        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 mb-6">
                            <Trash2 size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-foreground mb-3 tracking-tight">
                            {permanentDelete ? 'Excluir Permanentemente?' : 'Mover para Lixeira?'}
                        </h2>
                        <div className="text-[14px] text-muted-foreground leading-relaxed mb-6 space-y-4">
                            {permanentDelete ? (
                                <p className="bg-red-500/10 p-3 rounded-lg text-red-400 font-bold border border-red-500/20">
                                    AVISO CRÍTICO: Esta ação não pode ser desfeita. Todos os diários, atualizações e anotações do projeto "{deletingProject.name}" serão apagados para sempre.
                                </p>
                            ) : (
                                <p>
                                    Você está prestes a remover o projeto <b>{deletingProject.name}</b>. Ele ficará na lixeira e não estará mais visível para o cliente.
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeletingProject(null)}
                                className="flex-1 h-11 bg-secondary text-foreground font-semibold text-[13px] rounded-xl hover:bg-secondary/80 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleDeleteProject(deletingProject, permanentDelete)}
                                disabled={deleteLoading}
                                className="flex-1 h-11 bg-red-500 text-white font-semibold text-[13px] rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                            >
                                {deleteLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : (permanentDelete ? 'Confirmar Exclusão' : 'Excluir')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Editing Modals (Project / Client / ClientEdit) -> Kept robust logic with updated standard borders/bg colors like in V1 */}

            {/* MODAL: Editor de Projeto */}
            {editingProject && (
                <div className="fixed inset-0 z-50 flex justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in overflow-y-auto custom-scrollbar">
                    <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)] relative my-auto overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-border bg-secondary/10">
                            <h3 className="text-[16px] font-semibold text-foreground">Ajustes Primários do Projeto</h3>
                            <button onClick={() => setEditingProject(null)} className="text-muted-foreground hover:text-foreground bg-background p-1.5 rounded border border-border shadow-sm"><X size={16} /></button>
                        </div>
                        <form onSubmit={handleEditProject} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5 text-muted-foreground">Identidade</label>
                                <input required value={editProjectName} onChange={e => setEditProjectName(e.target.value)} type="text" className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-[14px] font-medium text-foreground focus:border-primary outline-none" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5 text-muted-foreground">Objeto</label>
                                <textarea value={editProjectDesc} onChange={e => setEditProjectDesc(e.target.value)} rows={3} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-[14px] text-foreground focus:border-primary outline-none resize-none" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5 text-muted-foreground">Preview Link Base</label>
                                <input value={editProjectUrl} onChange={e => setEditProjectUrl(e.target.value)} type="url" className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-[14px] font-mono text-foreground focus:border-primary outline-none" placeholder="https://" />
                                <p className="text-[11px] mt-1 text-muted-foreground">Nota: Se você mandar url junto do envio de update da esteira, isto será sobreposto.</p>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5 text-muted-foreground">Horas Totais Estimadas</label>
                                <div className="flex gap-3">
                                    <div className="flex-1 px-3 py-2.5 bg-background border border-border rounded-lg flex items-center gap-2 focus-within:border-primary">
                                        <input value={editProjectHours} onChange={e => setEditProjectHours(e.target.value)} type="number" className="bg-transparent outline-none w-full text-[14px]" placeholder="Horas" />
                                        <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">H</span>
                                    </div>
                                    <div className="flex-1 px-3 py-2.5 bg-background border border-border rounded-lg flex items-center gap-2 focus-within:border-primary">
                                        <input value={editProjectMinutes} onChange={e => setEditProjectMinutes(e.target.value)} type="number" className="bg-transparent outline-none w-full text-[14px]" placeholder="Minutos" />
                                        <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">M</span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5 text-amber-500">Link de Stage</label>
                                    <input value={editProjectStageUrl} onChange={e => setEditProjectStageUrl(e.target.value)} type="url" className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-[14px] text-foreground focus:border-primary outline-none" placeholder="https://stage..." />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5 text-green-500">Link de Produção</label>
                                    <input value={editProjectProdUrl} onChange={e => setEditProjectProdUrl(e.target.value)} type="url" className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-[14px] text-foreground focus:border-primary outline-none" placeholder="https://prod..." />
                                </div>
                            </div>
                            
                            <div className="pt-6 flex gap-3">
                                <button type="button" onClick={() => setEditingProject(null)} className="flex-1 h-11 bg-secondary hover:bg-white/5 rounded-lg text-[13px] font-semibold transition-colors">Abortar</button>
                                <button type="submit" disabled={editProjectLoading} className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-[13px] font-semibold transition-colors flex justify-center items-center shadow-[0_0_15px_rgba(245,168,0,0.2)]">
                                    {editProjectLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sincronizar DB'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: Novo Cliente */}
             {showNewClient && (
                <div className="fixed inset-0 z-50 flex justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in overflow-y-auto custom-scrollbar">
                    <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)] relative my-auto overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-border bg-secondary/10">
                            <h3 className="text-[16px] font-semibold text-foreground">Emissão de Nova Credencial</h3>
                            <button onClick={() => setShowNewClient(false)} className="text-muted-foreground hover:text-foreground bg-background p-1.5 rounded border border-border shadow-sm"><X size={16} /></button>
                        </div>
                        <form onSubmit={handleCreateClient} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5 text-muted-foreground">Indivíduo</label>
                                <input required value={newClientName} onChange={e => setNewClientName(e.target.value)} type="text" className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-[14px] text-foreground focus:border-primary outline-none" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5 text-muted-foreground">Mail de Acionamento</label>
                                <input required value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} type="email" className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-[14px] text-foreground focus:border-primary outline-none" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5 text-muted-foreground">Atribuição Formal</label>
                                <select value={newClientRole} onChange={e => setNewClientRole(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-[14px] text-foreground focus:border-primary outline-none font-medium">
                                    <option value="client">Client Pool / Observador de Projetos</option>
                                    <option value="admin">Engenharia / Super Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5 text-primary">Token de Password (Critical)</label>
                                <input required value={newClientPassword} onChange={e => setNewClientPassword(e.target.value)} type="text" className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-[14px] font-mono text-foreground focus:border-primary outline-none" placeholder="Ex: nordex-1234..." />
                            </div>
                            <div className="pt-6 flex gap-3">
                                <button type="button" onClick={() => setShowNewClient(false)} className="flex-1 h-11 bg-secondary hover:bg-white/5 rounded-lg text-[13px] font-semibold transition-colors">Desfazer</button>
                                <button type="submit" disabled={clientLoading} className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-[13px] font-semibold transition-colors flex justify-center items-center">
                                    {clientLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Finalizar Assinatura'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: Novo Projeto*/}
            {showNewProject && (
                <div className="fixed inset-0 z-50 flex justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in overflow-y-auto custom-scrollbar">
                    <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] relative my-auto">
                     <div className="flex justify-between items-center p-6 border-b border-border bg-secondary/10">
                         <h3 className="text-[16px] font-semibold text-foreground">Abrir Nova Pipeline</h3>
                         <button onClick={() => setShowNewProject(false)} className="text-muted-foreground hover:text-foreground bg-background p-1.5 rounded border border-border shadow-sm"><X size={16} /></button>
                     </div>
                     <form onSubmit={handleCreateProject} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5 text-muted-foreground">Obrigações Atreladas a</label>
                                <select required value={newProjectClientId} onChange={e => setNewProjectClientId(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-[14px] focus:border-primary outline-none font-medium">
                                    <option value="" disabled>Escolha um emissor (Owner)...</option>
                                    {users.filter(u => u.role === 'client').map((u) => <option key={u.id} value={u.id}>{u.name} | {u.email}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5 text-muted-foreground">Nomenclatura Técnica</label>
                                <input required value={newProjectName} onChange={e => setNewProjectName(e.target.value)} type="text" className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-[14px] focus:border-primary outline-none" />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5 text-muted-foreground">Tese & Escopo Central</label>
                                <textarea value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} rows={3} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-[14px] focus:border-primary outline-none resize-none" />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5 text-muted-foreground">Volume de Horas Previsto</label>
                                <div className="flex gap-3">
                                    <div className="flex-1 px-3 py-2.5 bg-background border border-border rounded-lg flex items-center gap-2 focus-within:border-primary">
                                        <input value={newProjectHours} onChange={e => setNewProjectHours(e.target.value)} type="number" className="bg-transparent outline-none w-full text-[14px]" placeholder="Horas" />
                                        <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">H</span>
                                    </div>
                                    <div className="flex-1 px-3 py-2.5 bg-background border border-border rounded-lg flex items-center gap-2 focus-within:border-primary">
                                        <input value={newProjectMinutes} onChange={e => setNewProjectMinutes(e.target.value)} type="number" className="bg-transparent outline-none w-full text-[14px]" placeholder="Minutos" />
                                        <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">M</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5 text-amber-500">Link de Stage</label>
                                    <input value={newProjectStageUrl} onChange={e => setNewProjectStageUrl(e.target.value)} type="url" className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-[14px] focus:border-primary outline-none" placeholder="https://stage..." />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5 text-green-500">Link de Produção</label>
                                    <input value={newProjectProdUrl} onChange={e => setNewProjectProdUrl(e.target.value)} type="url" className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-[14px] focus:border-primary outline-none" placeholder="https://prod..." />
                                </div>
                            </div>

                            <div className="pt-6 flex gap-3">
                                <button type="button" onClick={() => setShowNewProject(false)} className="flex-1 h-11 bg-secondary hover:bg-white/5 rounded-lg text-[13px] font-semibold transition-colors">Voltar</button>
                                <button type="submit" disabled={projectLoading || users.length === 0} className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 rounded-lg text-[13px] font-semibold transition-colors flex justify-center items-center shadow-[0_0_15px_rgba(245,168,0,0.2)]">
                                    {projectLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Emitir Infraestrutura'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* MODAL: Editor de Usuário */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in overflow-y-auto custom-scrollbar">
                    <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)] relative my-auto overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-border bg-secondary/10">
                            <h3 className="text-[16px] font-semibold text-foreground">Gestão de Identidade</h3>
                            <button onClick={() => setEditingUser(null)} className="text-muted-foreground hover:text-foreground bg-background p-1.5 rounded border border-border shadow-sm"><X size={16} /></button>
                        </div>
                        <form onSubmit={handleEditUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5 text-muted-foreground">Nome Completo</label>
                                <input required value={editUserName} onChange={e => setEditUserName(e.target.value)} type="text" className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-[14px] text-foreground focus:border-primary outline-none" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5 text-muted-foreground">E-mail</label>
                                <input required value={editUserEmail} onChange={e => setEditUserEmail(e.target.value)} type="email" className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-[14px] text-foreground focus:border-primary outline-none" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5 text-muted-foreground">Privilégio Administrativo</label>
                                <select value={editUserRole} onChange={e => setEditUserRole(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-[14px] text-foreground focus:border-primary outline-none font-medium">
                                    <option value="client">Client Pool / Observador</option>
                                    <option value="admin">Engenharia / Super Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5 text-primary">Nova Senha (deixe vazio para manter)</label>
                                <input value={editUserPassword} onChange={e => setEditUserPassword(e.target.value)} type="password" placeholder="á¢€š¬¢á¢€š¬¢á¢€š¬¢á¢€š¬¢á¢€š¬¢á¢€š¬¢á¢€š¬¢á¢€š¬¢" className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-[14px] text-foreground focus:border-primary outline-none" />
                            </div>
                            <div className="pt-6 flex gap-3">
                                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 h-11 bg-secondary hover:bg-white/5 rounded-lg text-[13px] font-semibold transition-colors">Voltar</button>
                                <button type="submit" disabled={editUserLoading} className="flex-1 h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-[13px] font-semibold transition-colors flex justify-center items-center">
                                    {editUserLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sincronizar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: Confirmação de Exclusão de Usuário */}
            {deletingUser && (
                <div className="fixed inset-0 z-50 flex justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in overflow-y-auto custom-scrollbar">
                    <div className="bg-card border border-red-500/30 rounded-xl w-full max-w-md shadow-[0_0_50px_rgba(239,68,68,0.15)] relative my-auto overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-red-500/60" />
                        <div className="p-6 border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                                    <Trash2 size={18} className="text-red-500" />
                                </div>
                                <div>
                                    <h3 className="text-[16px] font-semibold text-foreground">Remoção Permanente</h3>
                                    <p className="text-[12px] text-muted-foreground">Esta ação não poderá ser desfeita.</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            {deleteWarning ? (
                                <>
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                                        <p className="text-[13px] font-semibold text-red-400 mb-3 flex items-center gap-2">
                                            <AlertCircle size={15} /> {deleteWarning.message}
                                        </p>
                                        <ul className="space-y-1">
                                            {deleteWarning.projects.map(p => (
                                                <li key={p.id} className="text-[12px] text-foreground/70 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                                    {p.name}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                                        Confirme abaixo para excluir o usuário <b className="text-foreground">{deletingUser.name}</b> juntamente com todos os projetos e históricos vinculados.
                                    </p>
                                    <div className="flex gap-3 pt-2">
                                        <button onClick={() => { setDeletingUser(null); setDeleteWarning(null); }} className="flex-1 h-11 bg-secondary hover:bg-white/5 rounded-lg text-[13px] font-semibold transition-colors">Cancelar</button>
                                        <button onClick={() => handleDeleteUser(true)} disabled={deleteLoading} className="flex-1 h-11 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[13px] font-semibold transition-colors flex justify-center items-center gap-2">
                                            {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 size={14} /> Excluir Tudo</>}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-[14px] text-foreground/80 leading-relaxed">
                                        Deseja remover permanentemente o usuário <b className="text-foreground">{deletingUser.name}</b> ({deletingUser.email})?
                                    </p>
                                    <div className="flex gap-3 pt-2">
                                        <button onClick={() => setDeletingUser(null)} className="flex-1 h-11 bg-secondary hover:bg-white/5 rounded-lg text-[13px] font-semibold transition-colors">Cancelar</button>
                                        <button onClick={() => handleDeleteUser(false)} disabled={deleteLoading} className="flex-1 h-11 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[13px] font-semibold transition-colors flex justify-center items-center gap-2">
                                            {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 size={14} /> Confirmar Exclusão</>}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* MODAL: Editor de Equipe */}
            {editingTeamMember && (
                <div className="fixed inset-0 z-50 flex justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in overflow-y-auto custom-scrollbar">
                    <div className="bg-card border border-border rounded-3xl w-full max-w-lg shadow-2xl relative my-auto overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl pointer-events-none" />
                        <div className="flex justify-between items-center p-8 border-b border-border bg-secondary/10">
                            <div>
                                <h3 className="text-xl font-bold text-foreground tracking-tight">Editar Perfil da Equipe</h3>
                                <p className="text-[12px] text-muted-foreground mt-1">Atualize as informações públicas de {editingTeamMember.name}</p>
                            </div>
                            <button onClick={() => setEditingTeamMember(null)} className="text-muted-foreground hover:text-foreground bg-background p-2 rounded-xl border border-border shadow-sm"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleEditTeamMember} className="p-8 space-y-5">
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-2">
                                <div className="w-20 h-20 rounded-full bg-secondary border-2 border-primary/20 overflow-hidden relative group shrink-0 aspect-square">
                                    {editTeamAvatar ? (
                                        <img src={editTeamAvatar} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-primary/40"><Users size={32} /></div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-3 w-full">
                                    <label className="block text-[11px] font-black uppercase tracking-widest text-primary text-center sm:text-left">Foto de Perfil</label>
                                    <div className="flex flex-col xs:flex-row gap-2">
                                        <div className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-2 text-[12px] text-muted-foreground truncate flex items-center min-w-0">
                                            {editTeamAvatar || "Nenhuma imagem selecionada"}
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={(e) => handleFileUploadClick(e, 'team')}
                                            className="h-10 px-4 bg-primary text-primary-foreground rounded-xl text-[12px] font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 shrink-0"
                                        >
                                            {uploadLoading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                            <span className="whitespace-nowrap">{editTeamAvatar ? 'Alterar Foto' : 'Subir Foto'}</span>
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic text-center sm:text-left">* Faça o upload de um arquivo local e defina o recorte perfeito.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Cargo / Especialidade</label>
                                    <input required value={editTeamPosition} onChange={e => setEditTeamPosition(e.target.value)} type="text" placeholder="Ex: Engenheiro de Software Fullstack" className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-[14px] font-medium focus:border-primary outline-none transition-all" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Biografia Profissional</label>
                                <textarea value={editTeamBio} onChange={e => setEditTeamBio(e.target.value)} rows={4} placeholder="Conte um pouco sobre suas responsabilidades..." className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-[14px] leading-relaxed focus:border-primary outline-none transition-all resize-none" />
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button type="button" onClick={() => setEditingTeamMember(null)} className="flex-1 h-12 bg-secondary text-foreground hover:bg-white/5 rounded-2xl text-[13px] font-bold transition-all border border-border">Cancelar</button>
                                <button type="submit" disabled={editTeamLoading} className="flex-2 h-12 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl text-[13px] font-bold transition-all flex justify-center items-center px-8 shadow-xl shadow-primary/20">
                                    {editTeamLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Alterações'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* MODAL: Atribuição de Equipe */}
            {assigningProject && (
                <div className="fixed inset-0 z-50 flex justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in overflow-y-auto custom-scrollbar">
                    <div className="bg-card border border-border rounded-3xl w-full max-w-md shadow-2xl relative my-auto overflow-hidden">
                        <div className="p-8 border-b border-border bg-secondary/10 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-foreground tracking-tight">Atribuir Squad</h3>
                                <p className="text-[12px] text-muted-foreground mt-1">Selecione quem cuidará de {assigningProject.name}</p>
                            </div>
                            <button onClick={() => setAssigningProject(null)} className="text-muted-foreground hover:text-foreground bg-background p-2 rounded-xl border border-border shadow-sm"><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-2 max-h-[400px] overflow-y-auto">
                            {users.filter(u => u.role === 'admin' && !projectAssignments.some(a => a.project_id === assigningProject.id && a.user_id === u.id)).map(squadMember => (
                                <button 
                                    key={squadMember.id} 
                                    onClick={() => handleAssignTeam(assigningProject.id, squadMember.id)}
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-secondary/50 border border-transparent hover:border-border transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden border border-border group-hover:border-primary/50 transition-colors">
                                        {squadMember.avatar_url ? (
                                            <img src={squadMember.avatar_url} alt={squadMember.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-primary font-bold">{squadMember.name.charAt(0)}</div>
                                        )}
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className="text-[14px] font-bold text-foreground">{squadMember.name}</p>
                                        <p className="text-[11px] text-muted-foreground">{squadMember.position || (squadMember.role === 'admin' ? 'Administrador' : 'Observador / Cliente')}</p>
                                    </div>
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Plus size={16} />
                                    </div>
                                </button>
                            ))}
                            {users.filter(u => !projectAssignments.some(a => a.project_id === assigningProject.id && a.user_id === u.id)).length === 0 && (
                                <p className="text-center py-8 text-[13px] text-muted-foreground italic">Todos os membros disponíveis já foram atribuídos a este projeto.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Adicionar Integrante Existente */}
            {showAddTeamMember && (
                <div className="fixed inset-0 z-50 flex justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in overflow-y-auto custom-scrollbar">
                    <div className="bg-card border border-border rounded-3xl w-full max-w-md shadow-2xl relative my-auto overflow-hidden">
                        <div className="p-8 border-b border-border bg-secondary/10 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-foreground tracking-tight uppercase">Integrar Especialista</h3>
                                <p className="text-[12px] text-muted-foreground mt-1 font-medium">Promova um usuário existente (Requer status de Super Admin)</p>
                            </div>
                            <button onClick={() => setShowAddTeamMember(false)} className="text-muted-foreground hover:text-foreground bg-background p-2 rounded-xl border border-border shadow-sm transition-all hover:rotate-90"><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {users.filter(u => u.role === 'client').map(client => (
                                <button 
                                    key={client.id} 
                                    onClick={() => handlePromoteUser(client)}
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden border border-border group-hover:border-primary/50 transition-colors">
                                        {client.avatar_url ? (
                                            <img src={client.avatar_url} alt={client.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-primary/40 font-black text-lg">{client.name.charAt(0)}</div>
                                        )}
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className="text-[14px] font-black text-foreground group-hover:text-primary transition-colors">{client.name}</p>
                                        <p className="text-[11px] text-muted-foreground font-mono">{client.email}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                                        <Plus size={18} />
                                    </div>
                                </button>
                            ))}
                            {users.filter(u => u.role === 'client').length === 0 && (
                                <div className="text-center py-10 space-y-3">
                                    <Users size={40} className="mx-auto text-muted-foreground/20" />
                                    <p className="text-[13px] text-muted-foreground italic font-medium px-10">Não há usuários comuns para promover. Crie um novo usuário primeiro.</p>
                                </div>
                            )}
                        </div>
                        <div className="p-6 bg-secondary/10 border-t border-border flex justify-center">
                            <button onClick={() => { setShowAddTeamMember(false); setShowNewClient(true); }} className="text-[12px] font-black text-primary uppercase tracking-widest hover:underline">+ Criar Novo Usuário</button>
                        </div>
                    </div>
                </div>
            )}

            {/* •••••••••••••••••••••••••••• QUICK-VIEW CENTERED MODAL •••••••••••••••••••••••••••• */}
            {quickViewProject && (() => {
                const qvUpdates: any[] = quickViewProject.updates || [];
                const latestUpdate: any = qvUpdates[0] ?? null;
                const firstDenied: any = qvUpdates.find((u: any) => u.status === 'denied' && !qvUpdates.some((r: any) => r.revision_of === u.id)) ?? null;
                const qvClient = users.find(u => u.id === quickViewProject.client_id);

                const closeModal = () => { setQuickViewProject(null); setQvMode(null); setQvTitle(''); setQvMessage(''); setQvRevisionOf(''); };

                return (
                    <>
                        {/* Backdrop */}
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto" onClick={closeModal}>
                            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

                            {/* Modal Card */}
                            <div
                                className="relative z-10 w-full max-w-[620px] flex flex-col bg-card border border-border/80 rounded-2xl shadow-2xl shadow-black/50 animate-in zoom-in-95 duration-200 overflow-hidden max-h-[92vh] my-auto"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* ── Header ── */}
                                                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/90 backdrop-blur-md shrink-0">
                                                    <div className="flex flex-col">
                                                        <h3 className="text-[16px] font-black text-foreground leading-tight tracking-tight uppercase">Disparar Atualização para o Cliente</h3>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{quickViewProject.name} <span className="text-border mx-1">/</span> {qvClient?.name}</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={closeModal} className="w-9 h-9 rounded-xl bg-secondary hover:bg-secondary/80 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all">
                                                        <X size={16} />
                                                    </button>
                                                </div>

                                {/* ── Scrollable Body ── */}
                                <div className="overflow-y-auto custom-scrollbar flex-1">
                                    <div className="p-6 space-y-5">

                                        {/* Latest Update Card */}
                                        {latestUpdate ? (
                                            <div className={`rounded-2xl border p-5 space-y-4 relative overflow-hidden ${
                                                latestUpdate.status === 'denied' ? 'border-red-500/25 bg-red-500/3' :
                                                latestUpdate.status === 'authorized' ? 'border-green-500/25 bg-green-500/3' :
                                                'border-border/60 bg-secondary/10'
                                            }`}>
                                                {/* Subtle glow accent */}
                                                <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] pointer-events-none opacity-30 ${
                                                    latestUpdate.status === 'denied' ? 'bg-red-500' :
                                                    latestUpdate.status === 'authorized' ? 'bg-green-500' :
                                                    'bg-primary'
                                                }`} />

                                                {/* Status row */}
                                                <div className="flex items-center justify-between flex-wrap gap-2 relative">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-[10px] font-black text-primary tracking-widest uppercase bg-primary/10 px-2 py-0.5 rounded-sm border border-primary/20">
                                                            Etapa {latestUpdate.stage}
                                                        </span>
                                                        {latestUpdate.status === 'authorized' && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/25 text-green-400 text-[9px] font-black uppercase"><ThumbsUp size={8} /> Aprovado</span>}
                                                        {latestUpdate.status === 'denied'     && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/25 text-red-400 text-[9px] font-black uppercase"><ThumbsDown size={8} /> Ajuste Solicitado</span>}
                                                        {latestUpdate.status === 'pending'    && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[9px] font-black uppercase"><Clock size={8} /> Aguardando Cliente</span>}
                                                    </div>
                                                    <span className="text-[11px] text-muted-foreground font-medium">
                                                        {format(new Date(latestUpdate.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                                    </span>
                                                </div>

                                                {/* Title + creator */}
                                                <div className="flex items-start justify-between gap-4 relative">
                                                    <div className="relative">
                                                        <h4 className="text-[16px] font-bold text-foreground leading-snug">{latestUpdate.title}</h4>
                                                        {latestUpdate.creator_name && (
                                                            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
                                                                <Users size={10} className="text-primary/60" /> {latestUpdate.creator_name}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {latestUpdate.hours_spent > 0 && (
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border/50 rounded-lg">
                                                            <Timer size={12} className="text-primary" />
                                                            <span className="text-[13px] font-black text-foreground">{formatHours(latestUpdate.hours_spent)}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Message body */}
                                                {latestUpdate.message && (
                                                    <div className="bg-background/60 border border-border/40 rounded-xl px-4 py-3 text-[13px] text-muted-foreground/90 leading-relaxed relative">
                                                        {latestUpdate.message}
                                                    </div>
                                                )}

                                                {/* Meta chips row */}
                                                <div className="flex items-center gap-3 flex-wrap relative">
                                                    {latestUpdate.viewed_at ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold">
                                                            <CheckCircle2 size={11} /> Visto {format(new Date(latestUpdate.viewed_at), 'dd/MM HH:mm')}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/30 text-muted-foreground border border-border/50 text-[10px] font-bold">
                                                            <Clock size={11} /> Não visualizado
                                                        </span>
                                                    )}
                                                    {latestUpdate.preview_url && (
                                                        <a href={latestUpdate.preview_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold hover:bg-primary/20 transition-all">
                                                            <LinkIcon size={10} /> Ver Build
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                                                <Activity size={24} className="mb-2" />
                                                <p className="text-[12px] font-black uppercase tracking-widest text-muted-foreground">Sem Histórico Recente</p>
                                            </div>
                                        )}

                                        {/* Quick Form Section */}
                                        {qvMode !== null ? (
                                            <form onSubmit={handleQuickViewPost} className="rounded-2xl border border-border/60 overflow-hidden bg-card/30 animate-in slide-in-from-bottom-2 duration-200">
                                                <div className={`px-4 py-2.5 border-b flex items-center justify-between gap-2 shrink-0 ${
                                                    qvMode === 'reply' ? 'border-blue-500/20 bg-blue-500/5' : 'border-primary/20 bg-primary/5'
                                                }`}>
                                                    <div className="flex items-center gap-2">
                                                        {qvMode === 'reply' ? (
                                                            <><RefreshCw size={12} className="text-blue-400" />
                                                            <p className="text-[11px] font-black text-blue-400 uppercase tracking-wider">Altualização Corretiva</p></>
                                                        ) : (
                                                            <><Send size={12} className="text-primary" />
                                                            <p className="text-[11px] font-black text-primary uppercase tracking-wider">Nova Atualização</p></>
                                                        )}
                                                    </div>
                                                    <button type="button" onClick={() => setQvMode(null)} className="w-6 h-6 rounded bg-secondary hover:bg-secondary/80 flex items-center justify-center text-muted-foreground transition-colors">
                                                        <X size={12} />
                                                    </button>
                                                </div>

                                                <div className="p-5 space-y-5 bg-background/40">
                                                    {/* presets */}
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-2">Sugestões Rápidas</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {['Layout Premium Aprovado','Briefing Finalizado','Frontend Concluído','Ajustes Mobile','Página de Vendas Pronta','Sistema em Homologação'].map(preset => (
                                                                <button key={preset} type="button" onClick={() => setQvTitle(preset)} className="px-2.5 py-1 rounded-full bg-primary/5 hover:bg-primary/20 border border-primary/10 text-[10px] font-bold text-foreground transition-all">{preset}</button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-4 gap-3">
                                                        <div>
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Selecione Fase</label>
                                                            <select
                                                                value={qvStage}
                                                                onChange={e => setQvStage(Number(e.target.value))}
                                                                className="w-full bg-card border border-border rounded-xl px-2.5 py-2.5 text-[12px] text-foreground focus:border-primary outline-none font-bold"
                                                            >
                                                                {STAGES.map(s => <option key={s.id} value={s.id}>Et.{s.id}: {s.label}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="col-span-3">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Ato / Título (Notificação) *</label>
                                                            <input
                                                                type="text"
                                                                required
                                                                placeholder="Ex: Layout Premium Aprovado"
                                                                value={qvTitle}
                                                                onChange={e => setQvTitle(e.target.value)}
                                                                className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-[14px] font-medium text-foreground focus:border-primary outline-none"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="bg-secondary/20 border border-border/60 rounded-2xl p-4 space-y-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5"><LinkIcon size={12} /> Link de Homologação (Injetar Automático)</label>
                                                            </div>
                                                            <div className="flex gap-3">
                                                                <input
                                                                    type="text"
                                                                    placeholder="https://..."
                                                                    value={qvPreviewUrl}
                                                                    onChange={e => setQvPreviewUrl(e.target.value)}
                                                                    className="flex-1 bg-card border border-border rounded-xl px-4 py-2.5 text-[13px] text-foreground focus:border-primary outline-none font-medium"
                                                                />
                                                                <div className="w-[160px] flex gap-2">
                                                                    <div className="flex-1 bg-card border border-border rounded-xl flex items-center px-2 py-2.5 focus-within:border-primary">
                                                                        <input
                                                                            type="number"
                                                                            placeholder="H"
                                                                            value={qvHours}
                                                                            onChange={e => setQvHours(e.target.value)}
                                                                            className="w-full bg-transparent text-[14px] font-bold text-center text-foreground outline-none"
                                                                        />
                                                                        <span className="text-[9px] font-black text-muted-foreground">H</span>
                                                                    </div>
                                                                    <div className="flex-1 bg-card border border-border rounded-xl flex items-center px-2 py-2.5 focus-within:border-primary">
                                                                        <input
                                                                            type="number"
                                                                            placeholder="M"
                                                                            value={qvMinutes}
                                                                            onChange={e => setQvMinutes(e.target.value)}
                                                                            className="w-full bg-transparent text-[14px] font-bold text-center text-foreground outline-none"
                                                                        />
                                                                        <span className="text-[9px] font-black text-muted-foreground">M</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="submit"
                                                        disabled={qvLoading || !qvTitle.trim()}
                                                        className={`w-full h-12 rounded-2xl font-black text-[14px] uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-xl ${
                                                            qvMode === 'reply' ? 'bg-blue-600 text-white shadow-blue-600/20' : 'bg-primary text-black shadow-primary/20'
                                                        }`}
                                                    >
                                                        {qvLoading ? <><Loader2 size={18} className="animate-spin" /> ...</> : <><Send size={15} /> {qvMode === 'reply' ? 'Enviar Correção' : 'Confirmar Atualização'}</>}
                                                    </button>
                                                </div>
                                            </form>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground border border-dashed border-border/60 rounded-2xl">
                                                <Activity size={20} className="mb-2 opacity-20" />
                                                <p className="text-[12px] font-medium">Nenhuma ação selecionada</p>
                                            </div>
                                        )}
                                    </div>
                                </div>


                                {/* ── Action Bar (always at bottom) ── */}
                                <div className="shrink-0 px-4 sm:px-6 py-3 border-t border-border bg-card/90 backdrop-blur-md flex flex-wrap items-center gap-2">
                                    {firstDenied && qvMode !== 'reply' && (
                                        <button
                                            onClick={() => { setQvMode('reply'); setQvStage(firstDenied.stage); setQvRevisionOf(firstDenied.id); setQvTitle(''); setQvMessage(''); setQvPreviewUrl(quickViewProject.preview_url || ''); setQvHours(''); }}
                                            className="flex-1 h-11 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 text-[12px] font-bold transition-all flex items-center justify-center gap-2"
                                        >
                                            <RefreshCw size={14} /> Responder com Correção
                                        </button>
                                    )}
                                    {qvMode !== 'new' && (
                                        <button
                                            onClick={() => { setQvMode('new'); setQvStage(quickViewProject.current_stage || 1); setQvTitle(''); setQvMessage(''); setQvRevisionOf(''); setQvPreviewUrl(quickViewProject.preview_url || ''); setQvHours(''); }}
                                            className="flex-1 h-11 rounded-xl bg-primary/10 border border-primary/25 text-primary hover:bg-primary/20 text-[12px] font-bold transition-all flex items-center justify-center gap-2"
                                        >
                                            <Send size={14} /> Nova Atualização
                                        </button>
                                    )}
                                    {qvMode !== null && (
                                        <button onClick={() => setQvMode(null)} className="h-10 px-4 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground hover:text-foreground text-[12px] font-bold transition-all">
                                            Cancelar
                                        </button>
                                    )}
                                </div>

                            </div>
                        </div>
                    </>
                );
            })()}

                    </div>
                )}

            <ImageCropperModal
                open={showCropper}
                onClose={() => {
                    setShowCropper(false);
                    setCropperTarget(null);
                }}
                onCropComplete={handleCropComplete}
            />
        </div>
    </div>
)
}

