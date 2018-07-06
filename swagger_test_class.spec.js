const expect = require('chai').expect;
const sinon = require('sinon');
const supertest = require('supertest');
const mock = require('mock-require');

mock('supertest', {
    agent: (...param) => {
        console.log('supertest mocked')
    }
})
const simple_swagger_test = require('./swagger_test_class');


describe('The appendQueryParameterTo function', () => {
    const appendQueryParameterTo = simple_swagger_test.__appendQueryParameterTo;
    const testBaseUri = 'http://google.com';
    const testBaseUriWithQuery = 'http://google.com?temp=null';
    it('appends an optional parameter with ? if a query parameter doesn\'t exists already', (done) => {
        const expectedResult = 'http://google.com?addedparam=true';
        expect(appendQueryParameterTo(testBaseUri, '?addedparam=true')).to.be.equal(expectedResult);
        expect(appendQueryParameterTo(testBaseUri, 'addedparam=true')).to.be.equal(expectedResult);
        done();
    });
    it('appends an optional parameter with & if a query parameter already exists', (done) => {
        const expectedResult = 'http://google.com?temp=null&addedparam=true';
        expect(appendQueryParameterTo(testBaseUriWithQuery, '?addedparam=true')).to.be.equal(expectedResult);
        expect(appendQueryParameterTo(testBaseUriWithQuery, 'addedparam=true')).to.be.equal(expectedResult);
        done();
    });
});

describe('  ', () => {

});