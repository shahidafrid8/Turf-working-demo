import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ChevronLeft, ShieldCheck } from "lucide-react";
import logoImg from "@assets/image_1774343851801.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  identifier: z.string().min(1, "Enter your username, phone, or Gmail"),
  password: z.string().min(1, "Enter your password"),
});

type FormValues = z.infer<typeof schema>;

export default function TurfOwnerLogin() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const user = await login(values.identifier, values.password);
      navigate("/owner/home");
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4">
        <button
          type="button"
          data-testid="button-back"
          onClick={() => navigate("/")}
          className="text-muted-foreground"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          type="button"
          data-testid="button-admin"
          onClick={() => navigate("/admin")}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Admin
        </button>
      </div>

      {/* Logo */}
      <div className="flex flex-col items-center pb-8 px-6">
        <img
          src={logoImg}
          alt="QuickTurf"
          className="object-contain mb-2"
          style={{ height: 72, width: "auto" }}
        />
        <p className="text-primary text-sm font-medium">Turf Owner Portal</p>
      </div>

      <div className="flex-1 px-6 pb-8">
        <h2 className="text-xl font-semibold text-foreground mb-6">Sign in as Turf Owner</h2>

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
            onClick={() => navigate("/owner/register")}
            className="text-primary text-sm font-semibold"
          >
            Register your turf
          </button>
        </div>
      </div>
    </div>
  );
}
