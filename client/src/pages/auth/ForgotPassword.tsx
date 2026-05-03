import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ChevronLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DobPicker } from "@/components/DobPicker";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  identifier: z.string().min(1, "Enter your username, phone, or Gmail"),
  dateOfBirth: z
    .string()
    .min(1, "Please select your date of birth")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please complete your date of birth"),
  newPassword: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .refine(val => !/^\d+$/.test(val), "Password can't be all numbers — add a letter or symbol"),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const { forgotPassword } = useAuth();
  const { toast } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      identifier: "",
      dateOfBirth: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await forgotPassword(values.identifier, values.dateOfBirth, values.newPassword);
      setSuccess(true);
    } catch (err: any) {
      toast({
        title: "Reset failed",
        description: err.message || "Could not reset password. Please check your details.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Password reset!</h2>
        <p className="text-muted-foreground text-sm mb-8">
          Your password has been updated. You can now sign in with your new password.
        </p>
        <Button
          data-testid="button-go-to-login"
          className="w-full"
          onClick={() => navigate("/login")}
        >
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center px-4 pt-6 pb-2">
        <button
          type="button"
          data-testid="button-back"
          onClick={() => navigate("/login")}
          className="text-muted-foreground mr-3"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-semibold text-foreground">Reset password</h2>
      </div>

      <div className="flex-1 px-6 pb-8 pt-4">
        <p className="text-muted-foreground text-sm mb-6">
          Enter your username, phone, or Gmail along with your registered date of birth to reset your password.
        </p>

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
                      className="bg-card border-border"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-sm">New password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        data-testid="input-new-password"
                        type={showNew ? "text" : "password"}
                        placeholder="At least 6 characters"
                        autoComplete="new-password"
                        className="bg-card border-border pr-10"
                      />
                      <button
                        type="button"
                        data-testid="button-toggle-new-password"
                        onClick={() => setShowNew(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-sm">Confirm new password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        data-testid="input-confirm-password"
                        type={showConfirm ? "text" : "password"}
                        placeholder="Re-enter new password"
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
              data-testid="button-reset-password"
              className="w-full mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Resetting..." : "Reset password"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
