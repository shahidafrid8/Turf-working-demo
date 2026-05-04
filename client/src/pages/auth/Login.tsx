import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ChevronLeft } from "lucide-react";
import logoImg from "@assets/image_1774343851801.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    google?: any;
  }
}

const schema = z.object({
  identifier: z.string().min(1, "Enter your username, phone, or Gmail"),
  password: z.string().min(1, "Enter your password"),
});

type FormValues = z.infer<typeof schema>;

export default function Login() {
  const [, navigate] = useLocation();
  const { login, loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await login(values.identifier, values.password);
      navigate("/home");
    } catch (err: any) {
      toast({
        title: "Login failed",
        description: err.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!googleClientId) return;
    if (!googleButtonRef.current) return;

    let cancelled = false;
    const startedAt = Date.now();

    const init = () => {
      if (cancelled) return;
      const g = window.google;

      if (g?.accounts?.id && googleButtonRef.current) {
        googleButtonRef.current.innerHTML = "";
        g.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (resp: { credential?: string }) => {
            const credential = resp?.credential;
            if (!credential) return;
            setIsSubmitting(true);
            try {
              const result = await loginWithGoogle(credential);
              if (result.needsRegistration) {
                navigate(`/register?email=${encodeURIComponent(result.email)}`);
              } else {
                navigate("/home");
              }
            } catch (err: any) {
              toast({
                title: "Google sign-in failed",
                description: err.message || "Please try again.",
                variant: "destructive",
              });
            } finally {
              setIsSubmitting(false);
            }
          },
        });

        g.accounts.id.renderButton(googleButtonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          width: 320,
          text: "signin_with",
          shape: "pill",
        });

        return;
      }

      if (Date.now() - startedAt > 5000) return;
      setTimeout(init, 100);
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [googleClientId, loginWithGoogle, navigate, toast]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Back to role select */}
      <div className="flex items-center px-4 pt-6">
        <button
          type="button"
          data-testid="button-back"
          onClick={() => navigate("/")}
          className="text-muted-foreground"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      </div>

      {/* Hero section */}
      <div className="flex flex-col items-center justify-center pt-8 pb-10 px-6">
        <img
          src={logoImg}
          alt="QuickTurf"
          className="object-contain"
          style={{ height: 80, width: "auto" }}
        />
      </div>

      {/* Form */}
      <div className="flex-1 px-6 pb-8">
        <h2 className="text-xl font-semibold text-foreground mb-6">Sign in</h2>

        {googleClientId ? (
          <div className="mb-6 flex justify-center">
            <div ref={googleButtonRef} />
          </div>
        ) : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-sm">Username, phone, or Gmail</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      data-testid="input-identifier"
                      placeholder="Username, phone, or Gmail"
                      autoComplete="username"
                      className="bg-card border-border"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-sm">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        data-testid="input-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        className="bg-card border-border pr-10"
                      />
                      <button
                        type="button"
                        data-testid="button-toggle-password"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <button
                type="button"
                data-testid="link-forgot-password"
                onClick={() => navigate("/forgot-password")}
                className="text-primary text-sm font-medium"
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              data-testid="button-login"
              className="w-full mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Form>

        <div className="mt-8 text-center">
          <span className="text-muted-foreground text-sm">Don't have an account? </span>
          <button
            type="button"
            data-testid="link-register"
            onClick={() => navigate("/register")}
            className="text-primary text-sm font-semibold"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}
