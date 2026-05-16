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
const labelClass = "text-foreground text-base font-semibold";
const inputClass = "bg-card border-border text-base placeholder:text-sm placeholder:text-muted-foreground/60";
const passwordInputClass = `${inputClass} pr-10`;

const schema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(80),
  username: z.string().min(1, "Username is required").max(30).regex(usernameRegex, "Letters, numbers, underscores, periods only — can't start or end with a period"),
  email: z.string().min(1, "Gmail is required").email("Enter a valid email address").refine(val => val.toLowerCase().endsWith("@gmail.com"), "Only Gmail (@gmail.com) is accepted"),
  phoneNumber: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  dateOfBirth: z.string().min(1, "Select your date of birth").regex(/^\d{4}-\d{2}-\d{2}$/, "Please complete your date of birth").refine(val => new Date(val) < new Date(), "Must be in the past"),
  password: z.string().min(6, "At least 6 characters").refine(val => !/^\d+$/.test(val), "Can't be all numbers"),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

type FormValues = z.infer<typeof schema>;

export default function TurfOwnerRegister() {
  const [, navigate] = useLocation();
  const { registerOwner } = useAuth();
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
      fullName: prefillFullName,
      username: "",
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
      await registerOwner({
        fullName: values.fullName,
        username: values.username,
        email: values.email,
        phoneNumber: values.phoneNumber,
        dateOfBirth: values.dateOfBirth,
        password: values.password,
      });
      navigate("/owner/home");
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
      <div className="flex items-center px-4 pt-6 pb-2">
        <button type="button" data-testid="button-back" onClick={() => navigate("/owner/login")} className="text-muted-foreground mr-3">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-semibold text-foreground">Create owner account</h2>
      </div>

      <div className="flex-1 px-6 pb-8 pt-4 overflow-y-auto">
        <p className="text-muted-foreground text-sm mb-6">
          Step 1 of 2 — Create your account. Once approved by our team, you'll be able to list your turf.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            <div>
              <p className="text-primary font-semibold text-sm uppercase tracking-wide mb-3">Personal details</p>
              <div className="space-y-4">

                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Full name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-full-name" placeholder="e.g. Arjun Sharma" className={inputClass} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="username" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Username</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-username" placeholder="e.g. green_valley_cricket" className={inputClass} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Gmail address</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-email" type="email" placeholder="yourname@gmail.com" readOnly={Boolean(prefillEmail)} className={inputClass} />
                    </FormControl>
                    {prefillEmail && <p className="text-xs text-muted-foreground mt-1">Google verified Gmail is locked for this signup.</p>}
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Phone number</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-phone" type="tel" placeholder="10-digit number" inputMode="numeric" maxLength={10} className={inputClass} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Date of birth</FormLabel>
                    <FormControl>
                      <DobPicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input {...field} data-testid="input-password" type={showPassword ? "text" : "password"} placeholder="At least 6 characters" autoComplete="new-password" className={passwordInputClass} />
                        <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Confirm password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input {...field} data-testid="input-confirm-password" type={showConfirm ? "text" : "password"} placeholder="Re-enter your password" autoComplete="new-password" className={passwordInputClass} />
                        <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <p className="text-muted-foreground text-xs">
              After submitting, our team will review your account. Once approved, you can log in and list your turf for a separate review before it goes live.
            </p>

            <Button type="submit" data-testid="button-register" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center">
          <span className="text-muted-foreground text-sm">Already have an account? </span>
          <button type="button" data-testid="link-login" onClick={() => navigate("/owner/login")} className="text-primary text-sm font-semibold">
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
