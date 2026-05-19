
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { takeTaskInWork, getAvailableTasks, getMyTasks, updateTaskStatusAction } from '@/app/actions/crm-actions';
import { sendAuditEmailAction } from '@/app/actions/crm-email-actions';
import { logoutAction, getSession } from '@/app/actions/auth-actions';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Briefcase, Globe, Clock, CheckCircle2, LogOut, 
  ExternalLink, Phone, Mail, ChevronRight, AlertCircle, UserCheck, ShieldAlert, User, History, TrendingUp, Copy, Zap, Eye, Download, DollarSign
} from "lucide-react";
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ManagerDashboard() {
  const [session, setSession] = useState<any>(null);
  const [availableTasks, setAvailableTasks] = useState<any[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailBody, setEmailBody] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [closingPrice, setClosingPrice] = useState<string>("");
  const [showClosingPriceDialog, setShowClosingPriceDialog] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{id: number, status: string} | null>(null);

  const { toast } = useToast();
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      const s = await getSession();
      if (!s) { router.push('/login'); return; }
      setSession(s);
      const [available, mine] = await Promise.all([getAvailableTasks(), getMyTasks()]);
      setAvailableTasks(available);
      setMyTasks(mine);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogout = async () => {
    await logoutAction();
    router.push('/login');
  };

  const handleTakeTask = async (taskId: number) => {
    setProcessingId(taskId.toString());
    try {
      const result = await takeTaskInWork(taskId);
      if (result.success) { toast({ title: "Задача принята" }); fetchData(); } 
      else { toast({ variant: "destructive", title: "Ошибка", description: result.error }); }
    } catch (e: any) { toast({ variant: "destructive", title: "Критическая ошибка" }); } 
    finally { setProcessingId(null); }
  };

  const confirmStatusUpdate = async () => {
    if (!pendingStatusChange) return;
    const price = parseFloat(closingPrice);
    if (isNaN(price) || price <= 0) { 
      toast({ variant: "destructive", title: "Ошибка", description: "Укажите сумму сделки" }); 
      return; 
    }
    try {
        const res = await updateTaskStatusAction(pendingStatusChange.id, pendingStatusChange.status, price);
        if (res.success) {
            toast({ title: "Сделка закрыта!" });
            setShowClosingPriceDialog(false);
            setClosingPrice("");
            setPendingStatusChange(null);
            fetchData();
            setSelectedTask(null);
        }
    } catch (e: any) { toast({ variant: "destructive", title: "Ошибка" }); }
  };

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    if (newStatus === 'done' || newStatus === 'completed') {
        setPendingStatusChange({id: taskId, status: newStatus});
        setShowClosingPriceDialog(true);
        return;
    }
    try {
      const res = await updateTaskStatusAction(taskId, newStatus);
      if (res.success) { toast({ title: "Статус обновлен" }); fetchData(); }
    } catch (e: any) { toast({ variant: "destructive", title: "Ошибка" }); }
  };

  const handleSendEmail = async () => {
    if (!selectedTask || !selectedTask.extracted_emails?.[0]?.value) {
      toast({ variant: "destructive", title: "Ошибка", description: "Email клиента не найден" });
      return;
    }
    setIsSendingEmail(true);
    try {
      const res = await sendAuditEmailAction(
        selectedTask.id, 
        session.email, 
        selectedTask.extracted_emails[0].value, 
        emailBody
      );
      if (res.success) {
        toast({ title: "Успех", description: "Письмо отправлено клиенту" });
        setIsEmailModalOpen(false);
        fetchData();
      } else {
        toast({ variant: "destructive", title: "Ошибка отправки", description: res.error });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Ошибка", description: e.message });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const findings = useMemo(() => {
    if (!selectedTask?.audit_findings) return [];
    try {
      return typeof selectedTask.audit_findings === 'string' ? JSON.parse(selectedTask.audit_findings) : selectedTask.audit_findings;
    } catch (e) { return []; }
  }, [selectedTask]);

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 flex flex-col font-body">
      <header className="h-16 border-b border-white/5 bg-[#0b1120]/50 backdrop-blur-xl sticky top-0 z-50 px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Logo" width={24} height={24} />
          <span className="font-bold text-lg text-white">Manager CRM</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
            <User className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{session?.email}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-rose-400 hover:text-rose-300"><LogOut className="w-4 h-4 mr-2" /> Выход</Button>
        </div>
      </header>

      <main className="flex-1 p-8 space-y-12 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <Card className="bg-white/[0.03] border-white/10">
             <CardContent className="pt-6 flex items-center gap-4">
               <div className="bg-primary/20 p-2 rounded-lg"><TrendingUp className="w-5 h-5 text-primary" /></div>
               <div><p className="text-[10px] uppercase font-bold text-slate-500">Заказы</p><p className="text-2xl font-bold">{myTasks.length}</p></div>
             </CardContent>
           </Card>
           <Card className="bg-white/[0.03] border-white/10">
             <CardContent className="pt-6 flex items-center gap-4">
               <div className="bg-emerald-500/20 p-2 rounded-lg"><CheckCircle2 className="w-5 h-5 text-emerald-500" /></div>
               <div><p className="text-[10px] uppercase font-bold text-slate-500">Закрыто</p><p className="text-2xl font-bold text-emerald-500">{myTasks.filter(t => t.status === 'done' || t.status === 'completed').length}</p></div>
             </CardContent>
           </Card>
        </div>

        <Tabs defaultValue="available" className="w-full space-y-6">
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl">
            <TabsTrigger value="available" className="text-xs font-bold gap-2">Свободные задачи</TabsTrigger>
            <TabsTrigger value="history" className="text-xs font-bold gap-2">Мои заказы</TabsTrigger>
          </TabsList>

          <TabsContent value="available">
            <Card className="bg-white/[0.03] border-white/10 overflow-hidden shadow-2xl">
              <Table>
                <TableHeader className="bg-white/[0.02]">
                  <TableRow className="border-white/5">
                    <TableHead className="text-[10px] uppercase font-bold">Домен</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-center">Приоритет</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-center">Нарушений</TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-bold">Действие</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableTasks.map((task) => (
                    <TableRow key={task.id} className="border-white/5 hover:bg-white/[0.01]">
                      <TableCell className="text-xs font-medium">
                        {task.url?.replace(/^https?:\/\//, '')}
                        {task.priority >= 100 && <Badge className="ml-2 bg-orange-500/20 text-orange-500 border-orange-500/20 animate-pulse">HOT</Badge>}
                      </TableCell>
                      <TableCell className="text-center font-bold">{task.priority}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="text-rose-500 border-rose-500/20">{task.violations_count}</Badge></TableCell>
                      <TableCell className="text-right flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 text-[10px] text-primary" onClick={() => setSelectedTask(task)}><Eye className="w-3 h-3 mr-1" /> Отчет</Button>
                        <Button size="sm" onClick={() => handleTakeTask(task.id)} className="h-8 text-[10px] bg-primary font-bold">Взять в работу</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="bg-white/[0.03] border-white/10 overflow-hidden shadow-2xl">
              <Table>
                <TableHeader className="bg-white/[0.02]">
                  <TableRow className="border-white/5">
                    <TableHead className="text-[10px] uppercase font-bold">Сайт</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold">Статус</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold">Сумма</TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-bold">Управление</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myTasks.map((task) => (
                    <TableRow key={task.id} className="border-white/5 cursor-pointer hover:bg-white/[0.01]" onClick={() => setSelectedTask(task)}>
                      <TableCell className="text-xs">{task.url?.replace(/^https?:\/\//, '')}</TableCell>
                      <TableCell><Badge className="text-[9px]">{task.status}</Badge></TableCell>
                      <TableCell className="text-[10px] font-bold text-emerald-500">{task.closing_price ? `${task.closing_price} €` : '-'}</TableCell>
                      <TableCell className="text-right"><ChevronRight className="w-4 h-4 ml-auto" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="bg-[#0b1120] border-white/10 text-slate-50 max-w-5xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            <div className="w-full md:w-1/3 border-r border-white/5 p-8 space-y-6 bg-white/[0.01] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold truncate">{selectedTask?.url?.replace(/^https?:\/\//, '')}</DialogTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className="bg-rose-500/20 text-rose-500 border-rose-500/20">{findings.length} Нарушений</Badge>
                </div>
              </DialogHeader>

              {selectedTask?.crm_status === 'in_work' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Статус</label>
                  <Select defaultValue={selectedTask?.status} onValueChange={(v) => handleStatusChange(selectedTask.id, v)}>
                    <SelectTrigger className="bg-white/5 border-white/10 h-10 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#0b1120] border-white/10 text-white">
                      <SelectItem value="in_work">Взят в работу</SelectItem>
                      <SelectItem value="negotiation">В переговорах</SelectItem>
                      <SelectItem value="done">Выполнено</SelectItem>
                      <SelectItem value="rejected">Отказ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2">Детали нарушений</h3>
                <div className="space-y-3">
                  {findings.map((f: any, i: number) => (
                    <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2">
                      <div className="flex items-center gap-2"><ShieldAlert className="w-3 h-3 text-rose-500" /><span className="text-[10px] font-bold text-rose-400 uppercase">{f.type}</span></div>
                      <p className="text-[11px] text-slate-300">{f.description || f.summary}</p>
                      <p className="text-[9px] text-rose-400 font-bold">Штраф: {f.liability}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 p-8 space-y-8 bg-[#020617] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="h-20 flex-col gap-2 border-white/10" asChild>
                  <a href={`/api/admin/report-pdf?domain=${selectedTask?.url}`} target="_blank"><Download className="w-6 h-6 text-emerald-500" /><span className="text-[10px] font-bold uppercase">СКАЧАТЬ ОТЧЕТ</span></a>
                </Button>
                <Button className="h-20 flex-col gap-2 bg-primary" onClick={() => setIsEmailModalOpen(true)} disabled={selectedTask?.crm_status !== 'in_work'}>
                  <Mail className="w-6 h-6 text-white" /><span className="text-[10px] font-bold uppercase">ОТПРАВИТЬ ПИСЬМО</span>
                </Button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-slate-400"><UserCheck className="w-4 h-4" /> Контакты (Extract)</h3>
                  <div className="space-y-3">
                    {selectedTask?.extracted_emails?.length > 0 ? selectedTask.extracted_emails.map((e: any, i: number) => (
                      <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                        <div className="flex justify-between items-center"><span className="text-sm font-mono">{e.value}</span><Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => navigator.clipboard.writeText(e.value)}><Copy className="w-3 h-3 mr-1" /> Copy</Button></div>
                        {e.context && <p className="text-[10px] text-slate-500 italic bg-black/20 p-2 rounded">...{e.context}...</p>}
                      </div>
                    )) : <p className="text-xs text-slate-600 italic">Emails not found</p>}

                    {selectedTask?.extracted_phones?.length > 0 && (
                      <div className="pt-4 space-y-3">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase">Телефоны</h4>
                        {selectedTask.extracted_phones.map((p: any, i: number) => (
                           <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                             <div className="flex justify-between items-center"><span className="text-sm font-mono">{p.value}</span></div>
                             {p.context && <p className="text-[10px] text-slate-500 italic bg-black/20 p-2 rounded">...{p.context}...</p>}
                           </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
        <DialogContent className="bg-[#0b1120] border-white/10 text-slate-50 max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Mail className="w-5 h-5 text-primary" /> Отправка отчета</DialogTitle></DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Кому</label>
              <Input readOnly value={selectedTask?.extracted_emails?.[0]?.value || ''} className="bg-white/5 border-white/10" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Сообщение</label>
              <Textarea 
                rows={8} 
                className="bg-white/5 border-white/10"
                value={emailBody || `Hello,\n\nOur compliance engine has identified potential GDPR liabilities on ${selectedTask?.url}. Please find the attached detailed audit report.\n\nBest regards,\nHumango Team`}
                onChange={(e) => setEmailBody(e.target.value)}
              />
            </div>
            <Button className="w-full bg-primary font-bold h-12" onClick={handleSendEmail} disabled={isSendingEmail}>
              {isSendingEmail ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
              Отправить аудит
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showClosingPriceDialog} onOpenChange={setShowClosingPriceDialog}>
        <DialogContent className="bg-[#0b1120] border-white/10 text-slate-50 max-w-md p-8">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-500" /> Фиксация сделки</DialogTitle></DialogHeader>
            <div className="space-y-6 pt-4">
                <p className="text-sm text-slate-400">Укажите финальную сумму заказа для закрытия задачи.</p>
                <Input type="number" placeholder="500" value={closingPrice} onChange={(e) => setClosingPrice(e.target.value)} className="bg-white/5 border-white/10 h-12 text-lg font-bold" />
                <Button className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold h-12" onClick={confirmStatusUpdate}>Подтвердить выполнение</Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
