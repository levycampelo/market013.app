import { neon } from "@neondatabase/serverless";

export function getDatabase() {
<<<<<<< HEAD
<<<<<<< HEAD
  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
=======
  const connectionString = process.env.DATABASE_URL;
>>>>>>> adf714c (first commit)
=======
  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
>>>>>>> 477f45d (conexao bd)
  if (!connectionString) {
    throw new Error("DATABASE_URL não configurada");
  }
  return neon(connectionString);
}
