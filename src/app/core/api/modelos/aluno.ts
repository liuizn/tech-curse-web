export interface PerfilAluno {
  id: number;
  nome: string;
  email: string;
  dataCadastro: string;
}

export interface MatriculaAluno {
  courseId: number;
  titulo: string;
  descricao: string;
  categoria: string;
  matriculaAtiva: boolean;
  enrollmentId: number;
}
