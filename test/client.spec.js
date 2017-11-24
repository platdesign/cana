'use strict';


const Code = require('code');
const expect = Code.expect;
const Server = require('../server');
const Client = require('../client');
const http = require('http');
const { Observable } = require('rx');


const delay = async (time=0) => new Promise(resolve => setTimeout(resolve, time));




describe('Client', () => {


	it('should reconnect', async function() {
		this.timeout(0);

		let listener = http.createServer().listen(3333);

		let server = new Server(listener);
		let client = new Client('ws://localhost:3333');

		server.topic('camp', {
			handler() {
				return Observable.from([0,1,2,3,4]);
			}
		});

		let log = [];

		let sub = client.topic('camp', {}).subscribe(e => log.push(e));

		await delay(550);

		// server gone away
		listener.close();
		await Observable.fromEvent(listener, 'close').first().toPromise();

		expect(log)
			.to.equal([0, 1, 2, 3, 4]);

		await delay(1000);

		// server came back
		listener.listen(3333);
		await Observable.fromEvent(listener, 'listening').first().toPromise();

		await delay(550);
		sub.dispose();

		expect(log)
			.to.equal([0, 1, 2, 3, 4, 0, 1, 2, 3, 4]);


		listener.close();
		await client.close();
	});




	describe('protocol', () => {


		describe('request', () => {

			// it('should send req', async () => {

			// 	let client = new Client();

			// 	let sends = [];

			// 	client._send = e => sends.push(e);

			// 	client.request('qwe', { qwe:123 });

			// 	expect(sends)
			// 		.to.have.length(1);

			// 	expect(sends[0].type).to.equal('req');
			// 	expect(sends[0].cmd).to.equal('qwe');
			// 	expect(sends[0].rid).to.be.a.string();
			// 	expect(sends[0].payload)
			// 		.to.be.an.object()
			// 		.to.equal({ qwe:123 });

			// 	client.close();

			// });

		});


		describe('topic', () => {


			// it('should send sub and dispose', () => {

			// 	let client = new Client();

			// 	let sends = [];

			// 	client._send = e => sends.push(e);

			// 	let sub = client.topic('qwe', { asd:123 }).subscribe();

			// 	sub.dispose();

			// 	expect(sends)
			// 		.to.have.length(2);

			// 	// sub message
			// 	expect(sends[0].type).to.equal('sub');
			// 	expect(sends[0].topic).to.equal('qwe');
			// 	expect(sends[0].sid).to.be.a.string();
			// 	expect(sends[0].payload)
			// 		.to.be.an.object()
			// 		.to.equal({ asd:123 });

			// 	// dispose message
			// 	expect(sends[1].type).to.equal('dispose');
			// 	expect(sends[1].topic).to.equal('qwe');
			// 	expect(sends[1].sid).to.equal(sends[0].sid);

			// 	client.close();

			// });




		});


	});



});
