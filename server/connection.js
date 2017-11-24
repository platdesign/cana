'use strict';


/**
 * Socket connection
 *
 * - routes incoming traffic
 * - replies to requests
 * - executes topic-subscriptions
 *
 */
class Connection {


	/**
	 * Constructor
	 * @param  {Object} server
	 * @param  {Object} socket
	 * @return {self}
	 */
	constructor(server, socket) {

		this._server = server;
		this._socket = socket;

		this._subs = {};

		this._socket.on('message', e => this._routeMessage(e));
	}



	/**
	 * serializes and sends event to client
	 * @param  {Object} e
	 * @return {void}
	 */
	_send(e) {
		this._socket.send(JSON.stringify(e));
	}


	/**
	 * routes incoming traffic
	 * @param  {String} e event
	 * @return {void}
	 */
	async _routeMessage(e) {
		let msg = JSON.parse(e);


		// handle sub
		if(
			msg.type === 'sub' &&
			Object.keys(this._server._topics).includes(msg.topic) &&
			msg.sid
		) {

			let topic = this._server._topics[msg.topic];

			let ctx = {
				payload: msg.payload,
				socket: this._socket
			};

			await this._server._execExt('preSub', [topic, ctx]);

			let sub = topic.handler(ctx)
				.subscribe(e => {

					this._send({
						sid: msg.sid,
						payload: e
					});

				});

			this._subs[msg.sid] = {
				id: msg.sid,
				dispose: () => sub.dispose()
			};



		}


		// handle dispose
		if(msg.type === 'dispose' && msg.sid && msg.topic) {
			this._disposeSubBySid(msg.sid);
		}



		// handle request
		if(
			msg.type === 'req' &&

			msg.rid
		) {

			if(!Object.keys(this._server._methods).includes(msg.cmd)) {
				this._send({
					rid: msg.rid,
					error: {
						message: 'Command not found'
					}
				});
			} else {

				let config = this._server._methods[msg.cmd];

				config.handler({ payload: msg.payload }).then(res => {
					this._send({
						rid: msg.rid,
						payload: res
					})
				}, err => {
					this._send({
						rid: msg.rid,
						error: {
							message: err.message
						}
					})
				});

			}



		}

	}



	/**
	 * dispose an active subscription by subID
	 * @param  {String} sid
	 * @return {void}
	 */
	_disposeSubBySid(sid) {
		let sub = this._subs[sid];

		/* istanbul ignore else */
		if(sub) {
			sub.dispose();
			delete this._subs[sid];
		}
	}


	/**
	 * close all active subs
	 * @return {void}
	 */
	close() {
		Object.keys(this._subs).forEach(sid => this._disposeSubBySid(sid));
	}

}




module.exports = Connection;

