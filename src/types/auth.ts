export type UserRole = "ADMIN" | "GERENTE" | "VENDEDOR";

export interface User {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  role: UserRole;
  telefone?: string;
  ativo: boolean;
  ultimoAcesso?: string;
  criadoEm: string;
}

export interface AuthSession {
  token: string;
  user: User;
  expiresAt: number; // Timestamp Unix em milissegundos
  lembrarMe: boolean;
}

export interface PasswordStrength {
  score: number; // 0 a 4
  label: "Muito Fraca" | "Fraca" | "Média" | "Forte" | "Excelente";
  color: string;
  feedback: string[];
}
