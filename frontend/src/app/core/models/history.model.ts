export interface HistoryRecord {
  id: string;
  empresa: string;
  filial: string;
  usuario: string;
  dtExec: Date;
  banco: string;
  sql: string;
  tipo: 'SELECT' | 'DML' | 'DDL';
  rows: number;
  tempo: number;
  status: 'S' | 'E';
  erro?: string;
}
