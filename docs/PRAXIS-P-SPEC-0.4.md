# Praxis-P — Especificación del lenguaje v0.4.0

Estado: especificación inicial consolidada para el parser compartido. Este documento describe la sintaxis implementada por el núcleo; no promete ejecutar herramientas externas ni modelos de IA.

## 1. Propósito y límites

Praxis-P es un lenguaje declarativo para describir agentes, herramientas, recursos, controles y solicitudes de ejecución. El archivo \`shared/praxis-core.mjs\` es la autoridad ejecutable para tokenización, análisis sintáctico, diagnósticos y conversión al formato intermedio del runtime. La interfaz TypeScript importa ese núcleo; no debe mantener una segunda gramática.

El runtime actual valida y simula pasos. No realiza llamadas reales a proveedores, herramientas, red o sistema de archivos.

## 2. Codificación y comentarios

- El fuente es texto Unicode; los identificadores de esta versión se limitan a letras ASCII y guion bajo inicial.
- Los identificadores pueden contener letras, dígitos, guion bajo y guion medio.
- Los espacios, tabuladores y retornos de carro separan tokens.
- El salto de línea separa instrucciones y propiedades.
- \`//\` inicia un comentario hasta el fin de la línea, excepto dentro de una cadena.
- Las cadenas pueden usar comillas simples o dobles. Se reconocen los escapes \`\\n\`, \`\\r\`, \`\\t\`, \`\\\\\`, \`\\"\` y \`\\'\`.

## 3. Gramática EBNF

Los nombres en MAYÚSCULAS son categorías léxicas. Las palabras entre comillas son terminales literales.

\`\`\`ebnf
program       = { NEWLINE | statement, { NEWLINE } } ;
statement     = declaration | assignment | run ;
declaration   = block-type, [ IDENTIFIER ], "{", NEWLINE,
                { property, { NEWLINE } }, "}" ;
block-type    = "agent" | "tool" | "memory" | "evidence"
              | "guard" | "parallel" ;
property      = property-name, ":", value ;
property-name = IDENTIFIER | KEYWORD ;
assignment    = "let", IDENTIFIER, "=", value ;
run           = "run", IDENTIFIER, [ "with", value ] ;
value         = STRING | NUMBER | BOOLEAN | reference | call
              | list | object ;
reference     = IDENTIFIER | KEYWORD ;
call          = reference, "(", [ value, { ",", value } ], ")" ;
list          = "[", [ value, { ",", value } ], "]" ;
object        = "{", [ object-entry, { ",", object-entry } ], "}" ;
object-entry  = (IDENTIFIER | KEYWORD | STRING), ":", value ;
BOOLEAN       = "true" | "false" ;
\`\`\`

La gramática resume la estructura aceptada por el parser. Las listas, objetos y argumentos pueden incluir saltos de línea. Una declaración \`parallel\` puede omitir el nombre; los demás tipos de bloque requieren nombre.

## 4. AST y valores

- Programa: \`{ type: "Program", version: "0.4.0", statements: [...] }\`
- Asignación: \`{ type: "Let", name, value, line }\`
- Bloque: \`{ type: "Agent" | "Tool" | "Memory" | "Evidence" | "Guard" | "Parallel", name, properties, line }\`
- Propiedad: \`{ key, value, line, column }\`
- Solicitud: \`{ type: "Run", target, args?, line }\`
- Referencia simbólica: \`{ ref: "nombre" }\`
- Llamada: \`{ call: "nombre", args: [...] }\`

Los valores de propiedades se conservan en el AST. En la representación del runtime, una referencia que coincide con una variable declarada previamente se sustituye por su valor. Las referencias simbólicas restantes, como \`observe\` en un ciclo, se conservan como referencias.

## 5. Reglas semánticas implementadas

El núcleo produce diagnósticos de error para:
- caracteres no reconocidos;
- cadenas sin cerrar;
- literales numéricos mal formados;
- instrucciones o valores no válidos;
- ausencia de elementos obligatorios de sintaxis;
- nombres de declaración duplicados;
- propiedades duplicadas dentro de un bloque u objeto;
- objetivos \`run\` que no corresponden a una declaración.

La validación del runtime añade reglas de contratos, permisos, dependencias y ciclos. La sintaxis y la validación del runtime son fases distintas; un programa con errores no debe considerarse ejecutable.

## 6. Modelo de ejecución actual

\`POST /api/analyze\` devuelve tokens, AST y diagnósticos del parser compartido. \`POST /api/execute\` añade el grafo, la validación semántica y una traza. Los pasos de agente tienen estado \`simulated\`: son registros de demostración, no acciones reales.

Las futuras integraciones de modelos y herramientas se implementarán mediante adaptadores independientes del lenguaje. Un programa Praxis-P describe intención y estructura; por sí solo no otorga permisos ni activa acceso externo.

## 7. Compatibilidad y pruebas

Los cambios incompatibles de sintaxis deben incrementar la versión del lenguaje y actualizar este documento, los tipos TypeScript, los ejemplos de interfaz y las pruebas. Las pruebas de regresión mínimas cubren cadenas/escapes, números, listas, objetos, referencias, errores léxicos, nombres/propiedades duplicados y objetivos no resueltos.
