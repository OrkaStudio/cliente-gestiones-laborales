// Tipos compartidos del dominio GL — usados en demo con mocks y luego en Supabase.
// Schema 1:1 con la decision de [[decisiones/gl-stack-2026-04]] y [[verticales/rrhh-agro]].

export type EstadoCandidato = "activo" | "inactivo";

export type EstadoBusqueda = "activa" | "pausada" | "cerrada";

export type EstadoGestion =
  | "preseleccionado"
  | "entrevista_orka"
  | "presentado_cliente"
  | "entrevista_cliente"
  | "ofertado"
  | "contratado"
  | "descartado";

export type ExperienciaLaboral = {
  id: string;
  empresa: string;
  rol: string;
  desde: string; // YYYY-MM
  hasta: string | null; // null = actual
  descripcion: string;
};

export type Candidato = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  ubicacion: string;
  fechaNacimiento: string; // YYYY-MM-DD
  estado: EstadoCandidato;
  ultimoPuesto: string;
  experiencia: ExperienciaLaboral[];
  educacion: string;
  idiomas: string[];
  disponibilidad: string;
  pretensionSalarial: string | null;
  notasRecruiter: string | null;
  cvCrudoUrl: string | null;
  cvEditadoUrl: string | null;
  fechaIngreso: string; // YYYY-MM-DD
  matchScore?: number; // 0-100, solo cuando aparece en lista filtrada por busqueda
};

export type Busqueda = {
  id: string;
  cliente: string;
  puesto: string;
  ubicacion: string;
  estado: EstadoBusqueda;
  fechaApertura: string;
  descripcion: string;
  requisitos: string[];
  rangoSalarial: string;
  candidatosCount: number;
};

export type Gestion = {
  id: string;
  candidatoId: string;
  busquedaId: string;
  estado: EstadoGestion;
  ultimaActualizacion: string;
  notas: string;
};
