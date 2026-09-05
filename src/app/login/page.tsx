import { Suspense } from "react";
import AuthLayout from "@/app/auth/layout";
import LoginForm from "@/components/login-form";

export default function LoginPage() {
  return (
    <AuthLayout>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}