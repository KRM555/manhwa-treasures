import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { lovable } from '@/integrations/lovable/index';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, LogOut, History, FileImage, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface HistoryItem {
  id: string;
  image_name: string;
  extracted_count: number;
  created_at: string;
}

export function AuthModal() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserHistory = async () => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from('user_history')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setHistory(data);
    }
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (!isOpen || !user) {
      return;
    }

    fetchUserHistory();

    const channel = supabase
      .channel('public:user_history')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_history' },
        (payload) => {
          setHistory((prev) => [payload.new as HistoryItem, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, user]);

  const handleGoogleLogin = async () => {
    try {
      setOauthLoading('google');
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return; // Browser is redirecting to Google
      setOauthLoading(null);
    } catch (error: any) {
      toast.error('حدث خطأ أثناء الاتصال بجوجل: ' + error.message);
      setOauthLoading(null);
    }
  };

  const handleEmailAuth = async (isSignUp: boolean) => {
    if (!email || !password) {
      toast.error('يرجى كتابة البريد وكلمة المرور');
      return;
    }
    setLoading(true);
    const cleanEmail = email.trim();

    const { error } = isSignUp 
      ? await supabase.auth.signUp({ email: cleanEmail, password })
      : await supabase.auth.signInWithPassword({ email: cleanEmail, password });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(isSignUp ? 'تم إنشاء الحساب!' : 'تم تسجيل الدخول بنجاح!');
      setIsOpen(false);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.info('تم تسجيل الخروج');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-9 gap-2 text-xs font-bold rounded-xl border-orange-500/30 hover:bg-orange-500/10">
          <User className="w-4 h-4 text-orange-500" />
          {user ? (user.email?.split('@')[0] || 'بروفايلي') : 'حسابي / تسجيل الدخول'}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md rounded-2xl dir-rtl text-right">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-center">
            {user ? 'الملف الشخصي وسجل العمليات' : 'تسجيل الدخول / حساب جديد'}
          </DialogTitle>
        </DialogHeader>

        {user ? (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-xl border border-border/50 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-muted-foreground">الحساب المسجل:</p>
                <p className="text-xs font-bold text-foreground mt-0.5">{user.email}</p>
              </div>
              <Button onClick={handleLogout} variant="ghost" size="sm" className="h-8 text-xs text-red-400 hover:text-red-500 hover:bg-red-500/10 gap-1">
                <LogOut className="w-3.5 h-3.5" /> خروج
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-orange-500">
                <History className="w-4 h-4" />
                <span>سجل الاستخراج والترجمة السابقة:</span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {loadingHistory ? (
                  <p className="text-center text-xs text-muted-foreground py-4">جاري تحميل السجل...</p>
                ) : history.length === 0 ? (
                  <div className="text-center py-6 border border-dashed rounded-xl text-muted-foreground">
                    <p className="text-xs">لا يوجد سجل عمليات حتى الآن</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="p-2.5 bg-background rounded-xl border border-border/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileImage className="w-4 h-4 text-orange-400 shrink-0" />
                        <span className="font-medium truncate max-w-[180px]">{item.image_name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground shrink-0">
                        <span className="bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-md font-semibold">
                          {item.extracted_count} نص
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(item.created_at).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <Button 
              onClick={handleGoogleLogin} 
              disabled={oauthLoading !== null}
              variant="outline" 
              className="w-full h-10 text-xs font-bold rounded-xl gap-2.5 bg-white text-gray-800 hover:bg-gray-50 border-gray-300 shadow-sm"
            >
              {oauthLoading === 'google' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              {oauthLoading === 'google' ? 'جاري التحويل...' : 'التسجيل بـ Google'}
            </Button>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-background px-2 text-muted-foreground">أو بالبريد الإلكتروني</span></div>
            </div>

            <Input placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 text-xs" />
            <Input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className="h-8 text-xs" />

            <div className="flex gap-2 pt-1">
              <Button onClick={() => handleEmailAuth(false)} disabled={loading} className="flex-1 h-8 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'دخول'}
              </Button>
              <Button onClick={() => handleEmailAuth(true)} disabled={loading} variant="outline" className="flex-1 h-8 text-xs font-bold">
                حساب جديد
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}