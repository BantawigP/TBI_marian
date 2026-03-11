import App from '@/App';
import { AlumniForm, StartupForm } from '@/features/incubatees';
import { VerifyEmailPage } from '@/features/auth';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/alumni-form" element={<AlumniForm />} />
        <Route path="/startup-form" element={<StartupForm />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  );
}
