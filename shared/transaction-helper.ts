import { PostgrestError } from '@supabase/supabase-js';

/**
 * Excepción personalizada para errores del dominio transaccional de Base de Datos.
 * Específicamente diseñada para capturar fallos por triggers de seguridad en estados.
 */
export class TransactionalLockError extends Error {
  public code: string;
  public details: string | null;
  public hint: string | null;

  constructor(message: string, originalError: PostgrestError) {
    super(message);
    this.name = 'TransactionalLockError';
    this.code = originalError.code;
    this.details = originalError.details;
    this.hint = originalError.hint;
  }
}

/**
 * Wrapper para ejecutar llamadas a la API de Supabase y capturar excepciones de base de datos.
 * Traduce excepciones de triggers y otras restricciones de integridad SQL en errores amigables.
 * 
 * @param queryPromise Promesa de Supabase (ej: supabase.from('evento_detalles_equipos').update(...))
 * @returns Datos devueltos por la consulta si es exitosa.
 * @throws TransactionalLockError si el trigger de bloqueo transaccional aborta la operación.
 * @throws Error para otras violaciones comunes de base de datos o fallos de red.
 */
export async function runTransactionSafe<T>(
  queryPromise: Promise<{ data: T | null; error: PostgrestError | null }>
): Promise<T> {
  const { data, error } = await queryPromise;

  if (error) {
    // Código 'P0001' representa una excepción lanzada por RAISE EXCEPTION en PostgreSQL
    if (error.code === 'P0001' && error.message.includes('Bloqueo de seguridad')) {
      const stateMatch = error.message.match(/estado (\w+) y no/);
      const currentState = stateMatch ? stateMatch[1] : 'desconocido';

      throw new TransactionalLockError(
        `Operación no permitida: No se pueden agregar, modificar ni eliminar elementos en este evento porque su estado actual es [${currentState}] (solo se permite en estado COTIZACION).`,
        error
      );
    }

    // Manejo de restricciones de clave única e integridad referencial
    switch (error.code) {
      case '23505': // unique_violation
        throw new Error('Conflicto de duplicidad: Ya existe un registro con estos identificadores únicos en el sistema.');
      case '23503': // foreign_key_violation
        throw new Error('Error de integridad: El registro de referencia (Cliente, Usuario o Equipo) no existe o fue eliminado.');
      case '23514': // check_violation
        throw new Error('Error de validación: Se violó una restricción de validación en los datos ingresados.');
      default:
        // Error genérico de PostgREST / Supabase
        throw new Error(`Error en base de datos: ${error.message} (Código SQL: ${error.code})`);
    }
  }

  if (data === null) {
    throw new Error('La operación se completó pero no retornó registros.');
  }

  return data;
}
