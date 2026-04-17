import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Shield, AlertTriangle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function AdminLogin({ onAdminLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [lockedUntil, setLockedUntil] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setRemainingAttempts(null);

    try {
      const res = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setLockedUntil(new Date(data.lockedUntil));
          setError(data.error);
        } else {
          setError(data.error || 'Giriş başarısız');
          if (data.remainingAttempts !== undefined) {
            setRemainingAttempts(data.remainingAttempts);
          }
        }
        setLoading(false);
        return;
      }

      localStorage.setItem('adminToken', data.token);
      onAdminLogin(data.user);
      navigate('/admin/dashboard');
    } catch (err) {
      setError('Bağlantı hatası. Lütfen tekrar deneyin.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-500/20 via-background to-orange-500/20 p-4">
      <Card className="w-full max-w-md border-red-500/20">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-red-500/10 border border-red-500/20">
              <Shield className="h-10 w-10 text-red-500" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Admin Paneli</CardTitle>
          <CardDescription>Yönetici girişi yapın</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm bg-destructive/10 rounded-md border border-destructive/20 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-destructive font-medium">{error}</p>
                  {remainingAttempts !== null && remainingAttempts > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Kalan deneme hakkı: {remainingAttempts}
                    </p>
                  )}
                  {lockedUntil && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Hesap {new Date(lockedUntil).toLocaleTimeString('tr-TR')} tarihine kadar kilitli
                    </p>
                  )}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username">Kullanıcı Adı</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading || lockedUntil}
                autoComplete="username"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || lockedUntil}
                autoComplete="current-password"
              />
            </div>

            <div className="p-3 bg-yellow-500/10 rounded-md border border-yellow-500/20">
              <p className="text-xs text-yellow-600 dark:text-yellow-500">
                <strong>Güvenlik:</strong> 5 başarısız giriş denemesinden sonra hesap 10 dakika kilitlenir.
              </p>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full bg-red-500 hover:bg-red-600" 
              disabled={loading || lockedUntil}
            >
              {loading ? 'Giriş yapılıyor...' : 'Admin Girişi'}
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate('/')}
            >
              Ana Sayfaya Dön
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
