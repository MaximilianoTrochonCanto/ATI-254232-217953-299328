# Evidencia de pruebas unitarias y de componentes

## Identificacion

- Proyecto: Sistema de auditorias y evaluacion del servicio de alimentacion
- Fecha de ejecucion: 18 de julio de 2026
- Entorno: Windows 10 Pro de 64 bits
- Node.js: 20.5.1
- npm: 10.1.0
- Backend: Node.js, Express y PostgreSQL (acceso simulado en pruebas unitarias)
- Frontend: React, Jest y Testing Library

## Resultado ejecutivo

| Capa | Archivos de prueba | Pruebas | Aprobadas | Fallidas |
| --- | ---: | ---: | ---: | ---: |
| Backend | 5 | 28 | 28 | 0 |
| Frontend | 11 | 27 | 27 | 0 |
| **Total** | **16** | **55** | **55** | **0** |

Todas las pruebas finalizaron satisfactoriamente en la ejecucion registrada.

## Cobertura registrada

### Backend

La herramienta nativa de cobertura de Node.js informo:

| Metrica | Cobertura |
| --- | ---: |
| Lineas | 77,20% |
| Ramas | 75,61% |
| Funciones | 82,40% |

Los middlewares de autenticacion y autorizacion alcanzaron 100% en lineas, ramas y funciones. Los controladores de autenticacion y empresas alcanzaron 86,83% y 88,51% de lineas, respectivamente. El controlador de auditorias alcanzo 63,95% de lineas e incluye pruebas directas de las reglas V10, ponderacion BPM y generacion DOCX.

Nota metodologica: el porcentaje global de Node incluye archivos de pruebas y auxiliares cargados por el ejecutor. Por transparencia, tambien se informan arriba los porcentajes de los modulos productivos principales.

### Frontend

Jest/Istanbul informo:

| Metrica | Cobertura |
| --- | ---: |
| Sentencias | 55,91% |
| Ramas | 47,86% |
| Funciones | 51,93% |
| Lineas | 56,95% |

Cobertura de pantallas centrales:

| Modulo | Lineas |
| --- | ---: |
| App y enrutamiento por rol | 100% |
| Nueva auditoria | 82,38% |
| Registro | 86,25% |
| Gestion de empresas | 85,91% |
| Login | 80,85% |
| Reportes | 77,89% |
| Lista de auditorias | 77,27% |
| Reclamos e informes | 73,68% |
| Detalle y descargas | 65,06% |

La cobertura global conserva en el calculo pantallas especializadas aun no cubiertas (`auditoriaArchivo`, `capacitacionesEvaluacion`, `cumplimientoMenu` y `usuariosPendientes`). No se excluyeron para elevar artificialmente el porcentaje.

## Alcance funcional probado

### Backend

- Registro, validacion, duplicados, empresa habilitada y estado pendiente.
- Inicio de sesion, contrasena, estado de cuenta y emision de token.
- Token ausente, mal formado, invalido, valido y asignacion del usuario autenticado.
- Acceso permitido y denegado por rol.
- Creacion, listado, actualizacion y desactivacion transaccional de empresas.
- Proteccion para no desactivar administradores.
- Creacion de auditorias y asociacion con el usuario autenticado.
- Reemplazo y almacenamiento de respuestas y finalizacion de auditorias.
- Calculo simple, no verificables y limite inferior del resultado.
- Ponderaciones BPM 20/35/45.
- Formula de evaluacion global V10 y limites de entrada.
- Listados diferenciados para auditor y administrador.
- Resumen mensual de reportes y anos disponibles.
- Reclamos, campos obligatorios, descuento y almacenamiento de adjuntos.
- Generacion de DOCX editable y validez de la firma ZIP del archivo.
- Compatibilidad del DOCX cuando ya no existe el usuario o la empresa original.

### Frontend

- Enrutamiento inicial por sesion y rol, cambio a registro y cierre de sesion.
- Inicio de sesion exitoso, error de credenciales y solicitud de cuenta.
- Validaciones y envio de registro.
- Navegacion completa de paneles administrador y auditor.
- Creacion, actualizacion y eliminacion de empresas.
- Listado de auditorias, filtros por empresa/fecha, detalle y respuesta 401.
- Carga, categorizacion, seleccion y guardado completo de una nueva auditoria.
- Derivacion de plantillas documentales a su formulario especializado.
- Presentacion del resultado, fecha y respuestas de una auditoria.
- Descarga DOCX exitosa y mensaje cuando la ruta no esta publicada.
- Registro y validacion de reclamos con archivos.
- Calculo visual del resumen anual, errores y descarga CSV de reportes.

## Reproduccion

Desde `backend-auditorias`:

```powershell
npm test
npm run test:coverage
```

Desde `frontend`:

```powershell
$env:CI='true'
npm run test:ci
npm run test:coverage
```

Una ejecucion es satisfactoria cuando ambos procesos terminan con codigo `0` y reportan cero pruebas fallidas.

## Naturaleza y limites de la evidencia

- Son pruebas unitarias y de componentes automatizadas; no sustituyen pruebas de penetracion, carga, accesibilidad ni aceptacion formal de usuario.
- El backend usa dobles de prueba para la base de datos y no modifica registros reales.
- El frontend simula las respuestas HTTP para verificar estados, solicitudes e interacciones de usuario de forma determinista.
- La generacion DOCX fue adicionalmente comprobada contra auditorias reales durante el diagnostico, pero esa comprobacion no forma parte de la suite aislada.
- Las cifras corresponden al codigo presente y al entorno identificado en la fecha de ejecucion.

## Conclusion

La ejecucion aporta evidencia reproducible de que las 55 reglas y flujos automatizados definidos se cumplen en la version evaluada, sin fallas detectadas. Los resultados cuantitativos se presentan sin excluir modulos no cubiertos, y las areas pendientes quedan identificadas para futuras ampliaciones.
