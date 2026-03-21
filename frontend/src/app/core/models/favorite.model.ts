export interface FavoriteRecord {
  id: string;
  empresa: string;
  usuario: string;
  nome: string;
  desc?: string;
  sql: string;
  banco: string;
  dtCri: Date;
  dtAlt?: Date;
}
