import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  User,
  LogOut,
  History,
  FileImage,
  Clock,
  Loader2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Plus,
  Crown,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/language";
import {
  useAdStatus,
  getLocalAuthUser,
  setLocalAuthUser,
  isEmailAdFree,
  LocalAuthUser,
  PRIMARY_ADMIN_EMAIL,
  normalizeEmail,
} from "@/lib/adManager";

interface HistoryItem {
  id: string;
  image_name: string;
  extracted_count: number;
  created_at: string;
}

export function AuthModal() {
  const { t, lang } = useI18n();
  const { isAdmin, isAdFree, adFreeEmails, addEmail, removeEmail, currentUserEmail } =
    useAdStatus();
  const [user, setUser] = useState<any>(null);
  const isSuperAdmin =
    isAdmin && normalizeEmail(user?.email || currentUserEmail) === PRIMARY_ADMIN_EMAIL;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [newAdFreeEmail, setNewAdFreeEmail] = useState("");
  const [addingEmail, setAddingEmail] = useState(false);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

  const handleAddAdFreeEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = newAdFreeEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error(lang === "ar" ? "يرجى كتابة بريد إلكتروني صحيح" : "Please enter a valid email");
      return;
    }
    setAddingEmail(true);
    try {
      const ok = await addEmail(cleanEmail);
      if (ok) {
        toast.success(
          lang === "ar"
            ? `تم إعفاء ${cleanEmail} بنجاح وحفظه على الخادم! أصبح حسابه VIP بدون إعلانات.`
            : `Granted ad-free VIP status to ${cleanEmail}!`,
        );
        setNewAdFreeEmail("");
      }
    } finally {
      setAddingEmail(false);
    }
  };

  const handleRemoveAdFreeEmail = async (target: string) => {
    if (normalizeEmail(target) === PRIMARY_ADMIN_EMAIL) {
      toast.error(
        lang === "ar"
          ? "لا يمكن حذف بريد مدير النظام الأساسي من قائمة الإعفاء"
          : "Cannot remove primary admin from exemptions",
      );
      return;
    }
    setRemovingEmail(target);
    try {
      await removeEmail(target);
      toast.success(t.adFreeRemoved);
    } finally {
      setRemovingEmail(null);
    }
  };

  useEffect(() => {
    // 1. Initial check: Supabase or Local Auth
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        const activeUser = session?.user ?? getLocalAuthUser() ?? null;
        setUser(activeUser);
      })
      .catch(() => {
        const activeUser = getLocalAuthUser() ?? null;
        setUser(activeUser);
      });

    // 2. Supabase auth change
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const activeUser = session?.user ?? getLocalAuthUser() ?? null;
      setUser(activeUser);
    });

    // 3. Local Auth change
    const handleLocalAuthChanged = (e: Event) => {
      const customEv = e as CustomEvent<LocalAuthUser | null>;
      setUser(customEv.detail);
    };
    window.addEventListener("local_auth_changed", handleLocalAuthChanged);

    // 4. External trigger to open modal (e.g. from sidebar or quick buttons)
    const handleOpenAuth = () => setIsOpen(true);
    window.addEventListener("open_auth_modal", handleOpenAuth);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("local_auth_changed", handleLocalAuthChanged);
      window.removeEventListener("open_auth_modal", handleOpenAuth);
    };
  }, []);

  const fetchUserHistory = useCallback(async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("user_history")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setHistory(data);
      }
    } catch {
      // offline
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isOpen || !user) {
      return;
    }

    fetchUserHistory();

    try {
      const channel = supabase
        .channel("public:user_history")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "user_history" },
          (payload) => {
            setHistory((prev) => [payload.new as HistoryItem, ...prev]);
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // ignore
    }
  }, [isOpen, user, fetchUserHistory]);

  const handleGoogleLogin = async () => {
    try {
      setOauthLoading("google");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(t.googleAuthError(error.message));
      setOauthLoading(null);
    }
  };

  const handleEmailAuth = async (isSignUp: boolean) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error(t.credentialsRequired);
      return;
    }

    // Check if this user was granted VIP status in local list or directly in Supabase vip_users
    let isExempt = isEmailAdFree(cleanEmail, adFreeEmails);
    if (!isExempt) {
      try {
        const { data } = await supabase
          .from("vip_users")
          .select("email")
          .eq("email", cleanEmail)
          .maybeSingle();
        if (data?.email) {
          isExempt = true;
          addEmail(cleanEmail);
        }
      } catch (e) {
        console.debug("VIP lookup note:", e);
      }
    }

    if (!password && isExempt) {
      const vipUser: LocalAuthUser = {
        id: "vip_" + Math.random().toString(36).substring(2, 9),
        email: cleanEmail,
        created_at: new Date().toISOString(),
      };
      setLocalAuthUser(vipUser);
      setUser(vipUser);
      toast.success(
        lang === "ar"
          ? `مرحباً بك! تم التحقق من بريدك وتفعيل حسابك VIP بدون إعلانات 👑`
          : `Welcome! VIP Ad-Free status activated for ${cleanEmail} 👑`,
      );
      setIsOpen(false);
      return;
    }

    if (!password) {
      toast.error(t.credentialsRequired);
      return;
    }
    setLoading(true);

    try {
      const hasRealSupabase = Boolean(
        import.meta.env.VITE_SUPABASE_URL &&
        !import.meta.env.VITE_SUPABASE_URL.includes("placeholder"),
      );

      if (hasRealSupabase) {
        if (isSignUp) {
          const { data, error } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
          });
          if (error) {
            toast.error(error.message);
            return;
          }
          if (data.user) {
            const registeredUser: LocalAuthUser = {
              id: data.user.id,
              email: cleanEmail,
              created_at: new Date().toISOString(),
            };
            setLocalAuthUser(registeredUser);
            setUser(registeredUser);

            // Save record in user_history so it appears in Supabase
            try {
              await supabase.from("user_history").insert({
                user_id: data.user.id,
                image_name: `تسجيل حساب جديد (${cleanEmail})`,
                extracted_count: 0,
              });
            } catch (histErr) {
              console.debug("user_history insert note:", histErr);
            }

            toast.success(
              data.session
                ? t.accountCreated
                : lang === "ar"
                  ? "تم إنشاء الحساب وحفظه في Supabase بنجاح!"
                  : "Account created and saved in Supabase!",
            );
            setIsOpen(false);
            return;
          }
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (error) {
            toast.error(error.message);
            return;
          }
          if (data.user) {
            const loggedInUser: LocalAuthUser = {
              id: data.user.id,
              email: cleanEmail,
              created_at: new Date().toISOString(),
            };
            setLocalAuthUser(loggedInUser);
            setUser(loggedInUser);

            // Save record in user_history so it appears in Supabase
            try {
              await supabase.from("user_history").insert({
                user_id: data.user.id,
                image_name: `تسجيل دخول (${cleanEmail})`,
                extracted_count: 0,
              });
            } catch (histErr) {
              console.debug("user_history sign-in insert note:", histErr);
            }

            toast.success(t.signedIn);
            setIsOpen(false);
            return;
          }
        }
      }

      // Fast immediate local authentication without hanging DNS
      const localUser: LocalAuthUser = {
        id: "local_" + Math.random().toString(36).substring(2, 9),
        email: cleanEmail,
        created_at: new Date().toISOString(),
      };
      setLocalAuthUser(localUser);
      setUser(localUser);
      toast.success(isSignUp ? t.accountCreated : t.signedIn);
      setIsOpen(false);
    } catch {
      // Local fallback
      const localUser: LocalAuthUser = {
        id: "local_" + Math.random().toString(36).substring(2, 9),
        email: cleanEmail,
        created_at: new Date().toISOString(),
      };
      setLocalAuthUser(localUser);
      setUser(localUser);
      toast.success(isSignUp ? t.accountCreated : t.signedIn);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setLocalAuthUser(null);
    setUser(null);
    toast.info(t.signedOut);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={`h-9 gap-2 text-xs font-bold rounded-xl transition-all ${
            isAdFree
              ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 shadow-sm"
              : "border-orange-500/30 hover:bg-orange-500/10"
          }`}
        >
          <User className={`w-4 h-4 ${isAdFree ? "text-amber-500" : "text-orange-500"}`} />
          <span>{user ? user.email?.split("@")[0] || t.myProfile : t.authTrigger}</span>

          {/* Golden VIP Badge displayed directly on header */}
          {isAdFree && (
            <span className="text-[10px] font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 fill-current" />
              VIP
            </span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent
        className={`max-w-md rounded-2xl ${lang === "ar" ? "dir-rtl text-right" : "dir-ltr text-left"}`}
      >
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-center">
            {user ? t.profileTitle : t.loginTitle}
          </DialogTitle>
        </DialogHeader>

        {user ? (
          <div className="space-y-4 py-2">
            <div className="p-3.5 bg-muted/40 rounded-xl border border-border/50 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-[10px] text-muted-foreground">{t.accountLabel}</p>
                  {isSuperAdmin && (
                    <span className="text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      {t.adminBadge}
                    </span>
                  )}
                  {isAdFree && (
                    <span className="text-[9px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <Crown className="w-2.5 h-2.5" />
                      {lang === "ar" ? "عضوية VIP (بدون إعلانات)" : "VIP Ad-Free"}
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-foreground mt-1">{user.email}</p>
              </div>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-red-400 hover:text-red-500 hover:bg-red-500/10 gap-1"
              >
                <LogOut className="w-3.5 h-3.5" /> {t.logout}
              </Button>
            </div>

            {/* VIP Status Banner */}
            {isAdFree ? (
              <div className="p-3 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-emerald-500/10 rounded-xl border border-amber-500/30 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                  <Crown className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    {lang === "ar" ? "عضوية VIP خالية من الإعلانات" : "VIP Ad-Free Status Active"}
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {lang === "ar"
                      ? "جميع مساحات الإعلانات محظورة ومخفية بالكامل عن شاشتك."
                      : "All advertisement slots and spaces are completely removed for this account."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-[11px] text-muted-foreground leading-relaxed">
                {lang === "ar"
                  ? "حسابك الحالي عادي. للحصول على عضوية VIP بدون إعلانات، يمكن للمدير إضافة بريدك لقائمة الإعفاء."
                  : "Standard account. To get an ad-free VIP membership, an admin can exempt your email."}
              </div>
            )}

            {/* Admin Ad-Free Management Section (Exclusively for kareemelgohary01@gmail.com) */}
            {isSuperAdmin && (
              <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/25 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{t.adFreeAdminTitle}</span>
                  </div>
                  <span className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold px-2 py-0.5 rounded-full">
                    {adFreeEmails.length} {lang === "ar" ? "معفى" : "exempt"}
                  </span>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {lang === "ar"
                    ? "بصفتك مديراً، يمكنك إعفاء أي مستخدم من الإعلانات. بعد إضافة بريده، يمكنك الضغط على (نسخ الرابط) وإرساله له ليفتحه على جهازه وتختفي الإعلانات مباشرة، أو يمكنه تسجيل الدخول ببريده من جهازه."
                    : "Add any user email to grant VIP ad-free access. You can copy the activation link to send them, or they can simply sign in with that email."}
                </p>

                <form onSubmit={handleAddAdFreeEmail} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder={t.adFreeEmailPlaceholder}
                    value={newAdFreeEmail}
                    onChange={(e) => setNewAdFreeEmail(e.target.value)}
                    className="h-8 text-xs bg-background rounded-lg border-border"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={addingEmail}
                    className="h-8 text-xs font-bold px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white shrink-0 gap-1 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {addingEmail ? "..." : t.adFreeAddBtn}
                  </Button>
                </form>

                {adFreeEmails.length > 0 ? (
                  <div className="max-h-32 overflow-y-auto space-y-1.5 pt-1 pr-1">
                    {adFreeEmails.map((emailItem) => {
                      const isPrimary = emailItem === PRIMARY_ADMIN_EMAIL;
                      const isDeleting = removingEmail === emailItem;
                      return (
                        <div
                          key={emailItem}
                          className="flex items-center justify-between px-2.5 py-1.5 bg-background/80 rounded-lg border border-border/60 text-xs"
                        >
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                            <span className="truncate font-medium text-foreground text-[11px]">
                              {emailItem}
                            </span>
                            {isPrimary && (
                              <span className="text-[9px] bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold shrink-0">
                                {lang === "ar" ? "المدير الأساسي" : "Primary Admin"}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const link = `${window.location.origin}/?vip=${encodeURIComponent(emailItem)}`;
                                navigator.clipboard.writeText(link);
                                toast.success(
                                  lang === "ar"
                                    ? `تم نسخ رابط تفعيل الـ VIP! أرسل هذا الرابط لـ ${emailItem} ليفتحه على جهازه وتختفي الإعلانات فوراً 👑`
                                    : `Copied activation link! Send this link to ${emailItem}`,
                                );
                              }}
                              title={
                                lang === "ar" ? "نسخ رابط التفعيل للمستخدم" : "Copy activation link"
                              }
                              className="h-6 text-[10px] px-2 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 rounded-md font-bold flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{lang === "ar" ? "نسخ الرابط" : "Copy Link"}</span>
                            </Button>
                            {!isPrimary && (
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={isDeleting}
                                onClick={() => handleRemoveAdFreeEmail(emailItem)}
                                title={t.adFreeRemoveBtn}
                                className="w-6 h-6 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-md shrink-0 disabled:opacity-50"
                              >
                                {isDeleting ? (
                                  <span className="text-[10px] animate-pulse">...</span>
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic text-center py-1">
                    {t.adFreeEmpty}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-orange-500">
                <History className="w-4 h-4" />
                <span>{t.historyTitle}</span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {loadingHistory ? (
                  <p className="text-center text-xs text-muted-foreground py-4">
                    {t.historyLoading}
                  </p>
                ) : history.length === 0 ? (
                  <div className="text-center py-6 border border-dashed rounded-xl text-muted-foreground">
                    <p className="text-xs">{t.historyEmpty}</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-background rounded-xl border border-border/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileImage className="w-4 h-4 text-orange-400 shrink-0" />
                        <span className="font-medium truncate max-w-[180px]">
                          {item.image_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground shrink-0">
                        <span className="bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-md font-semibold">
                          {item.extracted_count} {t.textsCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(item.created_at).toLocaleDateString(
                            lang === "ar" ? "ar-EG" : "en-US",
                          )}
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
              {oauthLoading === "google" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              {oauthLoading === "google" ? t.googleRedirecting : t.googleSignIn}
            </Button>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-background px-2 text-muted-foreground">{t.orEmail}</span>
              </div>
            </div>

            <Input
              placeholder={t.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-8 text-xs"
            />
            <Input
              type="password"
              placeholder={t.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-8 text-xs"
            />

            <div className="flex gap-2 pt-1">
              <Button
                onClick={() => handleEmailAuth(false)}
                disabled={loading}
                className="flex-1 h-8 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t.signIn}
              </Button>
              <Button
                onClick={() => handleEmailAuth(true)}
                disabled={loading}
                variant="outline"
                className="flex-1 h-8 text-xs font-bold"
              >
                {t.signUp}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
