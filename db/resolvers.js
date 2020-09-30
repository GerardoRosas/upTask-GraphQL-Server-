const Usuario = require('../models/Usuario');
const Proyecto = require('../models/Proyecto');
const Tarea = require('../models/Tareas');
const bcryptjs = require('bcryptjs');

const jwt = require('jsonwebtoken');
const { find } = require('../models/Usuario');
require('dotenv').config({path: 'variables.env'})

//Crea y forma un json web token
const crearToken = (usuario, secreta, expiresIn) => {
  const { id, email, nombre } = usuario;
  return jwt.sign( { id, email, nombre }, secreta, { expiresIn });
}

const resolvers = {
  Query: {
    obtenerProyectos: async (_, {}, ctx) => {
      const proyectos = await Proyecto.find({
        creador: ctx.usuario.id
      })

      return proyectos;
    },
    obtenerTareas: async (_, {input}, ctx) => {
      const tareas = await Tarea.find({creador: ctx.usuario.id}).where('proyecto').equals(input.proyecto);
      return tareas;
    }
  },
  Mutation: {
    crearUsuario: async(_, {input}, context) => {

      const { email, password } = input;

      const existeUsuario = await Usuario.findOne({ email });
      
      //Si el usuario existe
      if(existeUsuario){
        throw new Error('El usuario ya esta registrado')
      }

      try {

        //Hasear password
        const salt = await bcryptjs.genSalt(10);
        input.password = await bcryptjs.hash(password, salt);

        //Creamos un nuevo registro
        const nuevoUsuario = new Usuario(input);
        console.log(nuevoUsuario);

        //Se guarda en la base de datos
        nuevoUsuario.save();
        return "Usuario creado Correctamente"
      } catch (error) {
        console.log(error);
      }
    },
    autenticarUsuario: async(_, {input}) => {
      const { email, password } = input;
      
      const existeUsuario = await Usuario.findOne({ email });

      //Si el usuario existe
      if(!existeUsuario){
        throw new Error('El usuario no existe');
      }

      //Si el password es correcto
      const passwordCorrecto = await bcryptjs.compare(password, existeUsuario.password);

      if(!passwordCorrecto){
        throw new Error('Password Incorrecto')
      }

      //Dar acceso a la app
      return {
        token: crearToken(existeUsuario, process.env.SECRETA, '7hr')
      }
    },
    nuevoProyecto: async(_, {input}, ctx) => {

      try {
        const proyecto = new Proyecto(input);

        //Asociar con el creador
        proyecto.creador = ctx.usuario.id;

        //Almacenar en la base de datos
        const nuevoProyecto = await proyecto.save();
        return nuevoProyecto;

      } catch (error) {
        console.log(error)
      }
    },
    actualizarProyecto: async(_, {id, input}, ctx) => {
      //Revisar si el proyecto existe
      let proyecto = await Proyecto.findById(id);
      if(!proyecto){
        throw new Error('Proyecto no encontrado');
      }

      //Revisar que si la persona que trata de editarlo es el creador
      if(proyecto.creador.toString() !== ctx.usuario.id){
        throw new Error('No tienes las credeciales para editar');
      }

      //Guardar el proyecto
      proyecto = await Proyecto.findOneAndUpdate({_id: id}, input, {new: true});
      return proyecto;
    },
    eliminarProyecto: async(_, {id}, ctx) => {
      //Revisar si el proyecto existe
      let proyecto = await Proyecto.findById(id);
      if(!proyecto){
        throw new Error('Proyecto no encontrado');
      }

      //Revisar que si la persona que trata de editarlo es el creador
      if(proyecto.creador.toString() !== ctx.usuario.id){
        throw new Error('No tienes las credeciales para editar');
      }

      //Eliminar 
      await Proyecto.findOneAndDelete({_id: id});

      return "Proyecto Eliminado";
    },
    nuevaTarea: async(_, {input}, ctx) => {
      try {
        const tarea = new Tarea(input);
        tarea.creador = ctx.usuario.id;
        const resultado = await tarea.save();
        
        return resultado;

      } catch (error) {
        console.log(error);
      }
    },
    actualizarTarea: async(_, {id, input, estado}, ctx) => {
      //Si la tarea existe o no
      let tarea = await Tarea.findById(id);

      if(!tarea){
        throw new Error('Tarea no encontrada');
      }

      //Si la persona que lo edita es el propietario
      if(tarea.creador.toString() !== ctx.usuario.id){
        throw new Error('No tienes las credenciales para editar');
      }

      //Cambiamos el estado
      input.estado = estado;

      //Guardar y retornar la tarea
      tarea = await Tarea.findOneAndUpdate({ _id: id }, input, {new : true });

      return tarea;
    },
    eliminarTarea: async(_, {id}, ctx) => {
      //Revisar si la tarea existe 
      let tarea = await Tarea.findById(id);
      if(!tarea){
        throw new Error('La tarea no existe');
      }

      //Revisar si la persona que trata de eliminar es el creador
      if(tarea.creador.toString() !== ctx.usuario.id){
        throw new Error('No tienes permisos para eliminar esta tarea');
      }

      //Eliminar la tarea 
      await Tarea.findByIdAndDelete({_id: id});
      return "Tarea eliminada";
    }

  }
}

module.exports = resolvers;