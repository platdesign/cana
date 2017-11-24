'use strict';


const Code = require('code');
const expect = Code.expect;
const Server = require('../server');
const Client = require('../client');
const rx = require('rx');
var http = require('http')


const delay = async (time=0) => new Promise(resolve => setTimeout(resolve, time));




describe('flow', () => {


	let httpServer;
	beforeEach(() => httpServer = http.createServer().listen(3333));
	afterEach(() => httpServer.close());


	let server;
	beforeEach(() => server = new Server(httpServer));

	let client;
	beforeEach(() => client = new Client('ws://localhost:3333'));
	afterEach(() => client.close());



	it('subscribe/receive events/dispose', async () => {

		let subbed = false;
		let disposed = false;

		server.topic('camp', {
			handler(ctx) {

				expect(ctx.payload)
					.to.equal({ asd:123 })

				return rx.Observable.create(observer => {
					subbed = true;

					let sub = rx.Observable.interval(0).subscribe(observer);

					return () => {
						sub.dispose();
						disposed = true;
					}

				});
			}
		});


		let res = await client.topic('camp', { asd:123 })
			.take(5)
			.toArray()
			.toPromise();

		expect(subbed).to.be.true();

		expect(res)
			.to.have.length(5)
			.to.equal([0,1,2,3,4]);

		// wait until server disposed sub
		await delay(100);

		expect(disposed).to.be.true();

	});






	it('server should dispose subs if client disconnects', async () => {


		let subbed = false;
		let disposed = false;

		server.topic('camp', {
			handler(ctx) {

				expect(ctx.payload)
					.to.equal({ asd:123 })

				return rx.Observable.create(observer => {
					subbed = true;

					let sub = rx.Observable.interval(0).subscribe(observer);

					return () => {
						sub.dispose();
						disposed = true;
					}

				});
			}
		});

		let topic = client.topic('camp', { asd:123 }).share();

		topic.subscribe();

		await topic.first().toPromise()

		await client.close();

		// wait until server disposed sub
		await delay(100);

		expect(subbed).to.be.true();
		expect(disposed).to.be.true();

	});







	it('client should request and get response', async () => {

		server.method('todo', {
			handler(ctx) {
				return Promise.resolve(ctx.payload);
			}
		});

		await client.request('todo', {asd:123})
			.then(res => {
				expect(res)
					.to.equal({ asd:123 });
			});

	});



	it('should request and get error', async () => {


		server.method('todo', {
			handler(ctx) {
				return Promise.reject(new Error('asd'));
			}
		});

		await expect(client.request('todo', {asd:123}))
			.to.reject(Error, 'asd');

	});



	it('server should respond with error if cmd not found', async () => {

		await expect(client.request('todo', {asd:123}))
			.to.reject(Error, 'Command not found');

	});





	it('should execute onPreSub ext registered as object', async () => {

		server.ext({
			type: 'preSub',
			method: async (config, ctx) => {
				ctx.auth = 123;
			}
		});


		server.topic('camp', {
			handler(ctx) {
				return rx.Observable.of({
					payload: ctx.payload,
					auth: ctx.auth
				});
			}
		});


		let res = await client.topic('camp', { asd:123 }).first().toPromise();

		expect(res)
			.to.equal({
				payload: { asd: 123},
				auth: 123
			});

	});



});
