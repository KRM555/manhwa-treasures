import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
  const [oauthLoading, setOauthLoading] = useState<'google' | 'discord' | null>(null);
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

  const getRedirectUrl = () => {
    const url = window.location.origin;
    return url.endsWith('/') ? url : `${url}/`;
  };

  const handleGoogleLogin = async () => {
    try {
      setOauthLoading('google');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
          redirectTo: getRedirectUrl(),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error('حدث خطأ أثناء الاتصال بجوجل: ' + error.message);
      setOauthLoading(null);
    }
  };

  const handleDiscordLogin = async () => {
    try {
      setOauthLoading('discord');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: { 
          redirectTo: getRedirectUrl() 
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error('حدث خطأ أثناء الاتصال بديسكورد: ' + error.message);
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

            <Button 
              onClick={handleDiscordLogin} 
              disabled={oauthLoading !== null}
              variant="outline" 
              className="w-full h-10 text-xs font-bold rounded-xl gap-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white border-none shadow-sm"
            >
              {oauthLoading === 'discord' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .079.009c.12.098.245.195.372.288a.077.077 0 0 1-.006.128 12.299 12.299 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              )}
              {oauthLoading === 'discord' ? 'جاري التحويل...' : 'التسجيل بـ Discord'}
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