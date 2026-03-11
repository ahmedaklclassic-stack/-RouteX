/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  School as SchoolIcon, 
  Users, 
  Map as MapIcon, 
  FileText, 
  Settings, 
  LogOut, 
  Plus, 
  Download, 
  Upload, 
  Trash2, 
  Edit, 
  Search,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Printer,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { User, School, Inspector, Route } from './types';

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
      active 
        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
        : 'text-slate-600 hover:bg-slate-100'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const Card = ({ children, title, subtitle, action }: { children: React.ReactNode, title?: string, subtitle?: string, action?: React.ReactNode }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    {(title || action) && (
      <div className="px-6 py-4 border-bottom border-slate-100 flex items-center justify-between">
        <div>
          {title && <h3 className="text-lg font-bold text-slate-800">{title}</h3>}
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
      >
        <div className="px-6 py-4 border-bottom border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-xl font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <Plus className="rotate-45" size={24} />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
          <p className="text-slate-500 mb-6">{message}</p>
          <div className="flex gap-3">
            <button 
              onClick={onConfirm}
              className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold hover:bg-red-700 transition-all"
            >
              تأكيد الحذف
            </button>
            <button 
              onClick={onClose}
              className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-xl font-bold hover:bg-slate-200 transition-all"
            >
              إلغاء
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [schools, setSchools] = useState<School[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [licenseStatus, setLicenseStatus] = useState<{ active: boolean, expiryDate?: string } | null>(null);
  const [licenseWarning, setLicenseWarning] = useState<string | null>(null);
  const [machineId, setMachineId] = useState<string>('');

  // Form States
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [schoolForm, setSchoolForm] = useState<Partial<School>>({});
  const [inspectorForm, setInspectorForm] = useState<Partial<Inspector>>({});
  const [routeForm, setRouteForm] = useState<Partial<Route>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'school' | 'inspector' | 'route' | 'license' | 'restore'>('school');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean, type: 'schools' | 'inspectors' | 'routes' | null, id: number | null }>({
    isOpen: false,
    type: null,
    id: null
  });

  // Filter States
  const [filters, setFilters] = useState({
    dateStart: '',
    dateEnd: '',
    inspectorId: '',
    schoolId: '',
    search: '',
    inspectorStatus: 'all',
    specialization: 'all'
  });

  useEffect(() => {
    checkLicense();
    fetchData();
  }, []);

  const checkLicense = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setLicenseStatus(data);
      
      const today = new Date();
      
      if (!data.active) {
        setLicenseWarning('تنبيه: نسخة البرنامج غير منشطة. يرجى التواصل مع المطور لتنشيط الخدمة.');
      } else if (data.expiryDate) {
        const expiry = new Date(data.expiryDate);
        const diffTime = expiry.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
          setLicenseWarning('تنبيه: انتهت صلاحية الترخيص. يرجى التجديد فوراً لضمان استمرار الخدمة.');
        } else if (diffDays <= 30) {
          setLicenseWarning(`تنبيه: الترخيص سينتهي خلال ${diffDays} يوم. يرجى التجديد لضمان استمرار الخدمة.`);
        } else {
          setLicenseWarning(null);
        }
      } else {
        setLicenseWarning(null);
      }
      
      const machineRes = await fetch('/api/machine-id');
      const machineData = await machineRes.json();
      setMachineId(machineData.machineId);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sRes, iRes, rRes] = await Promise.all([
        fetch('/api/schools'),
        fetch('/api/inspectors'),
        fetch('/api/routes')
      ]);
      setSchools(await sRes.json());
      setInspectors(await iRes.json());
      setRoutes(await rRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      if (res.ok) {
        setUser(await res.json());
      } else {
        alert('بيانات الدخول غير صحيحة');
      }
    } catch (e) {
      alert('حدث خطأ في الاتصال');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('dashboard');
  };

  const handleSaveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/schools/${editingId}` : '/api/schools';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schoolForm)
    });
    setIsModalOpen(false);
    fetchData();
  };

  const handleSaveInspector = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/inspectors/${editingId}` : '/api/inspectors';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inspectorForm)
    });
    setIsModalOpen(false);
    fetchData();
  };

  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(routeForm)
    });
    setIsModalOpen(false);
    fetchData();
  };

  const handleDelete = (type: 'schools' | 'inspectors' | 'routes', id: number) => {
    setDeleteConfirm({ isOpen: true, type, id });
  };

  const confirmDelete = async () => {
    if (deleteConfirm.type && deleteConfirm.id) {
      await fetch(`/api/${deleteConfirm.type}/${deleteConfirm.id}`, { method: 'DELETE' });
      setDeleteConfirm({ isOpen: false, type: null, id: null });
      fetchData();
    }
  };

  const handleExportExcel = (type: 'schools' | 'inspectors') => {
    const data = type === 'schools' ? schools : inspectors;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type === 'schools' ? 'المدارس' : 'المفتشين');
    XLSX.writeFile(wb, `${type === 'schools' ? 'schools' : 'inspectors'}.xlsx`);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>, type: 'schools' | 'inspectors') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (data.length === 0) {
          alert('الملف فارغ أو غير صالح');
          return;
        }

        let successCount = 0;
        let skipCount = 0;
        for (const item of data as any[]) {
          // Check for duplicates
          const isDuplicate = type === 'schools' 
            ? schools.some(s => 
                s.name === item.name && 
                s.stage === item.stage && 
                s.type === item.type && 
                s.admin_area === item.admin_area && 
                s.address === item.address
              )
            : inspectors.some(i => 
                i.name === item.name && 
                i.job_title === item.job_title && 
                i.specialization === item.specialization
              );

          if (isDuplicate) {
            skipCount++;
            continue;
          }

          const response = await fetch(`/api/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
          });
          if (response.ok) successCount++;
        }
        
        fetchData();
        let message = `تم استيراد ${successCount} سجل بنجاح`;
        if (skipCount > 0) {
          message += `\nتم تخطي ${skipCount} سجل مكرر موجود مسبقاً`;
        }
        alert(message);
      } catch (error) {
        console.error('Import error:', error);
        alert('حدث خطأ أثناء استيراد البيانات. تأكد من صحة تنسيق الملف.');
      }
      // Reset input
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleBackup = () => {
    window.location.href = '/api/backup';
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: content
      });
      fetchData();
      alert('تم استعادة البيانات بنجاح');
    };
    reader.readAsText(file);
  };

  const generatePDFReport = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Add Arabic Font (Amiri)
    // Note: In a real production app, you'd bundle the font as a base64 string
    // This is a simplified approach for the demo
    doc.addFont('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf', 'Roboto', 'normal');
    
    // Header
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(22);
    doc.text('تقرير خطوط سير المفتشين', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`تاريخ التقرير: ${format(new Date(), 'yyyy/MM/dd')}`, 190, 30, { align: 'right' });
    doc.text(`بواسطة: ${user?.username}`, 20, 30, { align: 'left' });

    const filteredRoutes = routes.filter(r => {
      const dateMatch = (!filters.dateStart || r.date >= filters.dateStart) && 
                       (!filters.dateEnd || r.date <= filters.dateEnd);
      const inspectorMatch = !filters.inspectorId || r.inspector_id === parseInt(filters.inspectorId);
      const schoolMatch = !filters.schoolId || r.school_id === parseInt(filters.schoolId);
      return dateMatch && inspectorMatch && schoolMatch;
    });

    // Summary Section
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('ملخص التقرير:', 190, 55, { align: 'right' });
    
    doc.setFontSize(11);
    doc.text(`إجمالي الزيارات: ${filteredRoutes.length}`, 180, 65, { align: 'right' });
    doc.text(`عدد المفتشين المشاركين: ${new Set(filteredRoutes.map(r => r.inspector_id)).size}`, 180, 72, { align: 'right' });
    doc.text(`عدد المدارس التي تمت زيارتها: ${new Set(filteredRoutes.map(r => r.school_id)).size}`, 180, 79, { align: 'right' });

    const tableData = filteredRoutes.map(r => [
      r.date,
      r.inspector_name,
      r.school_name
    ]);

    (doc as any).autoTable({
      head: [['التاريخ', 'المفتش', 'المدرسة']],
      body: tableData,
      startY: 90,
      styles: { 
        font: 'Roboto',
        halign: 'right',
        fontSize: 10,
        cellPadding: 5
      },
      headStyles: { 
        fillColor: [16, 185, 129],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { top: 90 }
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`صفحة ${i} من ${pageCount}`, 105, 285, { align: 'center' });
      doc.text('نظام تنظيم خطوط السير - CCS', 20, 285, { align: 'left' });
    }

    doc.save(`report_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = (e.target as any).key.value;
    await fetch('/api/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    });
    checkLicense();
    setIsModalOpen(false);
  };

  const isLicenseExpired = licenseStatus?.active && licenseStatus?.expiryDate && new Date(licenseStatus.expiryDate) < new Date();

  if ((!licenseStatus?.active || isLicenseExpired) && user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-right" dir="rtl">
        <Card title="تنشيط البرنامج" subtitle={isLicenseExpired ? "انتهت صلاحية الترخيص" : "النسخة غير منشطة"}>
          <div className="space-y-6">
            <div className={`p-4 rounded-xl flex items-start gap-3 border ${isLicenseExpired ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
              <AlertCircle className={isLicenseExpired ? 'text-red-600 shrink-0' : 'text-amber-600 shrink-0'} />
              <p className={isLicenseExpired ? 'text-red-800 text-sm' : 'text-amber-800 text-sm'}>
                {isLicenseExpired 
                  ? 'لقد انتهت صلاحية الترخيص الخاص بك. يرجى التواصل مع المطور لتجديد الاشتراك.'
                  : 'يرجى التواصل مع المطور لتنشيط النسخة. قم بتزويده برقم الجهاز الموضح أدناه.'}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">رقم الجهاز (Machine ID)</label>
              <div className="p-3 bg-slate-100 rounded-lg font-mono text-center select-all border border-slate-200">
                {machineId}
              </div>
            </div>

            <form onSubmit={handleActivate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">كود التنشيط</label>
                <input 
                  name="key"
                  required
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="أدخل كود التنشيط هنا"
                />
              </div>
              <button className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 transition-colors">
                تنشيط الآن
              </button>
            </form>

            <div className="pt-6 border-t border-slate-100">
              <h4 className="font-bold text-slate-800 mb-2">بيانات المطور:</h4>
              <div className="text-sm text-slate-600 space-y-1">
                <p>الشركة: CCS</p>
                <p>الهاتف: 01008875157</p>
                <p>البريد: ahmedakl.classic@gmail.com</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-emerald-600 p-8 text-white text-center">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                <ShieldCheck size={40} />
              </div>
              <h1 className="text-2xl font-bold">نظام تنظيم خطوط السير</h1>
              <p className="text-emerald-100 opacity-80">تسجيل الدخول للمتابعة</p>
            </div>
            <form onSubmit={handleLogin} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">اسم المستخدم</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    value={loginForm.username}
                    onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                  />
                  <Users className="absolute right-3 top-3.5 text-slate-400" size={20} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">كلمة المرور</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    value={loginForm.password}
                    onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                  />
                  <Settings className="absolute right-3 top-3.5 text-slate-400" size={20} />
                </div>
              </div>
              <button className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]">
                دخول
              </button>
            </form>
            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400">جميع الحقوق محفوظة لشركة CCS &copy; 2026</p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-left border-slate-200 p-6 flex flex-col gap-8 sticky top-0 h-screen">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
            <MapIcon size={24} />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 leading-tight">نظام السير</h2>
            <p className="text-xs text-slate-500">لوحة التحكم</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="الرئيسية" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <SidebarItem 
            icon={SchoolIcon} 
            label="المدارس" 
            active={activeTab === 'schools'} 
            onClick={() => setActiveTab('schools')} 
          />
          <SidebarItem 
            icon={Users} 
            label="المفتشين" 
            active={activeTab === 'inspectors'} 
            onClick={() => setActiveTab('inspectors')} 
          />
          <SidebarItem 
            icon={MapIcon} 
            label="خطوط السير" 
            active={activeTab === 'routes'} 
            onClick={() => setActiveTab('routes')} 
          />
          <SidebarItem 
            icon={FileText} 
            label="التقارير" 
            active={activeTab === 'reports'} 
            onClick={() => setActiveTab('reports')} 
          />
          {user.role === 'admin' && (
            <SidebarItem 
              icon={Settings} 
              label="الإعدادات" 
              active={activeTab === 'settings'} 
              onClick={() => setActiveTab('settings')} 
            />
          )}
        </nav>

        <div className="pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold">
              {user.username[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{user.username}</p>
              <p className="text-xs text-slate-500">{user.role === 'admin' ? 'مدير النظام' : 'مستخدم'}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            <LogOut size={20} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {licenseWarning && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${
              licenseStatus?.active === false || isLicenseExpired
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-amber-100 border border-amber-200 text-amber-800'
            }`}
          >
            <AlertCircle size={20} />
            <span className="font-bold">{licenseWarning}</span>
          </motion.div>
        )}
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <header className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-slate-800">مرحباً بك، {user.username}</h1>
                  <p className="text-slate-500">إليك ملخص سريع لنشاط النظام اليوم</p>
                </div>
                <div className="text-left">
                  <p className="text-lg font-bold text-slate-700">{format(new Date(), 'EEEE, d MMMM yyyy', { locale: ar })}</p>
                  <p className="text-sm text-slate-500">آخر تحديث: {format(new Date(), 'HH:mm')}</p>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                  <div className="relative">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 shadow-sm">
                      <SchoolIcon size={24} />
                    </div>
                    <p className="text-slate-500 text-sm font-bold">إجمالي المدارس</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <h3 className="text-3xl font-bold text-slate-800">{schools.length}</h3>
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">مدرسة</span>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  whileHover={{ y: -5 }}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                  <div className="relative">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 shadow-sm">
                      <Users size={24} />
                    </div>
                    <p className="text-slate-500 text-sm font-bold">إجمالي المفتشين</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <h3 className="text-3xl font-bold text-slate-800">{inspectors.length}</h3>
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">مفتش</span>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  whileHover={{ y: -5 }}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                  <div className="relative">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4 shadow-sm">
                      <MapIcon size={24} />
                    </div>
                    <p className="text-slate-500 text-sm font-bold">خطوط سير اليوم</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <h3 className="text-3xl font-bold text-slate-800">
                        {routes.filter(r => r.date === format(new Date(), 'yyyy-MM-dd')).length}
                      </h3>
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">زيارة</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card title="أحدث خطوط السير">
                  <div className="space-y-4">
                    {routes.slice(-5).reverse().map(route => (
                      <div key={route.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-400 shadow-sm">
                            <Calendar size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{route.inspector_name}</p>
                            <p className="text-sm text-slate-500">{route.school_name}</p>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-slate-400">{route.date}</span>
                      </div>
                    ))}
                    {routes.length === 0 && <p className="text-center text-slate-400 py-8">لا توجد خطوط سير مسجلة</p>}
                  </div>
                </Card>

                <Card title="حالة المفتشين">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="text-emerald-600" />
                        <span className="font-bold text-emerald-800">نشط</span>
                      </div>
                      <span className="text-2xl font-bold text-emerald-600">
                        {inspectors.filter(i => i.status === 'active').length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="text-red-600" />
                        <span className="font-bold text-red-800">معطل / أجازة</span>
                      </div>
                      <span className="text-2xl font-bold text-red-600">
                        {inspectors.filter(i => i.status === 'disabled').length}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'schools' && (
            <motion.div 
              key="schools"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <header className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-slate-800">إدارة المدارس</h1>
                  <p className="text-slate-500">إضافة وتعديل بيانات المدارس التابعة</p>
                </div>
                <div className="flex gap-3">
                  {user.role === 'admin' && (
                    <>
                      <label className="bg-white text-slate-700 px-4 py-2 rounded-xl border border-slate-200 font-bold flex items-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors">
                        <Upload size={18} />
                        <span>استيراد Excel</span>
                        <input type="file" className="hidden" accept=".xlsx,.xls" onChange={e => handleImportExcel(e, 'schools')} />
                      </label>
                      <button 
                        onClick={() => handleExportExcel('schools')}
                        className="bg-white text-slate-700 px-4 py-2 rounded-xl border border-slate-200 font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors"
                      >
                        <Download size={18} />
                        <span>تصدير Excel</span>
                      </button>
                      <button 
                        onClick={() => {
                          setModalType('school');
                          setSchoolForm({});
                          setEditingId(null);
                          setIsModalOpen(true);
                        }}
                        className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all"
                      >
                        <Plus size={20} />
                        <span>إضافة مدرسة</span>
                      </button>
                    </>
                  )}
                </div>
              </header>

              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="border-bottom border-slate-100">
                        <th className="px-4 py-4 text-slate-500 font-bold">اسم المدرسة</th>
                        <th className="px-4 py-4 text-slate-500 font-bold">المرحلة</th>
                        <th className="px-4 py-4 text-slate-500 font-bold">النوعية</th>
                        <th className="px-4 py-4 text-slate-500 font-bold">الإدارة</th>
                        <th className="px-4 py-4 text-slate-500 font-bold">العنوان</th>
                        {user.role === 'admin' && <th className="px-4 py-4 text-slate-500 font-bold">الإجراءات</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {schools.map(school => (
                        <tr key={school.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-4 font-bold text-slate-800">{school.name}</td>
                          <td className="px-4 py-4 text-slate-600">{school.stage}</td>
                          <td className="px-4 py-4 text-slate-600">{school.type}</td>
                          <td className="px-4 py-4 text-slate-600">{school.admin_area}</td>
                          <td className="px-4 py-4 text-slate-500 text-sm">{school.address}</td>
                          {user.role === 'admin' && (
                            <td className="px-4 py-4">
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => {
                                    setModalType('school');
                                    setSchoolForm(school);
                                    setEditingId(school.id);
                                    setIsModalOpen(true);
                                  }}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <Edit size={18} />
                                </button>
                                <button 
                                  onClick={() => handleDelete('schools', school.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {schools.length === 0 && <p className="text-center text-slate-400 py-12">لا توجد مدارس مسجلة</p>}
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'inspectors' && (
            <motion.div 
              key="inspectors"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <header className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-slate-800">إدارة المفتشين</h1>
                  <p className="text-slate-500">إدارة بيانات وحالات المفتشين</p>
                </div>
                <div className="flex gap-3">
                  <div className="relative w-64">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      placeholder="بحث باسم المفتش..."
                      className="w-full pr-10 pl-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-700"
                      value={filters.search}
                      onChange={e => setFilters({ ...filters, search: e.target.value })}
                    />
                  </div>
                  <div className="flex bg-white border border-slate-200 rounded-xl p-1">
                    <button 
                      onClick={() => setFilters({ ...filters, inspectorStatus: 'all' })}
                      className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                        filters.inspectorStatus === 'all' 
                          ? 'bg-slate-900 text-white shadow-sm' 
                          : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      الكل
                    </button>
                    <button 
                      onClick={() => setFilters({ ...filters, inspectorStatus: 'active' })}
                      className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                        filters.inspectorStatus === 'active' 
                          ? 'bg-emerald-600 text-white shadow-sm' 
                          : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      نشط
                    </button>
                    <button 
                      onClick={() => setFilters({ ...filters, inspectorStatus: 'disabled' })}
                      className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                        filters.inspectorStatus === 'disabled' 
                          ? 'bg-red-600 text-white shadow-sm' 
                          : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      معطل
                    </button>
                  </div>
                  <div className="w-48">
                    <select 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-bold text-slate-700"
                      value={filters.specialization}
                      onChange={e => setFilters({ ...filters, specialization: e.target.value })}
                    >
                      <option value="all">كل التخصصات</option>
                      {Array.from(new Set(inspectors.map(i => i.specialization))).filter(Boolean).map(spec => (
                        <option key={spec} value={spec}>{spec}</option>
                      ))}
                    </select>
                  </div>
                  {user.role === 'admin' && (
                    <>
                      <label className="bg-white text-slate-700 px-4 py-2 rounded-xl border border-slate-200 font-bold flex items-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors">
                        <Upload size={18} />
                        <span>استيراد Excel</span>
                        <input type="file" className="hidden" accept=".xlsx,.xls" onChange={e => handleImportExcel(e, 'inspectors')} />
                      </label>
                      <button 
                        onClick={() => handleExportExcel('inspectors')}
                        className="bg-white text-slate-700 px-4 py-2 rounded-xl border border-slate-200 font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors"
                      >
                        <Download size={18} />
                        <span>تصدير Excel</span>
                      </button>
                      <button 
                        onClick={() => {
                          setModalType('inspector');
                          setInspectorForm({ status: 'active' });
                          setEditingId(null);
                          setIsModalOpen(true);
                        }}
                        className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all"
                      >
                        <Plus size={20} />
                        <span>إضافة مفتش</span>
                      </button>
                    </>
                  )}
                </div>
              </header>

              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="border-bottom border-slate-100">
                        <th className="px-4 py-4 text-slate-500 font-bold">الاسم الكامل</th>
                        <th className="px-4 py-4 text-slate-500 font-bold">المسمى الوظيفي</th>
                        <th className="px-4 py-4 text-slate-500 font-bold">التخصص</th>
                        <th className="px-4 py-4 text-slate-500 font-bold">الحالة</th>
                        <th className="px-4 py-4 text-slate-500 font-bold">تفاصيل التعطيل</th>
                        {user.role === 'admin' && <th className="px-4 py-4 text-slate-500 font-bold">الإجراءات</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {inspectors
                        .filter(inspector => {
                          const statusMatch = filters.inspectorStatus === 'all' || inspector.status === filters.inspectorStatus;
                          const specMatch = filters.specialization === 'all' || inspector.specialization === filters.specialization;
                          const nameMatch = !filters.search || inspector.name.toLowerCase().includes(filters.search.toLowerCase());
                          return statusMatch && specMatch && nameMatch;
                        })
                        .map(inspector => (
                        <tr key={inspector.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-4 font-bold text-slate-800">{inspector.name}</td>
                          <td className="px-4 py-4 text-slate-600">{inspector.job_title}</td>
                          <td className="px-4 py-4 text-slate-600">{inspector.specialization}</td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                inspector.status === 'active' 
                                  ? 'bg-green-100 text-green-700 border border-green-200' 
                                  : 'bg-red-100 text-red-700 border border-red-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  inspector.status === 'active' ? 'bg-green-600' : 'bg-red-600'
                                }`} />
                                {inspector.status === 'active' ? 'نشط' : 'معطل'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {inspector.status === 'disabled' ? (
                              <div className="text-sm">
                                <p className="font-bold text-slate-700">{inspector.disable_reason || 'غير محدد'}</p>
                                {(inspector.leave_start || inspector.leave_end) && (
                                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                    <Calendar size={12} />
                                    <span>
                                      {inspector.leave_start && `من: ${inspector.leave_start}`}
                                      {inspector.leave_end && ` إلى: ${inspector.leave_end}`}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          {user.role === 'admin' && (
                            <td className="px-4 py-4">
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => {
                                    setModalType('inspector');
                                    setInspectorForm(inspector);
                                    setEditingId(inspector.id);
                                    setIsModalOpen(true);
                                  }}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <Edit size={18} />
                                </button>
                                <button 
                                  onClick={() => handleDelete('inspectors', inspector.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {inspectors.length === 0 && <p className="text-center text-slate-400 py-12">لا يوجد مفتشين مسجلين</p>}
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'routes' && (
            <motion.div 
              key="routes"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <header className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-slate-800">خطوط السير</h1>
                  <p className="text-slate-500">تنظيم وربط المفتشين بالمدارس</p>
                </div>
                <button 
                  onClick={() => {
                    setModalType('route');
                    setRouteForm({ date: format(new Date(), 'yyyy-MM-dd') });
                    setIsModalOpen(true);
                  }}
                  className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all"
                >
                  <Plus size={20} />
                  <span>إنشاء خط سير</span>
                </button>
              </header>

              <Card>
                <div className="flex flex-wrap gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-slate-500 mb-1">بحث</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="ابحث عن مفتش أو مدرسة..."
                        className="w-full pl-4 pr-10 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                        value={filters.search}
                        onChange={e => setFilters({ ...filters, search: e.target.value })}
                      />
                      <Search className="absolute right-3 top-2.5 text-slate-400" size={16} />
                    </div>
                  </div>
                  <div className="w-40">
                    <label className="block text-xs font-bold text-slate-500 mb-1">من تاريخ</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={filters.dateStart}
                      onChange={e => setFilters({ ...filters, dateStart: e.target.value })}
                    />
                  </div>
                  <div className="w-40">
                    <label className="block text-xs font-bold text-slate-500 mb-1">إلى تاريخ</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={filters.dateEnd}
                      onChange={e => setFilters({ ...filters, dateEnd: e.target.value })}
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="border-bottom border-slate-100">
                        <th className="px-4 py-4 text-slate-500 font-bold">التاريخ</th>
                        <th className="px-4 py-4 text-slate-500 font-bold">المفتش</th>
                        <th className="px-4 py-4 text-slate-500 font-bold">المدرسة</th>
                        <th className="px-4 py-4 text-slate-500 font-bold">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {routes
                        .filter(r => {
                          const searchMatch = !filters.search || 
                            r.inspector_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
                            r.school_name?.toLowerCase().includes(filters.search.toLowerCase());
                          const dateMatch = (!filters.dateStart || r.date >= filters.dateStart) && 
                                           (!filters.dateEnd || r.date <= filters.dateEnd);
                          return searchMatch && dateMatch;
                        })
                        .reverse()
                        .map(route => (
                          <tr key={route.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-4 font-bold text-slate-800">{route.date}</td>
                            <td className="px-4 py-4 text-slate-600">{route.inspector_name}</td>
                            <td className="px-4 py-4 text-slate-600">{route.school_name}</td>
                            <td className="px-4 py-4">
                              <button 
                                onClick={() => handleDelete('routes', route.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {routes.length === 0 && <p className="text-center text-slate-400 py-12">لا توجد خطوط سير مسجلة</p>}
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div 
              key="reports"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <header className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-slate-800">التقارير</h1>
                  <p className="text-slate-500">إصدار تقارير احترافية لخطوط السير</p>
                </div>
                <button 
                  onClick={generatePDFReport}
                  className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all"
                >
                  <Printer size={20} />
                  <span>طباعة PDF</span>
                </button>
              </header>

              <Card title="تصفية التقرير">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">من تاريخ</label>
                    <input 
                      type="date" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={filters.dateStart}
                      onChange={e => setFilters({ ...filters, dateStart: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">إلى تاريخ</label>
                    <input 
                      type="date" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={filters.dateEnd}
                      onChange={e => setFilters({ ...filters, dateEnd: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">المفتش</label>
                    <select 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={filters.inspectorId}
                      onChange={e => setFilters({ ...filters, inspectorId: e.target.value })}
                    >
                      <option value="">الكل</option>
                      {inspectors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">المدرسة</label>
                    <select 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                      value={filters.schoolId}
                      onChange={e => setFilters({ ...filters, schoolId: e.target.value })}
                    >
                      <option value="">الكل</option>
                      {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              </Card>

              <Card title="معاينة التقرير">
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-slate-500 font-bold">المدرسة</th>
                        <th className="px-4 py-3 text-slate-500 font-bold">المفتش المكلف</th>
                        <th className="px-4 py-3 text-slate-500 font-bold">تاريخ الزيارة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {schools
                        .filter(s => !filters.schoolId || s.id === parseInt(filters.schoolId))
                        .map(school => {
                          const schoolRoutes = routes.filter(r => {
                            const isThisSchool = r.school_id === school.id;
                            const dateMatch = (!filters.dateStart || r.date >= filters.dateStart) && 
                                             (!filters.dateEnd || r.date <= filters.dateEnd);
                            const inspectorMatch = !filters.inspectorId || r.inspector_id === parseInt(filters.inspectorId);
                            return isThisSchool && dateMatch && inspectorMatch;
                          });

                          if (schoolRoutes.length === 0) {
                            // If we have filters active, we might not want to show schools with no matches
                            if (filters.dateStart || filters.dateEnd || filters.inspectorId || filters.schoolId) {
                              return null;
                            }
                            return (
                              <tr key={school.id} className="opacity-50">
                                <td className="px-4 py-3 font-bold text-slate-400">{school.name}</td>
                                <td className="px-4 py-3 text-slate-300">لا توجد زيارات</td>
                                <td className="px-4 py-3 text-slate-300">-</td>
                              </tr>
                            );
                          }

                          return schoolRoutes.map((route, idx) => (
                            <tr key={`${school.id}-${route.id}`} className={idx === 0 ? 'border-t-2 border-slate-200' : ''}>
                              <td className="px-4 py-3 font-bold text-slate-800">{idx === 0 ? school.name : ''}</td>
                              <td className="px-4 py-3 text-emerald-700 font-medium">{route.inspector_name}</td>
                              <td className="px-4 py-3 text-slate-600">{route.date}</td>
                            </tr>
                          ));
                        })}
                    </tbody>
                  </table>
                  {schools.length === 0 && <p className="text-center text-slate-400 py-12">لا توجد مدارس مسجلة</p>}
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <header>
                <h1 className="text-3xl font-bold text-slate-800">الإعدادات</h1>
                <p className="text-slate-500">إدارة النظام والنسخ الاحتياطي</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card title="النسخ الاحتياطي والاستعادة">
                  <div className="space-y-6">
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                      <h4 className="font-bold text-blue-800 mb-1">تصدير البيانات</h4>
                      <p className="text-sm text-blue-600 mb-4">قم بتحميل نسخة كاملة من قاعدة البيانات للرجوع إليها لاحقاً.</p>
                      <button 
                        onClick={handleBackup}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <Download size={18} />
                        <span>تحميل النسخة الاحتياطية</span>
                      </button>
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                      <h4 className="font-bold text-amber-800 mb-1">استعادة البيانات</h4>
                      <p className="text-sm text-amber-600 mb-4">تحذير: هذه العملية ستقوم باستبدال كافة البيانات الحالية بالنسخة المرفوعة.</p>
                      <label className="bg-amber-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-amber-700 transition-colors flex items-center gap-2 cursor-pointer w-fit">
                        <Upload size={18} />
                        <span>رفع ملف الاستعادة</span>
                        <input type="file" className="hidden" accept=".json" onChange={handleRestore} />
                      </label>
                    </div>
                  </div>
                </Card>

                <Card title="معلومات الترخيص">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500">حالة التنشيط:</span>
                      <span className="font-bold text-emerald-600">منشط</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500">تاريخ الانتهاء:</span>
                      <span className="font-bold text-slate-800">
                        {licenseStatus?.expiryDate ? format(new Date(licenseStatus.expiryDate), 'yyyy/MM/dd') : 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500">رقم الجهاز:</span>
                      <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{machineId}</span>
                    </div>
                    <button 
                      onClick={() => {
                        setModalType('license');
                        setIsModalOpen(true);
                      }}
                      className="w-full mt-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                    >
                      تحديث كود التنشيط
                    </button>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={
          modalType === 'school' ? (editingId ? 'تعديل مدرسة' : 'إضافة مدرسة') :
          modalType === 'inspector' ? (editingId ? 'تعديل مفتش' : 'إضافة مفتش') :
          modalType === 'route' ? 'إنشاء خط سير' :
          modalType === 'license' ? 'تنشيط البرنامج' : ''
        }
      >
        {modalType === 'school' && (
          <form onSubmit={handleSaveSchool} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">اسم المدرسة</label>
                <input 
                  required
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={schoolForm.name || ''}
                  onChange={e => setSchoolForm({ ...schoolForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">المرحلة</label>
                <select 
                  required
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={schoolForm.stage || ''}
                  onChange={e => setSchoolForm({ ...schoolForm, stage: e.target.value })}
                >
                  <option value="">اختر المرحلة</option>
                  <option value="ابتدائي">ابتدائي</option>
                  <option value="إعدادي">إعدادي</option>
                  <option value="ثانوي عام">ثانوي عام</option>
                  <option value="ثانوي فني">ثانوي فني</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">النوعية</label>
                <input 
                  list="school-types"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={schoolForm.type || ''}
                  onChange={e => setSchoolForm({ ...schoolForm, type: e.target.value })}
                />
                <datalist id="school-types">
                  {Array.from(new Set(schools.map(s => s.type))).filter(Boolean).map(type => (
                    <option key={type} value={type} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">الإدارة</label>
                <input 
                  list="admin-areas"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={schoolForm.admin_area || ''}
                  onChange={e => setSchoolForm({ ...schoolForm, admin_area: e.target.value })}
                />
                <datalist id="admin-areas">
                  {Array.from(new Set(schools.map(s => s.admin_area))).filter(Boolean).map(area => (
                    <option key={area} value={area} />
                  ))}
                </datalist>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">العنوان</label>
              <textarea 
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={schoolForm.address || ''}
                onChange={e => setSchoolForm({ ...schoolForm, address: e.target.value })}
              />
            </div>
            <button className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all">
              حفظ البيانات
            </button>
          </form>
        )}

        {modalType === 'inspector' && (
          <form onSubmit={handleSaveInspector} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">الاسم الكامل</label>
                <input 
                  required
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={inspectorForm.name || ''}
                  onChange={e => setInspectorForm({ ...inspectorForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">المسمى الوظيفي</label>
                <input 
                  required
                  list="job-titles"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={inspectorForm.job_title || ''}
                  onChange={e => setInspectorForm({ ...inspectorForm, job_title: e.target.value })}
                />
                <datalist id="job-titles">
                  {Array.from(new Set(inspectors.map(i => i.job_title))).filter(Boolean).map(title => (
                    <option key={title} value={title} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">التخصص</label>
                <input 
                  required
                  list="specializations"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={inspectorForm.specialization || ''}
                  onChange={e => setInspectorForm({ ...inspectorForm, specialization: e.target.value })}
                />
                <datalist id="specializations">
                  {Array.from(new Set(inspectors.map(i => i.specialization))).filter(Boolean).map(spec => (
                    <option key={spec} value={spec} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">الحالة</label>
                <select 
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={inspectorForm.status || 'active'}
                  onChange={e => setInspectorForm({ ...inspectorForm, status: e.target.value as any })}
                >
                  <option value="active">نشط</option>
                  <option value="disabled">معطل / أجازة</option>
                </select>
              </div>
            </div>

            {inspectorForm.status === 'disabled' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-4 border-t border-slate-100">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">سبب التعطيل</label>
                  <select 
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={inspectorForm.disable_reason || ''}
                    onChange={e => setInspectorForm({ ...inspectorForm, disable_reason: e.target.value })}
                  >
                    <option value="">اختر السبب</option>
                    <option value="أحيل للمعاش">أحيل للمعاش</option>
                    <option value="نقل">نقل</option>
                    <option value="أجازة">أجازة</option>
                  </select>
                </div>
                {inspectorForm.disable_reason === 'أجازة' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">بداية الأجازة</label>
                      <input 
                        type="date"
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={inspectorForm.leave_start || ''}
                        onChange={e => setInspectorForm({ ...inspectorForm, leave_start: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">نهاية الأجازة</label>
                      <input 
                        type="date"
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={inspectorForm.leave_end || ''}
                        onChange={e => setInspectorForm({ ...inspectorForm, leave_end: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            <button className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all">
              حفظ البيانات
            </button>
          </form>
        )}

        {modalType === 'route' && (
          <form onSubmit={handleSaveRoute} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">التاريخ</label>
              <input 
                type="date"
                required
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={routeForm.date || ''}
                onChange={e => setRouteForm({ ...routeForm, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">المفتش</label>
              <select 
                required
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={routeForm.inspector_id || ''}
                onChange={e => setRouteForm({ ...routeForm, inspector_id: parseInt(e.target.value) })}
              >
                <option value="">اختر المفتش</option>
                {inspectors.filter(i => i.status === 'active').map(i => (
                  <option key={i.id} value={i.id}>{i.name} ({i.specialization})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">المدرسة</label>
              <select 
                required
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={routeForm.school_id || ''}
                onChange={e => setRouteForm({ ...routeForm, school_id: parseInt(e.target.value) })}
              >
                <option value="">اختر المدرسة</option>
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name} - {s.stage}</option>
                ))}
              </select>
            </div>
            <button className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all">
              تأكيد خط السير
            </button>
          </form>
        )}

        {modalType === 'license' && (
          <form onSubmit={handleActivate} className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">رقم الجهاز الحالي:</p>
              <p className="font-mono font-bold text-slate-800">{machineId}</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">كود التنشيط الجديد</label>
              <input 
                name="key"
                required
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="أدخل الكود المستلم من المطور"
              />
            </div>
            <button className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all">
              تحديث التنشيط
            </button>
          </form>
        )}
      </Modal>

      <ConfirmModal 
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, type: null, id: null })}
        onConfirm={confirmDelete}
        title="تأكيد الحذف"
        message={
          deleteConfirm.type === 'schools' ? 'هل أنت متأكد من حذف هذه المدرسة؟ سيتم حذف جميع البيانات المرتبطة بها.' :
          deleteConfirm.type === 'inspectors' ? 'هل أنت متأكد من حذف هذا المفتش؟' :
          'هل أنت متأكد من حذف خط السير هذا؟'
        }
      />
    </div>
  );
}
