import { useNavigate } from "react-router-dom";
import { User, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function OperationalLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const { currentProject, loading } = useProject();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (loading && !currentProject) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-background">
         <Loader2 className="w-8 h-8 animate-spin text-primary" />
       </div>
     );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header matching visual reference: Dark header with logo */}
      <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-6 shadow-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          {/* Logo Placeholder - Assuming Hermosillo logo is available or use text */}
          <div className="flex items-center gap-2">
            {/* Orange H square */}
            <div className="bg-orange-500 h-8 w-8 flex items-center justify-center rounded-sm">
                <span className="font-bold text-white text-lg">H</span>
            </div>
             <div className="flex flex-col">
                <span className="font-bold text-lg leading-none tracking-tight">HERMOSILLO</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-widest">Experience Matters</span>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
            {/* Project Info if available */}
            {currentProject && (
                <div className="hidden md:flex flex-col text-right mr-4 border-r border-slate-700 pr-4">
                    <span className="text-sm font-medium text-white">{currentProject.name}</span>
                </div>
            )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-slate-800">
                <div className="bg-slate-700 h-8 w-8 rounded-full flex items-center justify-center border border-slate-600">
                   <User className="h-4 w-4 text-slate-200" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800 text-slate-200">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-white">{user?.user_metadata?.full_name || "Usuario"}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem
                className="text-red-400 focus:text-red-300 focus:bg-slate-800 cursor-pointer"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
            {children}
        </div>
      </main>
    </div>
  );
}
