export function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p className="text-lg font-semibold text-foreground">Grupo Salazar</p>
            <p className="text-sm text-muted-foreground mt-1">
              Sistema de Gestión de Estimaciones de Obra
            </p>
          </div>
          <div className="text-center md:text-right">
            <p className="text-sm text-muted-foreground">
              Creado por <span className="font-semibold text-foreground">Antonio Salazar</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              © {new Date().getFullYear()} Todos los derechos reservados
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
