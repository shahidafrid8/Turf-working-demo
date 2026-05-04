import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DobPicker } from "@/components/DobPicker";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const usernameRegex = /^(?!.*\.\.)(?!.*\.$)[a-zA-Z0-9_][a-zA-Z0-9_.]{0,28}[a-zA-Z0-9_]$|^[a-zA-Z0-9_]$/;

const schema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .max(30, "Username must be 30 characters or fewer")
    .regex(
      usernameRegex,
      "Letters, numbers, underscores, and periods only — can't start or end with a period"
    ),
  fullName: z
    .string()
    .trim()
    .max(80, "Full name must be 80 characters or fewer")
    .optional()
    .refine(val => !val || val.length >= 2, "Full name must be at least 2 characters"),
  email: z
    .string()
    .min(1, "Gmail address is required")
    .email("Enter a valid email address")
    .refine(
      val => val.toLowerCase().endsWith("@gmail.com"),
      "Only Gmail addresses (@gmail.com) are accepted"
    ),
  phoneNumber: z
    .string()
    .regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  dateOfBirth: z
    .string()
    .min(1, "Please select your date of birth")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please complete your date of birth")
    .refine(val => new Date(val) < new Date(), "Date of birth must be in the past"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .refine(val => !/^\d+$/.test(val), "Password can't be all numbers — add a letter or symbol"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof schema>;

export default function Register() {
  const [, navigate] = useLocation();
  const { register } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchParams = new URLSearchParams(window.location.search);
  const prefillEmail = searchParams.get("email") || "";
  const prefillFullName = searchParams.get("fullName") || "";

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: "",
      fullName: prefillFullName,
      email: prefillEmail,
      phoneNumber: "",
      dateOfBirth: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const fullName = values.fullName?.trim();
      await register({
        username: values.username,
        ...(fullName ? { fullName } : {}),
        email: values.email,
        phoneNumber: values.phoneNumber,
        dateOfBirth: values.dateOfBirth,
        password: values.password,
      });
      navigate("/home");
    } catch (err: any) {
      toast({
        title: "Registration failed",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center px-4 pt-6 pb-2">
        <button
          type="button"
          data-testid="button-back"
          onClick={() => navigate("/login")}
          className="text-muted-foreground mr-3"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-semibold text-foreground">Create account</h2>
      </div>

      <div className="flex-1 px-6 pb-8 pt-4 overflow-y-auto">
        <p className="text-muted-foreground text-sm mb-6">
          Your date of birth is used to recover your password — keep it safe.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Username */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-sm">Username</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      data-testid="input-username"
                      placeholder="e.g. cricket_legend"
                      autoComplete="username"
                      className="bg-card border-border"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">
                    Letters, numbers, underscores, periods · max 30 chars
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Full name */}
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-sm">Full name (optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      data-testid="input-full-name"
                      placeholder="e.g. Rahul Sharma"
                      autoComplete="name"
                      className="bg-card border-border"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Gmail */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-sm">Gmail address</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      data-testid="input-email"
                      type="email"
                      placeholder="yourname@gmail.com"
                      autoComplete="email"
                      inputMode="email"
                      className="bg-card border-border"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">
                    Must end with @gmail.com
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone */}
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-sm">Phone number</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      data-testid="input-phone"
                      type="tel"
                      placeholder="10-digit number"
                      inputMode="numeric"
                      maxLength={10}
                      className="bg-card border-border"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date of birth */}
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-sm">Date of birth</FormLabel>
                  <FormControl>
                    <DobPicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password */}
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
                        placeholder="At least 6 characters"
                        autoComplete="new-password"
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Min 6 chars · can't be all numbers
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirm password */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-sm">Confirm password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        data-testid="input-confirm-password"
                        type={showConfirm ? "text" : "password"}
                        placeholder="Re-enter your password"
                        autoComplete="new-password"
                        className="bg-card border-border pr-10"
                      />
                      <button
                        type="button"
                        data-testid="button-toggle-confirm"
                        onClick={() => setShowConfirm(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              data-testid="button-register"
              className="w-full mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center">
          <span className="text-muted-foreground text-sm">Already have an account? </span>
          <button
            type="button"
            data-testid="link-login"
            onClick={() => navigate("/login")}
            className="text-primary text-sm font-semibold"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
