# Pestañas de navegación — diseño corto (aprobado)

**Por qué:** llegar a los gráficos hoy es rebuscado (se toca el peso, una cifra o la figura en la ficha).
**Qué:** barra fija con Ficha · Peso · ＋ · Cuerpo · Semana. En el teléfono, abajo (con el área segura); en el PC, bajo el encabezado. La pestaña activa se resalta (`aria-current="page"`). ＋ abre Registrar, destacado al centro.
**Destinos:** Ficha → `#/p/<id>`; Peso → `#/p/<id>/m/pesoKg`; Cuerpo → la primera zona con datos (o la cintura); Semana → `#/p/<id>/semana`.
**Activa:** ficha → Ficha; medida de perímetro → Cuerpo; otra medida → Peso; semana → Semana.
**Se oculta** en Registrar y en el paso a paso de la cinta, sin persona, en Familia y Ajustes. Los accesos de la ficha se mantienen; Atrás del navegador funciona (cada toque es una navegación normal).
**Enfoques:** barra fija (elegida, patrón de apps conocido) frente a un menú lateral (escondido, más toques).
**Restricciones:** 44 px, AA, sin tapar contenido (la página deja espacio abajo), sin scroll horizontal a 320 px.
**Plan:** `src/ui/Pestanas.tsx` + estilos + prueba e2e `las pestañas llevan a peso, cuerpo y semana y marcan la activa`; ocultar el botón fijo duplicado de Registrar en la ficha del teléfono solo si estorba (se conserva).
