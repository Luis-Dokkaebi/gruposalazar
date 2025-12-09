import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Loader2, UserPlus } from 'lucide-react';

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'needs_auth'>('loading');
  const [message, setMessage] = useState('');
  const [projectName, setProjectName] = useState('');
  
  const token = searchParams.get('token');

  useEffect(() => {
    if (authLoading) return;
    
    if (!token) {
      setStatus('error');
      setMessage('Token de invitación no proporcionado');
      return;
    }

    if (!user) {
      setStatus('needs_auth');
      setMessage('Necesitas iniciar sesión o registrarte para aceptar la invitación');
      return;
    }

    acceptInvitation();
  }, [token, user, authLoading]);

  const acceptInvitation = async () => {
    if (!token) return;
    
    setStatus('loading');
    
    const { data, error } = await supabase.rpc('accept_project_invitation', {
      _token: token
    });

    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }

    if (data && typeof data === 'object') {
      const result = data as { success: boolean; error?: string; project_id?: string; role?: string };
      
      if (result.success) {
        setStatus('success');
        setMessage(`¡Te has unido al proyecto como ${result.role}!`);
        
        // Get project name
        if (result.project_id) {
          const { data: project } = await supabase
            .from('projects')
            .select('name')
            .eq('id', result.project_id)
            .single();
          
          if (project) {
            setProjectName(project.name);
          }
        }
      } else {
        setStatus('error');
        setMessage(result.error || 'Error al procesar la invitación');
      }
    }
  };

  const handleGoToAuth = () => {
    // Encode the returnTo URL properly to handle the nested query parameter
    const returnTo = encodeURIComponent(`/invite?token=${token}`);
    navigate(`/auth?returnTo=${returnTo}`);
  };

  const handleGoToDashboard = () => {
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 mx-auto animate-spin text-primary" />
              <CardTitle className="text-xl">Procesando invitación...</CardTitle>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
              <CardTitle className="text-xl text-green-700">¡Invitación Aceptada!</CardTitle>
              {projectName && (
                <CardDescription className="text-lg">
                  Proyecto: {projectName}
                </CardDescription>
              )}
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 mx-auto text-red-500" />
              <CardTitle className="text-xl text-red-700">Error</CardTitle>
            </>
          )}
          
          {status === 'needs_auth' && (
            <>
              <UserPlus className="w-16 h-16 mx-auto text-primary" />
              <CardTitle className="text-xl">Autenticación Requerida</CardTitle>
            </>
          )}
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{message}</p>
          
          {status === 'needs_auth' && (
            <Button onClick={handleGoToAuth} className="w-full">
              Iniciar Sesión / Registrarse
            </Button>
          )}
          
          {status === 'success' && (
            <Button onClick={handleGoToDashboard} className="w-full">
              Ir al Dashboard
            </Button>
          )}
          
          {status === 'error' && (
            <Button variant="outline" onClick={() => navigate('/')} className="w-full">
              Volver al Inicio
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
