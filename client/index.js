'use strict';

const { Observable, Subject } = require('rx');
const engine = require('engine.io-client');




function socket$(uri, options) {
	return Observable.create(observer => {

		let socket = engine(uri, options);

		socket.rx$ = Observable.fromEvent(socket, 'message', e => JSON.parse(e));

		socket.on('open', () => observer.onNext(socket));
		socket.on('close', type => {

			observer.onNext(false);

			if(type === 'transport close' || type === 'transport error') {
				observer.onError(new Error('transport error'));
			}
		});

		return () => {
			socket.close();
		}
	})
	.retryWhen(errors => errors.delay(1000))
	.shareReplay(1)
}







/**
 * Client to connect to socket server
 */
class Client {



	/**
	 * Constructor
	 * @param  {String} uri
	 * @return {self}
	 */
	constructor(uri) {

		let socketOptions = {
			path: '/cana'
		};

		// Create socket observable
		this.socket$ = socket$(uri, socketOptions);

		this.socket = false;
		this.socket$.subscribe(socket => this.socket = socket);

		// input observable
		this._tx$ = this.socket$.filter(Boolean).switchMap(socket => socket.rx$);

	}



	/**
	 * serialize and send event to server
	 * @param  {Object} e event
	 * @return {void}
	 */
	async _send(e) {
		if(this.socket) {
			this.socket.send(JSON.stringify(e));
		}
	}




	/**
	 * Closes socket connection
	 * @return {void}
	 */
	async close() {
		if(this.socket) {
			this.socket.close();
		}
	}



	/**
	 * request a resource from server
	 * @param  {String} name    method name
	 * @param  {Object} payload args
	 * @return {Promise}        resolves with response payload
	 */
	request(name, payload) {

		// create requestID
		let rid = `rid-${Date.now()}`;

		return this.socket$
			.filter(Boolean)
			.first()
			.toPromise()
			.then(() => {

				// send request
				this._send({
					type: 'req',
					cmd: name,
					rid,
					payload
				});


				// return response promise
				return this._tx$
					.filter(e => e.rid === rid)
					.first()
					.toPromise()
					.then(res => {
						if(res.error) {
							return Promise.reject(new Error(res.error.message));
						} else {
							return res.payload;
						}
					});
			});

	}





	/**
	 * Creates topic observable which subscribes on server topic
	 * @param  {String} name    topic name
	 * @param  {Object} payload args
	 * @return {Observable}
	 */
	topic(name, payload) {


		return this.socket$.switchMap(socket => {

			if(!socket) {
				return Observable.never();
			}

			return Observable.create(observer => {

				// create subID
				let sid = `sid-${Date.now()}`;

				// send subscribe to server
				this._send({
					type: 'sub',
					topic: name,
					sid,
					payload
				});

				// read sid-events from rx-stream
				let sub = this._tx$.filter(e => e.sid === sid).pluck('payload').subscribe(observer);

				// on dispose
				return () => {

					// send dispose to server
					this._send({
						type: 'dispose',
						topic: name,
						sid
					});

					// dispose rx-stream sub
					sub.dispose();

				};

			})

		})
		.share();

	}




}




module.exports = Client;
