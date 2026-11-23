// Servidor de prueba local (memoria), para las pruebas de extremo a extremo:
//   node --experimental-strip-types servidor/dev.ts [puerto]
import { createServer } from 'node:http'
import { AlmacenMemoria } from './almacen.ts'
import { manejar } from './logica.ts'

const puerto = Number(process.argv[2] ?? 8787)
const almacen = new AlmacenMemoria()

createServer(async (entrada, salida) => {
  const trozos: Buffer[] = []
  for await (const t of entrada) trozos.push(t as Buffer)
  const cuerpo = Buffer.concat(trozos)
  const cabeceras = new Headers()
  for (const [k, v] of Object.entries(entrada.headers)) if (typeof v === 'string') cabeceras.set(k, v)
  const req = new Request(`http://localhost:${puerto}${entrada.url}`, {
    method: entrada.method,
    headers: cabeceras,
    body: ['GET', 'HEAD'].includes(entrada.method ?? 'GET') || cuerpo.length === 0 ? undefined : cuerpo,
  })
  const res = await manejar(req, almacen, Date.now())
  salida.writeHead(res.status, Object.fromEntries(res.headers))
  salida.end(Buffer.from(await res.arrayBuffer()))
}).listen(puerto, () => console.log(`Servidor de sincronización de prueba en http://localhost:${puerto}`))
