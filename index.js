// Colocar "node index.js" en la terminal para ejecutar el codigo
// No modificar
import { engine } from 'express-handlebars';
import express from 'express';
import { neon } from '@neondatabase/serverless';

//OG
/*
const sql = neon(
  'postgresql://neondb_owner:bl6BXwt3gGPR@ep-hidden-haze-a59wf417.us-east-2.aws.neon.tech/neondb?sslmode=require'
);*/

const sql = neon(
  'postgresql://neondb_owner:bl6BXwt3gGPR@ep-hidden-haze-a59wf417.us-east-2.aws.neon.tech/neondb?sslmode=require'
);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');
// Para el css, pero no funciona nose pq
app.use(express.static('public'));

///////////////////////////
// Codigo para las vistas//
///////////////////////////
app.get('/error', (req, res) => {
  res.render('error');
});

app.get('/', async (req, res) => {
  const tablas = await sql(
    `SELECT * FROM information_schema.tables WHERE table_schema = 'public';`
  );
  res.render('home', { tablas });
});
app.get('/home', async (req, res) => {
  const tablas = await sql(
    `SELECT * FROM information_schema.tables WHERE table_schema = 'public';`
  );
  res.render('home', { tablas });
});

app.get('/info', (req, res) => {
  res.render('info');
});

app.get('/tabla/:tabla', async (req, res) => {
  // Para evitar un error
  const tablasPermitidas = [
    'area',
    'salas',
    'paciente',
    'laboratorio',
    'asignacion_lab_area',
    'tratamiento',
    'medico',
    'horario_atencion',
    'horario_medico',
    'enfermero',
    'atencion_medico',
    'atencion_enfermero',
    'paciente_tratamiento',
    'edificio',
    'ficha',
  ];
  //
  const tabla = req.params.tabla;
  if (!tablasPermitidas.includes(tabla)) {
    return res.status(400).send('Tabla no permitida');
  }
  const columnas = await sql(
    `
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = $1;`,
    [tabla]
  );

  const primeraColumna = columnas[0]?.column_name;
  const tipoPrimeraColumna = columnas[0]?.data_type;

  const query = `SELECT * FROM ${tabla} ORDER BY ${primeraColumna} ASC;`;
  const datos = await sql(query);

  let tipo = '';
  // Verifica si la primera columna (id) es de tipo string
  if (primeraColumna && (tipoPrimeraColumna === 'text' || tipoPrimeraColumna === 'varchar' || tipoPrimeraColumna === 'char' || tipoPrimeraColumna === 'character varying')) {
    tipo = 'text';
  } else {
    tipo = 'number';
  }
  res.render('tabla', { columnas, tabla, datos, primeraColumna, tipo });
});

app.get('/consultas', async (req, res) => {
  // plantilla:
  // const cX = await sql(`SELECT atributo1, atributo2.. FROM tabla;`);
  const c1 = await sql(`
  SELECT nombre, apellido, area.especialidad, area.id_area
  FROM medico 
  JOIN area ON area.id_area = medico.id_area
  WHERE area.especialidad = 'Oncología';`);
  //mod
  const c2 = await sql(`
  SELECT paciente.rut AS rut_paciente, paciente.nombre AS nombre_paciente, paciente.apellido AS apellido_paciente, 
  medico.nombre AS nombre_medico, medico.apellido AS apellido_medico
  FROM paciente 
  JOIN atencion_medico ON paciente.RUT = atencion_medico.RUT_paciente 
  JOIN medico ON atencion_medico.RUT_medico = medico.RUT 
  WHERE medico.nombre = 'Carmen' AND medico.apellido = 'Silva';`);

  const c3 = await sql(`
  SELECT edificio.nro_edificio AS v_nro_edificio, salas.nro_sala AS v_salas ,tratamiento.nombre AS v_tratamiento
  FROM edificio 
  JOIN salas ON edificio.nro_edificio = salas.nro_edificio 
  JOIN area ON salas.id_area = area.id_area 
  JOIN asignacion_lab_area ON area.id_area = asignacion_lab_area.id_area 
  JOIN laboratorio ON asignacion_lab_area.nro_lab = laboratorio.nro_lab 
  JOIN tratamiento ON laboratorio.nro_lab = tratamiento.nro_lab 
  WHERE tratamiento.nombre = 'Antibióticos';`);

  const c4 = await sql(`
  SELECT paciente.RUT AS rut, paciente.nombre AS nombre, paciente.apellido AS apellido, nivel_gravedad
  FROM paciente 
  JOIN paciente_tratamiento ON paciente.RUT = paciente_tratamiento.RUT_paciente 
  JOIN tratamiento ON paciente_tratamiento.id_tratamiento = tratamiento.id_tratamiento 
  WHERE nivel_gravedad = 'leve';`);

  const c5 = await sql(`
  SELECT COUNT(*) AS nro_labs, salas.nro_edificio AS nro_edificios
  FROM laboratorio 
  JOIN asignacion_lab_area ON laboratorio.nro_lab = asignacion_lab_area.nro_lab 
  JOIN area ON asignacion_lab_area.id_area = area.id_area 
  JOIN salas ON area.id_area = salas.id_area 
  GROUP BY salas.nro_edificio
  ORDER BY salas.nro_edificio DESC;`);

  const c6 = await sql(`
  SELECT count(*) tratamientos_activos
  FROM paciente 
  JOIN paciente_tratamiento ON paciente.RUT = paciente_tratamiento.RUT_paciente 
  WHERE paciente_tratamiento.estado = 'activo';`);

  const c7 = await sql(`
  SELECT RUT, nombre, apellido, id_area, fecha, hora FROM medico 
  JOIN horario_medico ON medico.RUT = horario_medico.RUT_medico 
  JOIN horario_atencion ON horario_medico.id_horario = horario_atencion.id_horario
  WHERE horario_atencion.hora >= '10:00:00' AND horario_atencion.hora <= '23:59:59';`);

  const c8 = await sql(`
  SELECT count(*) AS cantidad, area.especialidad AS v_area
  FROM paciente 
  JOIN atencion_medico ON paciente.RUT = atencion_medico.RUT_paciente 
  JOIN medico ON atencion_medico.RUT_medico = medico.RUT 
  JOIN area ON area.id_area = medico.id_area
  WHERE area.especialidad = 'Oncología'
  GROUP BY area.especialidad;`);

  const c9 = await sql(`
  SELECT paciente.RUT AS v_rut, paciente.nombre AS v_nombre, paciente.apellido AS v_apellido, condicion, SUM(edificio.cantidad_camas) cantidad_camas 
  FROM paciente, edificio 
  WHERE paciente.condicion = 'hospitalizado' 
  GROUP BY paciente.RUT;`);

  const c10 = await sql(`
  SELECT 
    paciente.*, 
    ROUND((ficha.peso / (ficha.altura * ficha.altura)), 2) AS imc
  FROM paciente 
  JOIN ficha ON ficha.RUT_paciente = paciente.RUT 
  WHERE ( ( ficha.peso / (ficha.altura * ficha.altura)) >= 30);`);

  const c11 = await sql(`
  SELECT * 
  FROM ficha 
  WHERE RUT_paciente = '104751776';`);

  const c12 = await sql(`
  SELECT salas.nro_sala, area.especialidad 
  FROM salas 
  JOIN area ON area.id_area = salas.id_area 
  WHERE area.especialidad = 'Orientación';`);

  const c13 = await sql(`
  SELECT enfermero.nro_edificio, COUNT(*) cantidad_enfermeros
  FROM enfermero
  GROUP BY enfermero.nro_edificio
  ORDER BY enfermero.nro_edificio ASC;`);

  const c14 = await sql(`
  SELECT paciente.RUT AS rut, paciente.nombre AS n, paciente.apellido AS a, horario_atencion.hora AS h, horario_atencion.fecha AS f
  FROM paciente
  JOIN atencion_medico ON atencion_medico.RUT_paciente = paciente.RUT
  JOIN medico ON medico.RUT = atencion_medico.RUT_medico
  JOIN horario_atencion ON horario_atencion.id_horario = paciente.id_horario
  JOIN area ON medico.id_area = area.id_area
  WHERE area.especialidad = 'Oncología' AND (horario_atencion.hora BETWEEN '7:00:00' AND '23:00:00')
  `);

  const c15 = await sql(`
  SELECT count(*) partos
  FROM paciente 
  WHERE condicion = 'parto';`);

  res.render('consultas', {
    c1,
    c2,
    c3,
    c4,
    c5,
    c6,
    c7,
    c8,
    c9,
    c10,
    c11,
    c12,
    c13,
    c14,
    c15,
  });
});

app.get('/consultas_respuesta', (req, res) => {
  res.render('consultas_respuesta');
});
// Para la vista del formulario
app.get('/insert-form/:tabla', async (req, res) => {
  const tabla = req.params.tabla;

  const columnas = await sql(`
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = $1;`, [tabla]
  );

  res.render('insert-form', { tabla, columnas });
});
// Formularios
app.post('/insert/:tabla', async (req, res) => {
  const tabla = req.params.tabla;
  const valores = req.body;

  const columnas = Object.keys(valores);
  const valoresInsertar = Object.values(valores);
  
  const columnasSQL = columnas.join(', ');
  // Genera $1, $2, $3...
  const placeholders = columnas.map((_, i) => `$${i + 1}`).join(', '); 
  
  try {
    await sql(`INSERT INTO ${tabla} (${columnasSQL}) VALUES (${placeholders})`, valoresInsertar);
    res.redirect(`/tabla/${tabla}`); // Redirige a la página principal o a la tabla que se está editando
  } catch (err) {
    console.log(err);
    res.render('error', {err});
  }
});

app.post('/consultas1', async (req, res) => {
  const consulta1 = req.body['c1-form'];
  const resultado = await sql(`
  SELECT nombre, apellido, area.especialidad, area.id_area
  FROM medico 
  JOIN area ON area.id_area = medico.id_area
  WHERE area.especialidad = $1;`, [consulta1]);

  res.render('consultas_respuesta', {consulta1, resultado});
});

app.post('/consultas2', async (req, res) => {
  const nombre = req.body['c2-nombre-form'];
  const apellido = req.body['c2-apellido-form'];
  const resultado2 = await sql(`
  SELECT paciente.rut AS rut_paciente, paciente.nombre AS nombre_paciente, paciente.apellido AS apellido_paciente, 
  medico.nombre AS nombre_medico, medico.apellido AS apellido_medico
  FROM paciente 
  JOIN atencion_medico ON paciente.RUT = atencion_medico.RUT_paciente 
  JOIN medico ON atencion_medico.RUT_medico = medico.RUT 
  WHERE medico.nombre = $1 AND medico.apellido = $2;`, [nombre, apellido]);

  res.render('consultas_respuesta', {resultado2, nombre, apellido});
});

app.post('/consultas3', async (req, res) => {
  const tratamiento = req.body['c3-form'];
  const resultado3 = await sql(`
  SELECT edificio.nro_edificio AS v_nro_edificio, salas.nro_sala AS v_salas ,tratamiento.nombre AS v_tratamiento
  FROM edificio 
  JOIN salas ON edificio.nro_edificio = salas.nro_edificio 
  JOIN area ON salas.id_area = area.id_area 
  JOIN asignacion_lab_area ON area.id_area = asignacion_lab_area.id_area 
  JOIN laboratorio ON asignacion_lab_area.nro_lab = laboratorio.nro_lab 
  JOIN tratamiento ON laboratorio.nro_lab = tratamiento.nro_lab 
  WHERE tratamiento.nombre = $1;`, [tratamiento]);

  res.render('consultas_respuesta', {resultado3, tratamiento});
});

app.post('/consultas8', async (req, res) => {
  const area = req.body['c8-form'];
  const resultado8 = await sql(`
  SELECT count(*) AS cantidad, area.especialidad AS v_area
  FROM paciente 
  JOIN atencion_medico ON paciente.RUT = atencion_medico.RUT_paciente 
  JOIN medico ON atencion_medico.RUT_medico = medico.RUT 
  JOIN area ON area.id_area = medico.id_area
  WHERE area.especialidad = $1
  GROUP BY area.especialidad;`, [area]);

  res.render('consultas_respuesta', {resultado8, area});
});

app.post('/consultas11', async (req, res) => {
  const rut = req.body['c11-form'];
  const resultado11 = await sql(`
  SELECT * 
  FROM ficha 
  WHERE RUT_paciente = $1;`, [rut]);

  res.render('consultas_respuesta', {resultado11, rut});
});

app.post('/consultas12', async (req, res) => {
  const area2 = req.body['c12-form'];
  const resultado12 = await sql(`
  SELECT salas.nro_sala, area.especialidad 
  FROM salas 
  JOIN area ON area.id_area = salas.id_area 
  WHERE area.especialidad = $1;`, [area2]);

  res.render('consultas_respuesta', {resultado12, area2});
});

//

app.post('/delete/:tabla/:columnaID', async (req, res) => {
  const id = req.body.ID;
  const tabla = req.params.tabla;
  const columnaID = req.params.columnaID;

  try{
    await sql(`DELETE FROM ${tabla} WHERE ${columnaID} = $1`, [id]);
    res.redirect(`/tabla/${tabla}`);
  }
  catch(err){
    console.log(err);
    res.render('error', {err});
  }
});

app.post('/edit/:tabla/:columnaID', async (req, res) => {
  const tabla = req.params.tabla;
  const columnaID = req.params.columnaID;

  const id = req.body.ID;
  const columna = req.body.columna;
  const new_valor = req.body.new_valor;
  try{
    await sql(`UPDATE ${tabla} SET ${columna} = '${new_valor}' WHERE ${columnaID} = ${id}`);
    res.redirect(`/tabla/${tabla}`);
  }
  catch(err){
    console.log(err);
    res.render('error', {err});
  }
});

// Al final
app.listen(3000, () => console.log('CARGANDO PÁGINA...'));
