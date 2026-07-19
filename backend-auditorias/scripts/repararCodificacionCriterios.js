require("dotenv").config();

const fs = require("fs");
const path = require("path");
const pool = require("../src/config/bd");

const replacements = new Map(Object.entries({
  "20�C": "20°C", "23�C": "23°C", "70�": "70°", "acci�n": "acción",
  "anticipaci�n": "anticipación", "aplicaci�n": "aplicación", "BA�\u0018OS": "BAÑOS",
  "biol�gicos": "biológicos", "calibraci�n": "calibración", "cami�n": "camión",
  "CAMI�\u001cN": "CAMIÓN", "caracter�siticas": "características", "cient�fica": "científica",
  "circulaci�n": "circulación", "cocci�n": "cocción", "composici�n": "composición",
  "confusi�n": "confusión", "contaminaci�n": "contaminación", "cr�ticos": "críticos",
  "Cr�ticos": "Críticos", "cuesti�n": "cuestión", "c�mara": "cámara", "c�maras": "cámaras",
  "definir�n": "definirán", "Denominaci�n": "Denominación", "dep�sito": "depósito",
  "descripci�n": "descripción", "desinfecci�n": "desinfección",
  "DESINFECCI�\u001cN": "DESINFECCIÓN", "desviaci�n": "desviación",
  "determinaci�n": "determinación", "documentaci�n": "documentación",
  "DOCUMENTACI�\u001cN": "DOCUMENTACIÓN", "dosificaci�n": "dosificación", "duraci�n": "duración",
  "d�a": "día", "d�as": "días", "ejecuci�n": "ejecución", "elaboraci�n": "elaboración",
  "ELABORACI�\u001cN": "ELABORACIÓN", "eliminaci�n": "eliminación",
  "erradicaci�n": "erradicación", "espec�ficas": "específicas", "espec�ficos": "específicos",
  "estanter�as": "estanterías", "est�": "está", "est�n": "están", "evaluaci�n": "evaluación",
  "fr�o": "frío", "f�sicos": "físicos", "habilitaci�n": "habilitación",
  "identificaci�n": "identificación", "informaci�n": "información", "inspecci�n": "inspección",
  "INTRODUCCI�\u001cN": "INTRODUCCIÓN", "justificaci�n": "justificación", "l�gica": "lógica",
  "l�mites": "límites", "L�mites": "Límites", "l�nea": "línea", "manipulaci�n": "manipulación",
  "MANIPULACI�\u001cN": "MANIPULACIÓN", "ma�ana": "mañana", "medici�n": "medición",
  "men�": "menú", "men�s": "menús", "m�nima": "mínima", "m�s": "más", "m�todos": "métodos",
  "N�": "N°", "obtenci�n": "obtención", "operaci�n": "operación", "organol�pticas": "organolépticas",
  "par�metros": "parámetros", "pat�genos": "patógenos", "peri�dica": "periódica",
  "peri�dicos": "periódicos", "pizarr�n": "pizarrón", "preparaci�n": "preparación",
  "producci�n": "producción", "proliferaci�n": "proliferación", "protecci�n": "protección",
  "pr�cticas": "prácticas", "publicaci�n": "publicación", "Publicaci�n": "Publicación",
  "putrefacci�n": "putrefacción", "p�gina": "página", "p�rdida": "pérdida",
  "qu�mico": "químico", "qu�micos": "químicos", "recepci�n": "recepción",
  "RECEPCI�\u001cN-PASILLO": "RECEPCIÓN-PASILLO", "reposici�n": "reposición", "revisi�n": "revisión",
  "rotaci�n": "rotación", "Rotaci�n": "Rotación", "r�pidas": "rápidas", "r�tulo": "rótulo",
  "seg�n": "según", "Seg�n": "Según", "trasmisi�n": "trasmisión", "trav�s": "través",
  "T�aNEL": "TÚNEL", "t�cnica": "técnica", "t�xicas": "tóxicas", "utilizaci�n": "utilización",
  "u�as": "uñas", "validaci�n": "validación", "verificaci�n": "verificación",
  "ver�dica": "verídica", "�comprende": "¿comprende", "�Contemplan": "¿Contemplan",
  "�El": "¿El", "�es": "¿es", "�Es": "¿Es", "�Estos": "¿Estos", "�evitan": "¿evitan",
  "�Existen": "¿Existen", "�Hay": "¿Hay", "�la": "¿la", "�La": "¿La", "�Los": "¿Los",
  "�No": "¿No", "�rea": "área", "�se": "¿se", "�Se": "¿Se", "�Son": "¿Son", "�til": "útil"
}));

const badCharacters = /[\uFFFD\u0018\u001c]/u;

function repair(value) {
  if (value == null) return value;
  let result = value;
  for (const [broken, fixed] of replacements) result = result.split(broken).join(fixed);
  return result;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT id, plantilla_id, numero, orden, seccion, texto
      FROM criterios
      WHERE seccion LIKE '%' || chr(65533) || '%'
         OR texto LIKE '%' || chr(65533) || '%'
         OR seccion ~ E'[\\u0018\\u001c]'
         OR texto ~ E'[\\u0018\\u001c]'
      ORDER BY id
    `);

    const changes = [];
    for (const row of result.rows) {
      for (const field of ["seccion", "texto"]) {
        const before = row[field];
        const after = repair(before);
        if (before !== after) changes.push({ id: row.id, plantilla_id: row.plantilla_id, numero: row.numero, orden: row.orden, field, before, after });
        if (badCharacters.test(after || "")) throw new Error(`Corrección incompleta en criterio ${row.id}, campo ${field}: ${JSON.stringify(after)}`);
      }
    }

    const affectedFields = result.rows.reduce((total, row) => total + Number(badCharacters.test(row.seccion || "")) + Number(badCharacters.test(row.texto || "")), 0);
    if (changes.length !== affectedFields) throw new Error(`Se detectaron ${affectedFields} campos dañados pero se prepararon ${changes.length} cambios.`);

    console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", rows: result.rowCount, fields: changes.length }, null, 2));
    if (!apply) return;

    const backupDir = path.resolve(__dirname, "..", "backups");
    fs.mkdirSync(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupDir, `codificacion-criterios-${timestamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), changes }, null, 2));

    await client.query("BEGIN");
    for (const change of changes) {
      const column = change.field === "seccion" ? "seccion" : "texto";
      const update = await client.query(`UPDATE criterios SET ${column} = $1 WHERE id = $2 AND ${column} IS NOT DISTINCT FROM $3`, [change.after, change.id, change.before]);
      if (update.rowCount !== 1) throw new Error(`El criterio ${change.id} cambió durante la reparación; se cancela toda la operación.`);
    }

    const remaining = await client.query(`
      SELECT COUNT(*)::int AS count
      FROM criterios
      WHERE seccion LIKE '%' || chr(65533) || '%'
         OR texto LIKE '%' || chr(65533) || '%'
         OR seccion ~ E'[\\u0018\\u001c]'
         OR texto ~ E'[\\u0018\\u001c]'
    `);
    if (remaining.rows[0].count !== 0) throw new Error(`Quedaron ${remaining.rows[0].count} registros dañados; se cancela toda la operación.`);

    await client.query("COMMIT");
    console.log(JSON.stringify({ committed: true, backupPath, fieldsUpdated: changes.length }, null, 2));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
