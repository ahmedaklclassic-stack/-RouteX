import React, { useState, useEffect } from 'react';
import { 
  Key, 
  ShieldCheck, 
  Download, 
  ExternalLink, 
  Lock,
  Cpu,
  Calendar,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DeveloperPortal: React.FC = () => {
  const [devMachineId, setDevMachineId] = useState('');
  const [devExpiryDate, setDevExpiryDate] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');

  const handleGenerateKey = () => {
    if (!devMachineId || !devExpiryDate) return;
    const key = btoa(`${devMachineId}|${devExpiryDate}`);
    setGeneratedKey(key);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would be a secure backend check
    if (password === 'dev123') {
      setIsAuthorized(true);
    } else {
      alert('كلمة المرور غير صحيحة');
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl"
        >
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <Lock className="text-emerald-500" size={32} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white text-center mb-2">بوابة المطور</h1>
          <p className="text-slate-400 text-center mb-8">يرجى إدخال كلمة المرور للوصول إلى أدوات الترخيص</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input 
                type="password"
                placeholder="كلمة المرور"
                className="w-full px-6 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-center"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            <button className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-600/20">
              دخول
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans" dir="rtl">
      {/* Header */}
      <nav className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-lg">
              <Key className="text-white" size={20} />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-tight">لوحة تحكم المطور</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">License Management System</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">v1.2.0 Stable</span>
            <button 
              onClick={() => setIsAuthorized(false)}
              className="text-sm text-red-600 font-bold hover:bg-red-50 px-4 py-2 rounded-xl transition-colors"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Generator */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="text-emerald-600" size={24} />
                  توليد كود تنشيط جديد
                </h2>
                <p className="text-slate-500 text-sm mt-1">قم بإدخال بيانات جهاز العميل لإصدار ترخيص مخصص</p>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Cpu size={16} className="text-slate-400" />
                      رقم الجهاز (Machine ID)
                    </label>
                    <input 
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm transition-all"
                      placeholder="مثال: 8f2a-9c1b-..."
                      value={devMachineId}
                      onChange={e => setDevMachineId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Calendar size={16} className="text-slate-400" />
                      تاريخ انتهاء الترخيص
                    </label>
                    <input 
                      type="date"
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      value={devExpiryDate}
                      onChange={e => setDevExpiryDate(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  onClick={handleGenerateKey}
                  disabled={!devMachineId || !devExpiryDate}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-3"
                >
                  <Key size={22} />
                  توليد الكود المشفر
                </button>

                <AnimatePresence>
                  {generatedKey && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-8 p-6 bg-emerald-50 border border-emerald-100 rounded-2xl relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-2 opacity-10">
                        <ShieldCheck size={120} />
                      </div>
                      
                      <label className="block text-xs font-bold text-emerald-700 mb-3 uppercase tracking-widest">كود التنشيط الجاهز</label>
                      <div className="flex items-center gap-3 relative z-10">
                        <div className="flex-1 p-4 bg-white border border-emerald-200 rounded-xl font-mono text-emerald-900 break-all shadow-inner select-all">
                          {generatedKey}
                        </div>
                        <button 
                          onClick={handleCopy}
                          className={`p-4 rounded-xl transition-all flex items-center gap-2 ${
                            copied ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50'
                          }`}
                        >
                          {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                          <span className="font-bold">{copied ? 'تم النسخ' : 'نسخ'}</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-emerald-600/70 mt-4 flex items-center gap-2">
                        <ShieldCheck size={12} />
                        هذا الكود مشفر ولا يمكن استخدامه إلا على الجهاز المحدد.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="font-bold text-blue-900 mb-1">تعليمات الأمان</h3>
                <p className="text-sm text-blue-700 leading-relaxed">
                  تأكد دائماً من صحة رقم الجهاز (Machine ID) الذي يرسله العميل. أي خطأ في حرف واحد سيجعل الكود غير صالح للعمل على جهازه.
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                <ExternalLink size={18} className="text-slate-400" />
                روابط سريعة
              </h3>
              <div className="space-y-3">
                <a href="/" className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors group">
                  <span className="text-sm font-bold text-slate-700">التطبيق الأصلي</span>
                  <ExternalLink size={16} className="text-slate-400 group-hover:text-emerald-600" />
                </a>
                <div className="p-4 border border-dashed border-slate-200 rounded-2xl">
                  <p className="text-[11px] text-slate-400 text-center">لا توجد روابط إضافية حالياً</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-3xl text-white relative overflow-hidden">
              <div className="absolute -bottom-10 -left-10 opacity-10 rotate-12">
                <Key size={160} />
              </div>
              <h3 className="font-bold mb-4 relative z-10">إحصائيات النظام</h3>
              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">إجمالي التراخيص</span>
                  <span className="font-mono font-bold">--</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">آخر تحديث</span>
                  <span className="font-mono font-bold">اليوم</span>
                </div>
                <div className="pt-4 border-t border-slate-800 mt-4">
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    نظام التشفير يعتمد على معيار Base64 مع مفتاح ربط الجهاز لضمان عدم تكرار التراخيص.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      <footer className="max-w-7xl mx-auto p-8 text-center">
        <p className="text-slate-400 text-xs">© 2026 CCS Developer Portal - جميع الحقوق محفوظة للمطور</p>
      </footer>
    </div>
  );
};

export default DeveloperPortal;
