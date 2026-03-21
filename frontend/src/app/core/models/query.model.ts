export interface QueryRequest {
  sql: string;
  database: string;
  company: string;
  branch: string;
  maxRows: number;
  timeout: number;
}

export interface QueryColumn {
  name: string;
  type: string;
  size: number;
  dec: number;
}

export interface QueryResult {
  executionId: string;
  columns?: QueryColumn[];
  rows?: any[][];
  rowCount?: number;
  executionTimeMs: number;
  queryType: 'SELECT' | 'DML' | 'DDL';
  success: boolean;
  error?: string;
  rowsAffected?: number;
}
