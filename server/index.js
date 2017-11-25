'use strict';


const engine = require('engine.io');
const Connection = require('./connection');


/**
 * Socket server
 */
class Server {


	/**
	 * Constructor
	 * @param  {Object} httpServer
	 * @return {self}
	 */
	constructor(httpServer, options = {}) {

		this._topics = {};
		this._methods = {};
		this._exts = [];

		/* istanbul ignore else */
		if(httpServer) {
			this._listener = engine();
			this._listener.attach(httpServer, {
				path: options.path || '/cana'
			});

			this._listener.on('connection', socket => {
				let con = new Connection(this, socket);
				socket.on('close', () => con.close());
			});
		}
	}



	/**
	 * register topic
	 * @param  {String} name
	 * @param  {Object} config
	 * @return {self}
	 */
	topic(name, config) {
		this._topics[name] = config;
		return this;
	}



	/**
	 * register method
	 * @param  {String} name
	 * @param  {Object} config
	 * @return {self}
	 */
	method(name, config) {
		this._methods[name] = config;
		return this;
	}


	/**
	 * registers an extending handler
	 * @param  {Object} event { type, method }
	 * @return {self}
	 */
	ext(event, method) {

		if(method) {
			return this.ext({
				type: event,
				method
			});
		}

		if(!['preSub'].includes(event.type)) {
			throw new Error(`Can't ext ${event.type}`)
		}

		this._exts.push(event);
		return this;
	}


	/**
	 * execute middelware handlers
	 * @param  {String} type
	 * @param  {Array} args
	 * @return {Promise}
	 */
	_execExt(type, args) {

		return this._exts
			.filter(e => e.type === type)
			.map(e => e.method)
			.reduce((before, method) => before.then(() => method(...args)), Promise.resolve());

	}

}




module.exports = Server;
