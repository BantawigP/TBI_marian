import App from './App';
import { VerifyEmailPage } from './components/VerifyEmailPage';

export default function Root() {
  if (window.location.pathname === '/verify-email') {
    return <VerifyEmailPage />;
  }

  return <App />;
}
