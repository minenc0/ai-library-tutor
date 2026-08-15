'use client'

import { useState, useEffect, useRef, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'

import { BookOpen, LayoutDashboard, Library, MessageSquare, Search, FileText, HelpCircle, Settings, Upload, Plus, Send, Trash2, LogOut, Menu, Loader2, Moon, Sun, ChevronDown, ChevronRight, ArrowLeft, X, Sparkles, RefreshCw, Bot, User } from 'lucide-react'

type Page = 'dashboard' | 'library' | 'chat' | 'search' | 'summary' | 'quiz' | 'settings'

interface UserInfo { id: string; username: string; role: string }
interface Book { id: string; title: string; author: string | null; filename: string; fileSize: number; fileType: string; totalPages: number; status: string; errorMessage: string | null; userId: string; createdAt: string; updatedAt: string; _count: { documents: number; chats: number } }
interface ChatItem { id: string; title: string; createdAt: string; _count?: { messages: number } }
interface Msg { id: string; role: string; content: string; references: string | null; createdAt: string }
interface Ref { bookTitle: string; page: number; content: string }

const NAV = [
  { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'library' as Page, label: 'Perpustakaan', icon: Library },
  { id: 'chat' as Page, label: 'AI Chat', icon: MessageSquare },
  { id: 'search' as Page, label: 'Pencarian', icon: Search },
  { id: 'summary' as Page, label: 'Ringkasan', icon: FileText },
  { id: 'quiz' as Page, label: 'Pembuat Soal', icon: HelpCircle },
  { id: 'settings' as Page, label: 'Pengaturan', icon: Settings },
]

const activityIcons: Record<string, typeof Upload> = { upload: Upload, chat: MessageSquare, search: Search, summary: FileText, quiz: HelpCircle, delete: Trash2 }

export default function AILibraryTutor() {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [initLoad, setInitLoad] = useState(true)
  const [loginU, setLoginU] = useState('')
  const [loginP, setLoginP] = useState('')
  const [loginLoad, setLoginLoad] = useState(false)
  const [page, setPage] = useState<Page>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [books, setBooks] = useState<Book[]>([])
  const [booksLoad, setBooksLoad] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [upTitle, setUpTitle] = useState('')
  const [upAuthor, setUpAuthor] = useState('')
  const [upFile, setUpFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [libSearch, setLibSearch] = useState('')
  const [chats, setChats] = useState<ChatItem[]>([])
  const [chatsLoad, setChatsLoad] = useState(false)
  const [selChat, setSelChat] = useState<string | null>(null)
  const [chatTitle, setChatTitle] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [msgsLoad, setMsgsLoad] = useState(false)
  const [chatIn, setChatIn] = useState('')
  const [sending, setSending] = useState(false)
  const [expRefs, setExpRefs] = useState<Record<string, boolean>>({})
  const [searchQ, setSearchQ] = useState('')
  const [searchRes, setSearchRes] = useState<Array<{ content: string; page: number; bookTitle: string; score: number }>>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [sumBook, setSumBook] = useState('')
  const [sumResult, setSumResult] = useState('')
  const [sumLoad, setSumLoad] = useState(false)
  const [qBook, setQBook] = useState('')
  const [qType, setQType] = useState('pilihan_ganda')
  const [qCount, setQCount] = useState('5')
  const [qDiff, setQDiff] = useState('sedang')
  const [qResult, setQResult] = useState('')
  const [qLoad, setQLoad] = useState(false)
  const [newU, setNewU] = useState('')
  const [newP, setNewP] = useState('')
  const [newR, setNewR] = useState('pengguna')
  const [creating, setCreating] = useState(false)
  const [activities, setActivities] = useState<Array<{ id: string; type: string; title: string; createdAt: string }>>([])
  const [actLoad, setActLoad] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { theme, setTheme } = useTheme()

  const api = async (url: string, opts: RequestInit = {}) => {
    const h: Record<string, string> = { ...(opts.headers as Record<string, string> || {}) }
    if (token) h['Authorization'] = 'Bearer ' + token
    if (opts.body && !(opts.body instanceof FormData)) h['Content-Type'] = 'application/json'
    const res = await fetch(url, { ...opts, headers: h })
    if (!res.ok) { const e = await res.json().catch(() => ({ error: 'Gagal' })); throw new Error(e.error || 'Gagal') }
    return res.json()
  }

  const login = async (u: string, p: string) => {
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) })
    if (!res.ok) return null
    return res.json()
  }

  useEffect(() => {
    ;(async () => {
      try { await fetch('/api/seed', { method: 'POST' }) } catch { /* */ }
      const data = await login('admin', 'admin123')
      if (data?.token) {
        setToken(data.token)
        setUser(data.user)
      }
      setInitLoad(false)
    })()
  }, [])

  const chatContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = (smooth = true) => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
    }
  }

  useEffect(() => { scrollToBottom() }, [msgs, sending])
  useEffect(() => {
    if (msgs.length > 0) scrollToBottom(false)
  }, [selChat])

  const fetchDash = async () => {
    setActLoad(true); setBooksLoad(true); setChatsLoad(true)
    try {
      const [b, c, a] = await Promise.allSettled([api('/api/books'), api('/api/chat'), api('/api/activities?limit=20')])
      if (b.status === 'fulfilled') setBooks(b.value.books || [])
      if (c.status === 'fulfilled') setChats(Array.isArray(c.value) ? c.value : [])
      if (a.status === 'fulfilled') setActivities(a.value.activities || [])
    } catch { /* */ }
    setActLoad(false); setBooksLoad(false); setChatsLoad(false)
  }

  const fetchBooks = async (q?: string) => {
    setBooksLoad(true)
    try {
      const url = q ? `/api/books?q=${encodeURIComponent(q)}` : '/api/books'
      const d = await api(url); setBooks(d.books || [])
    } catch (e: unknown) { toast.error((e as Error).message) }
    setBooksLoad(false)
  }

  const fetchChats = async () => {
    setChatsLoad(true)
    try { const d = await api('/api/chat'); setChats(Array.isArray(d) ? d : []) }
    catch (e: unknown) { toast.error((e as Error).message) }
    setChatsLoad(false)
  }

  const fetchMsgs = async (id: string) => {
    setMsgsLoad(true); setSelChat(id)
    try {
      const d = await api(`/api/chat?id=${id}`)
      setChatTitle(d.title || 'Percakapan'); setMsgs(d.messages || [])
    } catch (e: unknown) { toast.error((e as Error).message) }
    setMsgsLoad(false)
  }

  useEffect(() => {
    if (!token) return
    const fn = async () => {
      if (page === 'dashboard') await fetchDash()
      else if (page === 'library') await fetchBooks()
      else if (page === 'chat') await fetchChats()
      else if (page === 'summary' || page === 'quiz') await fetchBooks()
    }
    fn()
  }, [page, token])

  const doLogin = async (e: FormEvent) => {
    e.preventDefault()
    if (!loginU.trim() || !loginP.trim()) { toast.error('Masukkan username dan password'); return }
    setLoginLoad(true)
    try {
      const d = await login(loginU, loginP)
      if (d?.token) { setToken(d.token); setUser(d.user); toast.success('Berhasil masuk!') }
      else toast.error('Username atau password salah')
    } catch { toast.error('Login gagal') }
    setLoginLoad(false)
  }

  const doLogout = () => { setToken(null); setUser(null); setPage('dashboard'); setSelChat(null); setMsgs([]); setChats([]); toast.success('Berhasil keluar') }

  const doUpload = async () => {
    if (!upFile || !upTitle.trim()) { toast.error('Pilih file dan masukkan judul'); return }
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', upFile); fd.append('title', upTitle); if (upAuthor) fd.append('author', upAuthor)
      await api('/api/books/upload', { method: 'POST', body: fd })
      toast.success('Buku berhasil diupload!'); setUploadOpen(false); setUpTitle(''); setUpAuthor(''); setUpFile(null); fetchBooks()
    } catch (e: unknown) { toast.error((e as Error).message) }
    setUploading(false)
  }

  const doDeleteBook = async (id: string) => {
    try { await api(`/api/books/delete?id=${id}`, { method: 'DELETE' }); toast.success('Buku dihapus'); setBooks(p => p.filter(b => b.id !== id)) }
    catch (e: unknown) { toast.error((e as Error).message) }
  }

  const doNewChat = async () => {
    try {
      const d = await api('/api/chat/create', { method: 'POST', body: JSON.stringify({ title: 'Percakapan Baru' }) })
      const nc = { id: d.id, title: d.title, createdAt: d.createdAt, _count: { messages: 0 } }
      setChats(p => [nc, ...p]); setSelChat(nc.id); setChatTitle(nc.title); setMsgs([]); setSidebarOpen(false)
    } catch (e: unknown) { toast.error((e as Error).message) }
  }

  const doSend = async () => {
    if (!chatIn.trim() || !selChat || sending) return
    const m = chatIn.trim(); setChatIn(''); setSending(true)
    setMsgs(p => [...p, { id: 't' + Date.now(), role: 'user', content: m, references: null, createdAt: new Date().toISOString() }])
    try {
      const d = await api('/api/chat/send', { method: 'POST', body: JSON.stringify({ chatId: selChat, message: m }) })
      setMsgs(p => [...p, { id: d.id, role: 'assistant', content: d.content, references: d.references ? JSON.stringify(d.references) : null, createdAt: d.createdAt || new Date().toISOString() }])
      setChats(p => p.map(c => c.id === selChat ? { ...c, _count: { messages: (c._count?.messages || 0) + 2 } } : c))
    } catch (e: unknown) { toast.error((e as Error).message); setMsgs(p => p.slice(0, -1)) }
    setSending(false)
  }

  const doSearch = async () => {
    if (!searchQ.trim()) return
    setSearching(true); setSearched(true)
    try { const d = await api(`/api/search?q=${encodeURIComponent(searchQ)}`); setSearchRes(d.results || []) }
    catch (e: unknown) { toast.error((e as Error).message); setSearchRes([]) }
    setSearching(false)
  }

  const doSummary = async () => {
    if (!sumBook) { toast.error('Pilih buku'); return }
    setSumLoad(true); setSumResult('')
    try { const d = await api('/api/summary', { method: 'POST', body: JSON.stringify({ bookId: sumBook }) }); setSumResult(d.summary || JSON.stringify(d)); toast.success('Ringkasan dibuat!') }
    catch (e: unknown) { toast.error((e as Error).message) }
    setSumLoad(false)
  }

  const doQuiz = async () => {
    if (!qBook) { toast.error('Pilih buku'); return }
    setQLoad(true); setQResult('')
    try { const d = await api('/api/quiz', { method: 'POST', body: JSON.stringify({ bookId: qBook, type: qType, count: parseInt(qCount), difficulty: qDiff }) }); setQResult(d.quiz || JSON.stringify(d)); toast.success('Soal dibuat!') }
    catch (e: unknown) { toast.error((e as Error).message) }
    setQLoad(false)
  }

  const doCreateUser = async () => {
    if (!newU.trim() || !newP.trim()) { toast.error('Masukkan username dan password'); return }
    setCreating(true)
    try { await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ username: newU, password: newP, role: newR }) }); toast.success(`Pengguna "${newU}" dibuat!`); setNewU(''); setNewP('') }
    catch (e: unknown) { toast.error((e as Error).message) }
    setCreating(false)
  }

  const parseRefs = (r: string | null): Ref[] => {
    if (!r) return []
    try { return JSON.parse(r) } catch { return [] }
  }

  const toggleRef = (id: string) => setExpRefs(p => ({ ...p, [id]: !p[id] }))

  // ==================== SIDEBAR ====================
  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700/50">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center"><BookOpen className="h-5 w-5 text-emerald-400" /></div>
        <span className="text-lg font-bold text-white">AI Library Tutor</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(n => {
          const I = n.icon; const a = page === n.id
          return <button key={n.id} onClick={() => { setPage(n.id); setSidebarOpen(false) }} className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all', a ? 'bg-emerald-500/10 text-emerald-500' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200')}><I className={cn('h-5 w-5', a && 'text-emerald-500')} />{n.label}</button>
        })}
      </nav>
      <div className="border-t border-slate-700/50 p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9 bg-emerald-500/20 border border-emerald-500/30"><AvatarFallback className="text-emerald-400 text-sm font-semibold">{user?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback></Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.username}</p>
            <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0', user?.role === 'admin' ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-700/50 text-slate-400')}>{user?.role === 'admin' ? 'Admin' : 'Pengguna'}</Badge>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={doLogout} className="w-full justify-start gap-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10"><LogOut className="h-4 w-4" />Keluar</Button>
      </div>
    </div>
  )

  // ==================== AUTH ====================
  if (initLoad) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="text-center"><div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4"><BookOpen className="h-8 w-8 text-emerald-400 animate-pulse" /></div><p className="text-slate-400 text-sm">Memuat...</p></div>
    </div>
  )

  if (!token || !user) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4"><BookOpen className="h-8 w-8 text-emerald-400" /></div>
          <h1 className="text-2xl font-bold text-white">AI Library Tutor</h1>
          <p className="text-slate-400 mt-1 text-sm">Masuk untuk melanjutkan</p>
        </div>
        <Card className="bg-slate-800/50 border-slate-700/50"><CardContent className="pt-6">
          <form onSubmit={doLogin} className="space-y-4">
            <div className="space-y-2"><label className="text-sm font-medium text-slate-300">Username</label><Input value={loginU} onChange={e => setLoginU(e.target.value)} placeholder="Masukkan username" className="bg-slate-900/50 border-slate-600/50 text-white placeholder:text-slate-500 focus:border-emerald-500/50" /></div>
            <div className="space-y-2"><label className="text-sm font-medium text-slate-300">Password</label><Input type="password" value={loginP} onChange={e => setLoginP(e.target.value)} placeholder="Masukkan password" className="bg-slate-900/50 border-slate-600/50 text-white placeholder:text-slate-500 focus:border-emerald-500/50" /></div>
            <Button type="submit" disabled={loginLoad} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">{loginLoad && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Masuk</Button>
          </form>
        </CardContent></Card>
      </motion.div>
    </div>
  )

  // ==================== MAIN LAYOUT ====================
  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-slate-900 border-r border-slate-700/50 z-30">{sidebar}</aside>
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="md:hidden flex items-center h-14 px-4 border-b border-slate-700/50 bg-slate-900/95 backdrop-blur-sm sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"><Menu className="h-5 w-5" /></button>
          <div className="flex items-center gap-2 ml-2"><BookOpen className="h-5 w-5 text-emerald-400" /><span className="text-base font-bold">AI Library Tutor</span></div>
        </header>
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0 bg-slate-900 border-slate-700/50"><SheetTitle className="sr-only">Menu</SheetTitle>{sidebar}</SheetContent>
        </Sheet>
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 lg:p-8">
            <AnimatePresence mode="wait"><motion.div key={page} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>

              {/* DASHBOARD */}
              {page === 'dashboard' && (
                <div className="space-y-6">
                  <div><h1 className="text-2xl font-bold text-white">Selamat datang, {user.username}! 👋</h1><p className="text-slate-400 mt-1">Berikut ringkasan perpustakaan Anda.</p></div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[{ l: 'Total Buku', v: books.length, i: BookOpen }, { l: 'Percakapan AI', v: chats.length, i: MessageSquare }, { l: 'Aktivitas', v: activities.length, i: RefreshCw }].map((s, idx) => (
                      <Card key={idx} className="bg-slate-800/50 border-slate-700/50 hover:border-emerald-500/30 transition-colors"><CardContent className="p-5"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-400">{s.l}</p><p className="text-3xl font-bold text-white mt-1">{actLoad ? <Skeleton className="h-8 w-12 bg-slate-700/50" /> : s.v}</p></div><div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">{<s.i className="h-6 w-6 text-emerald-400" />}</div></div></CardContent></Card>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => { setPage('library'); setTimeout(() => setUploadOpen(true), 100) }} className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"><Upload className="h-4 w-4" />Upload Buku</Button>
                    <Button onClick={() => setPage('chat')} variant="outline" className="border-slate-600/50 text-slate-300 hover:bg-slate-800 hover:text-white gap-2"><MessageSquare className="h-4 w-4" />Buat Chat</Button>
                    <Button onClick={() => setPage('search')} variant="outline" className="border-slate-600/50 text-slate-300 hover:bg-slate-800 hover:text-white gap-2"><Search className="h-4 w-4" />Cari</Button>
                  </div>
                  <Card className="bg-slate-800/50 border-slate-700/50"><CardHeader className="pb-3"><CardTitle className="text-white text-lg">Aktivitas Terbaru</CardTitle></CardHeader><CardContent>
                    {actLoad ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg bg-slate-700/30" />)}</div> :
                    activities.length === 0 ? <p className="text-slate-500 text-sm text-center py-6">Belum ada aktivitas.</p> :
                    <div className="space-y-2">{activities.slice(0, 10).map(a => {
                      const Ic = activityIcons[a.type] || BookOpen
                      return <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/30 transition-colors"><div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0"><Ic className="h-4 w-4 text-emerald-400" /></div><p className="text-sm text-slate-300 truncate flex-1">{a.title}</p><span className="text-xs text-slate-500 flex-shrink-0">{a.createdAt ? format(new Date(a.createdAt), 'dd MMM, HH:mm') : ''}</span></div>
                    })}</div>}
                  </CardContent></Card>
                </div>
              )}

              {/* LIBRARY */}
              {page === 'library' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div><h1 className="text-2xl font-bold text-white">Perpustakaan</h1><p className="text-slate-400 text-sm mt-1">Kelola koleksi buku Anda.</p></div>
                    <Button onClick={() => setUploadOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 self-start"><Upload className="h-4 w-4" />Upload Buku</Button>
                  </div>
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input value={libSearch} onChange={e => setLibSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchBooks(libSearch)} placeholder="Cari buku..." className="pl-9 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-emerald-500/50" />
                  </div>
                  {booksLoad ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl bg-slate-800/50" />)}</div> :
                  books.length === 0 ? <Card className="bg-slate-800/50 border-slate-700/50"><CardContent className="flex flex-col items-center justify-center py-16"><div className="w-16 h-16 rounded-full bg-slate-700/30 flex items-center justify-center mb-4"><BookOpen className="h-8 w-8 text-slate-500" /></div><p className="text-slate-400 font-medium">Belum ada buku</p><p className="text-slate-500 text-sm mt-1">Upload buku pertama Anda.</p></CardContent></Card> :
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{books.map(b => (
                    <Card key={b.id} className="bg-slate-800/50 border-slate-700/50 hover:border-emerald-500/30 transition-all group"><CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-3"><div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0"><BookOpen className="h-5 w-5 text-emerald-400" /></div><Button variant="ghost" size="icon" onClick={() => doDeleteBook(b.id)} className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="h-4 w-4" /></Button></div>
                      <h3 className="text-sm font-semibold text-white truncate" title={b.title}>{b.title}</h3>
                      <p className="text-xs text-slate-400 mt-1 truncate">{b.author || 'Tidak diketahui'}</p>
                      <div className="flex items-center gap-2 mt-3"><Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-400">{b.fileType?.toUpperCase()}</Badge><span className="text-xs text-slate-500">{b.totalPages} hal</span><span className="text-xs text-slate-500">· {b._count.documents} dok</span></div>
                    </CardContent></Card>
                  ))}</div>}
                  <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                    <DialogContent className="bg-slate-800 border-slate-700/50 text-white sm:max-w-md">
                      <DialogHeader><DialogTitle>Upload Buku Baru</DialogTitle><DialogDescription className="text-slate-400">Pilih file dan masukkan detail buku.</DialogDescription></DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="space-y-2"><label className="text-sm font-medium text-slate-300">Judul *</label><Input value={upTitle} onChange={e => setUpTitle(e.target.value)} placeholder="Judul buku" className="bg-slate-900/50 border-slate-600/50 text-white placeholder:text-slate-500" /></div>
                        <div className="space-y-2"><label className="text-sm font-medium text-slate-300">Penulis</label><Input value={upAuthor} onChange={e => setUpAuthor(e.target.value)} placeholder="Nama penulis" className="bg-slate-900/50 border-slate-600/50 text-white placeholder:text-slate-500" /></div>
                        <div className="space-y-2"><label className="text-sm font-medium text-slate-300">File *</label>
                          <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-slate-600/50 rounded-lg p-6 text-center cursor-pointer hover:border-emerald-500/50 transition-colors">
                            {upFile ? <div className="flex items-center justify-center gap-2"><FileText className="h-5 w-5 text-emerald-400" /><span className="text-sm text-slate-300 truncate max-w-[200px]">{upFile.name}</span><button onClick={e => { e.stopPropagation(); setUpFile(null) }} className="text-slate-500 hover:text-red-400"><X className="h-4 w-4" /></button></div> : <><Upload className="h-8 w-8 text-slate-500 mx-auto mb-2" /><p className="text-sm text-slate-400">Klik untuk memilih file</p><p className="text-xs text-slate-500 mt-1">TXT, MD, JSON, PDF</p></>}
                          </div>
                          <input ref={fileRef} type="file" accept=".txt,.md,.json,.pdf,.docx,.doc" onChange={e => { const f = e.target.files?.[0]; if (f) setUpFile(f) }} className="hidden" />
                        </div>
                      </div>
                      <DialogFooter><Button variant="outline" onClick={() => setUploadOpen(false)} className="border-slate-600/50 text-slate-300">Batal</Button><Button onClick={doUpload} disabled={uploading || !upFile || !upTitle.trim()} className="bg-emerald-600 hover:bg-emerald-500 text-white">{uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Upload</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {/* CHAT */}
              {page === 'chat' && (
                <div className="flex h-[calc(100vh-8rem)] -m-4 md:-m-6 overflow-hidden">
                  <div className={cn('w-full md:w-72 border-r border-slate-700/50 flex-shrink-0 flex flex-col bg-slate-900/30', selChat ? 'hidden md:flex' : 'flex')}>
                    <div className="p-4 border-b border-slate-700/50"><Button onClick={doNewChat} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white gap-2"><Plus className="h-4 w-4" />Percakapan Baru</Button></div>
                    <ScrollArea className="flex-1"><div className="p-2 space-y-1">
                      {chatsLoad ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg bg-slate-800/50" />) :
                      chats.length === 0 ? <div className="text-center py-8"><MessageSquare className="h-8 w-8 text-slate-600 mx-auto mb-2" /><p className="text-sm text-slate-500">Belum ada percakapan</p></div> :
                      chats.map(c => (
                        <button key={c.id} onClick={() => fetchMsgs(c.id)} className={cn('w-full text-left p-3 rounded-lg transition-all', selChat === c.id ? 'bg-emerald-500/10 border border-emerald-500/20' : 'hover:bg-slate-800/50 border border-transparent')}>
                          <p className="text-sm font-medium text-slate-200 truncate">{c.title}</p>
                          <p className="text-xs text-slate-500 mt-1">{c._count?.messages || 0} pesan{c.createdAt ? ` · ${format(new Date(c.createdAt), 'dd MMM')}` : ''}</p>
                        </button>
                      ))}
                    </div></ScrollArea>
                  </div>
                  <div className={cn('flex-1 flex flex-col bg-slate-950', selChat ? 'flex' : 'hidden md:flex')}>
                    {selChat ? (<>
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50 bg-slate-900/30">
                        <button onClick={() => setSelChat(null)} className="md:hidden text-slate-400 hover:text-white"><ArrowLeft className="h-5 w-5" /></button>
                        <div className="flex-1 min-w-0"><h2 className="text-sm font-semibold text-white truncate">{chatTitle}</h2><p className="text-xs text-slate-500">Percakapan AI</p></div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4">
                        {msgsLoad ? <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className={cn('h-16 rounded-xl max-w-[80%]', i % 2 === 0 ? 'ml-auto' : '')} />)}</div> :
                        msgs.length === 0 ? <div className="flex flex-col items-center justify-center h-full py-16"><div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4"><Bot className="h-8 w-8 text-emerald-400" /></div><p className="text-slate-400 font-medium">Mulai percakapan</p><p className="text-slate-500 text-sm mt-1">Ketik pesan di bawah.</p></div> :
                        <div className="space-y-4">{msgs.map(m => {
                          const refs = parseRefs(m.references)
                          return <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                            <div className={cn('max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3', m.role === 'user' ? 'bg-emerald-600 text-white rounded-br-md' : 'bg-slate-800 text-slate-200 rounded-bl-md')}>
                              {m.role === 'assistant' && <div className="flex items-center gap-2 mb-2"><Bot className="h-4 w-4 text-emerald-400" /><span className="text-xs font-medium text-emerald-400">AI Tutor</span></div>}
                              <div className="text-sm prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                              {refs.length > 0 && <div className="mt-3 pt-3 border-t border-slate-700/50">
                                <button onClick={() => toggleRef(m.id)} className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300">{expRefs[m.id] ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}Referensi ({refs.length})</button>
                                {expRefs[m.id] && <div className="mt-2 space-y-2">{refs.map((r, i) => <div key={i} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30"><p className="text-xs font-medium text-emerald-400 truncate">{r.bookTitle}</p><Badge variant="secondary" className="text-[10px] bg-slate-700/50 text-slate-400 mt-1">Hal. {r.page}</Badge><p className="text-xs text-slate-400 mt-1 line-clamp-3">{r.content}</p></div>)}</div>}
                              </div>}
                            </div>
                          </div>})}
                        {sending && <div className="flex justify-start"><div className="bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3"><div className="flex items-center gap-2"><Loader2 className="h-4 w-4 text-emerald-400 animate-spin" /><span className="text-sm text-slate-400">Berpikir...</span></div></div></div>}
                        <div ref={endRef} /></div>}
                      </div>
                      <div className="p-4 border-t border-slate-700/50 bg-slate-900/30"><div className="flex gap-2">
                        <Input value={chatIn} onChange={e => setChatIn(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend() } }} placeholder="Ketik pesan..." disabled={sending} className="flex-1 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-emerald-500/50" />
                        <Button onClick={doSend} disabled={!chatIn.trim() || sending} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4"><Send className="h-4 w-4" /></Button>
                      </div></div>
                    </>) : (
                      <div className="flex-1 flex items-center justify-center"><div className="text-center"><div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4"><MessageSquare className="h-10 w-10 text-emerald-400/50" /></div><p className="text-slate-400 font-medium">Pilih atau buat percakapan</p></div></div>
                    )}
                  </div>
                </div>
              )}

              {/* SEARCH */}
              {page === 'search' && (
                <div className="space-y-6">
                  <div><h1 className="text-2xl font-bold text-white">Pencarian</h1><p className="text-slate-400 text-sm mt-1">Cari konten dari buku.</p></div>
                  <div className="flex gap-2 max-w-2xl"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" /><Input value={searchQ} onChange={e => setSearchQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} placeholder="Masukkan kata kunci..." className="pl-9 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-emerald-500/50" /></div><Button onClick={doSearch} disabled={searching} className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">{searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Cari</Button></div>
                  {searching ? <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl bg-slate-800/50" />)}</div> :
                  searched && searchRes.length === 0 ? <Card className="bg-slate-800/50 border-slate-700/50"><CardContent className="flex flex-col items-center py-16"><Search className="h-10 w-10 text-slate-600 mb-3" /><p className="text-slate-400">Tidak ada hasil</p></CardContent></Card> :
                  <div className="space-y-3">{searchRes.map((r, i) => <Card key={i} className="bg-slate-800/50 border-slate-700/50 hover:border-emerald-500/30 transition-colors"><CardContent className="p-4"><div className="flex items-center gap-2 mb-1"><BookOpen className="h-4 w-4 text-emerald-400" /><h3 className="text-sm font-semibold text-white truncate">{r.bookTitle}</h3><Badge variant="secondary" className="text-[10px] bg-slate-700/50 text-slate-400">Hal. {r.page}</Badge></div><p className="text-sm text-slate-400 line-clamp-3">{r.content}</p></CardContent></Card>)}</div>}
                </div>
              )}

              {/* SUMMARY */}
              {page === 'summary' && (
                <div className="space-y-6">
                  <div><h1 className="text-2xl font-bold text-white">Ringkasan</h1><p className="text-slate-400 text-sm mt-1">Buat ringkasan otomatis dari buku.</p></div>
                  <Card className="bg-slate-800/50 border-slate-700/50"><CardContent className="p-5 space-y-4">
                    <div className="space-y-2"><label className="text-sm font-medium text-slate-300">Pilih Buku</label>
                      {booksLoad ? <Skeleton className="h-10 rounded-lg bg-slate-700/50" /> :
                      <Select value={sumBook} onValueChange={setSumBook}><SelectTrigger className="bg-slate-900/50 border-slate-600/50 text-white"><SelectValue placeholder="Pilih buku..." /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700">{books.map(b => <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>)}{books.length === 0 && <div className="px-2 py-3 text-sm text-slate-500 text-center">Tidak ada buku</div>}</SelectContent></Select>}
                    </div>
                    <Button onClick={doSummary} disabled={sumLoad || !sumBook} className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">{sumLoad ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Buat Ringkasan</Button>
                  </CardContent></Card>
                  {sumLoad && <Card className="bg-slate-800/50 border-slate-700/50"><CardContent className="p-8 flex flex-col items-center"><Loader2 className="h-8 w-8 text-emerald-400 animate-spin mb-3" /><p className="text-slate-400">Membuat ringkasan...</p></CardContent></Card>}
                  {sumResult && !sumLoad && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><Card className="bg-slate-800/50 border-slate-700/50"><CardHeader className="pb-3"><CardTitle className="text-white text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-emerald-400" />Ringkasan</CardTitle></CardHeader><CardContent><div className="text-sm text-slate-300 prose prose-invert prose-sm max-w-none"><ReactMarkdown>{sumResult}</ReactMarkdown></div></CardContent></Card></motion.div>}
                </div>
              )}

              {/* QUIZ */}
              {page === 'quiz' && (
                <div className="space-y-6">
                  <div><h1 className="text-2xl font-bold text-white">Pembuat Soal</h1><p className="text-slate-400 text-sm mt-1">Buat soal dari buku secara otomatis.</p></div>
                  <Card className="bg-slate-800/50 border-slate-700/50"><CardContent className="p-5 space-y-4">
                    <div className="space-y-2"><label className="text-sm font-medium text-slate-300">Pilih Buku</label>
                      {booksLoad ? <Skeleton className="h-10 rounded-lg" /> :
                      <Select value={qBook} onValueChange={setQBook}><SelectTrigger className="bg-slate-900/50 border-slate-600/50 text-white"><SelectValue placeholder="Pilih buku..." /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700">{books.map(b => <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>)}</SelectContent></Select>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2"><label className="text-sm font-medium text-slate-300">Tipe</label><Select value={qType} onValueChange={setQType}><SelectTrigger className="bg-slate-900/50 border-slate-600/50 text-white"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="pilihan_ganda">Pilihan Ganda</SelectItem><SelectItem value="esai">Esai</SelectItem></SelectContent></Select></div>
                      <div className="space-y-2"><label className="text-sm font-medium text-slate-300">Jumlah</label><Select value={qCount} onValueChange={setQCount}><SelectTrigger className="bg-slate-900/50 border-slate-600/50 text-white"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700">{[3,4,5,6,7,8,9,10].map(n => <SelectItem key={n} value={String(n)}>{n} soal</SelectItem>)}</SelectContent></Select></div>
                      <div className="space-y-2"><label className="text-sm font-medium text-slate-300">Kesulitan</label><Select value={qDiff} onValueChange={setQDiff}><SelectTrigger className="bg-slate-900/50 border-slate-600/50 text-white"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="mudah">Mudah</SelectItem><SelectItem value="sedang">Sedang</SelectItem><SelectItem value="sulit">Sulit</SelectItem></SelectContent></Select></div>
                    </div>
                    <Button onClick={doQuiz} disabled={qLoad || !qBook} className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">{qLoad ? <Loader2 className="h-4 w-4 animate-spin" /> : <HelpCircle className="h-4 w-4" />}Buat Soal</Button>
                  </CardContent></Card>
                  {qLoad && <Card className="bg-slate-800/50 border-slate-700/50"><CardContent className="p-8 flex flex-col items-center"><Loader2 className="h-8 w-8 text-emerald-400 animate-spin mb-3" /><p className="text-slate-400">Membuat soal...</p></CardContent></Card>}
                  {qResult && !qLoad && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><Card className="bg-slate-800/50 border-slate-700/50"><CardHeader className="pb-3"><CardTitle className="text-white text-lg flex items-center gap-2"><HelpCircle className="h-5 w-5 text-emerald-400" />Soal</CardTitle></CardHeader><CardContent><div className="text-sm text-slate-300 prose prose-invert prose-sm max-w-none"><ReactMarkdown>{qResult}</ReactMarkdown></div></CardContent></Card></motion.div>}
                </div>
              )}

              {/* SETTINGS */}
              {page === 'settings' && (
                <div className="space-y-6 max-w-2xl">
                  <div><h1 className="text-2xl font-bold text-white">Pengaturan</h1><p className="text-slate-400 text-sm mt-1">Kelola akun dan preferensi.</p></div>
                  <Card className="bg-slate-800/50 border-slate-700/50"><CardHeader><CardTitle className="text-white text-lg">Informasi Akun</CardTitle></CardHeader><CardContent><div className="flex items-center gap-4"><Avatar className="h-16 w-16 bg-emerald-500/20 border-2 border-emerald-500/30"><AvatarFallback className="text-emerald-400 text-xl font-bold">{user.username.charAt(0).toUpperCase()}</AvatarFallback></Avatar><div><h3 className="text-lg font-semibold text-white">{user.username}</h3><Badge variant="secondary" className={cn('mt-1', user.role === 'admin' ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-700/50 text-slate-400')}>{user.role === 'admin' ? 'Admin' : 'Pengguna'}</Badge></div></div></CardContent></Card>
                  <Card className="bg-slate-800/50 border-slate-700/50"><CardHeader><CardTitle className="text-white text-lg">Tema</CardTitle></CardHeader><CardContent><div className="flex items-center justify-between"><div className="flex items-center gap-3">{theme === 'dark' ? <Moon className="h-5 w-5 text-emerald-400" /> : <Sun className="h-5 w-5 text-amber-400" />}<div><p className="text-sm font-medium text-white">Mode Gelap</p><p className="text-xs text-slate-400">{theme === 'dark' ? 'Tema gelap aktif' : 'Tema terang aktif'}</p></div></div><Switch checked={theme === 'dark'} onCheckedChange={c => setTheme(c ? 'dark' : 'light')} /></div></CardContent></Card>
                  {user.role === 'admin' && <Card className="bg-slate-800/50 border-slate-700/50"><CardHeader><CardTitle className="text-white text-lg flex items-center gap-2"><User className="h-5 w-5 text-emerald-400" />Buat Pengguna Baru</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="space-y-2"><label className="text-sm font-medium text-slate-300">Username</label><Input value={newU} onChange={e => setNewU(e.target.value)} placeholder="Username baru" className="bg-slate-900/50 border-slate-600/50 text-white placeholder:text-slate-500" /></div><div className="space-y-2"><label className="text-sm font-medium text-slate-300">Password</label><Input type="password" value={newP} onChange={e => setNewP(e.target.value)} placeholder="Password baru" className="bg-slate-900/50 border-slate-600/50 text-white placeholder:text-slate-500" /></div></div><div className="space-y-2"><label className="text-sm font-medium text-slate-300">Peran</label><Select value={newR} onValueChange={setNewR}><SelectTrigger className="bg-slate-900/50 border-slate-600/50 text-white"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="pengguna">Pengguna</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select></div><Button onClick={doCreateUser} disabled={creating || !newU.trim() || !newP.trim()} className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2">{creating && <Loader2 className="h-4 w-4 animate-spin" />}Buat Pengguna</Button></CardContent></Card>}
                </div>
              )}

            </motion.div></AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  )
}