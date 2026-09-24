export type StatusPagamento = 'Pending' | 'Paid' | 'Failed' | 'Refunded';

export interface Pagamento {
  paymentId: number;
  enrollmentId: number;
  studentId: number;
  amount: number;
  status: StatusPagamento;
  isActive: boolean;
  createdAt: string;
  paidAt: string | null;
  externalTransactionId: string | null;
  courseId: number;
  courseTitulo: string;
}
