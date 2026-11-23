import { AlmacenD1, type D1Database } from './almacen-d1.ts'
import { manejar } from './logica.ts'

export default {
  fetch(req: Request, env: { DB: D1Database }): Promise<Response> {
    return manejar(req, new AlmacenD1(env.DB), Date.now())
  },
}
