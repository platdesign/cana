'use strict';


const Code = require('code');
const expect = Code.expect;
const Server = require('../server');
const Client = require('../client');
const http = require('http');
const { Observable } = require('rx');


const delay = async (time=0) => new Promise(resolve => setTimeout(resolve, time));




describe('Server', () => {


	describe('ext', () => {

		it('should register from object', () => {

			let server = new Server();

			let lengthBefore = server._exts.length;

			let e = {
				type: 'preSub',
				method: () => true
			};

			server.ext(e);

			expect(server._exts[lengthBefore])
				.to.equal(e);

		});


		it('should register by name and method', () => {

			let server = new Server();

			let lengthBefore = server._exts.length;

			let e = {
				type: 'preSub',
				method: () => true
			};

			server.ext(e.type, e.method);

			expect(server._exts[lengthBefore])
				.to.equal(e);

		});



		it('should throw error on unknown type', () => {

			let server = new Server();

			expect(() => server.ext('unknown', () => true))
				.to.throw(Error);

		});

	});


});
