import { SignUp } from '@clerk/react';

export default function SignUpPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-center mb-8">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="WedPlan Logo" className="h-10 object-contain" />
        </div>
        <SignUp
          routing="path"
          path={`${import.meta.env.BASE_URL.replace(/\/$/, '')}/sign-up`}
          signInUrl={`${import.meta.env.BASE_URL.replace(/\/$/, '')}/sign-in`}
        />
      </div>
    </div>
  );
}