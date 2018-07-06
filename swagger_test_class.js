const expect = require('chai').expect;
const agent = require('supertest').agent(require('../../app.js'));

function _post(request, response) {
  it(`${request.description} with status of ${response.status}: ${response.description}`, function (done) {
    agent.post(request.path)
      .set(request.headers)
      .send(response.exampleRequest)
      .end(function (err, res) {
        expect(res.statusCode).to.be.equal(response.status);
        response.responseBody = buildExpectedResponse(res.body, response.responseBody);
        expect(res.body).to.deep.equal(response.responseBody);
        done();
      });
  });
}

function _get(request, response) {
  it(`${request.description} with status of ${response.status}: ${response.description}`, function (done) {
    agent.get(request.path)
      .set(request.headers)
      .end(function (err, res) {
        expect(res.statusCode).to.be.equal(response.status);
        response.responseBody = buildExpectedResponse(res.body, response.responseBody);
        expect(res.body).to.deep.equal(response.responseBody);
        done();
      });
  });
}

function _patch(request, response) {
  it(`${request.description} with status of ${response.status}: ${response.description}`, function (done) {
    agent.patch(request.path)
      .set(request.headers)
      .send(response.exampleRequest)
      .end(function (err, res) {
        expect(res.statusCode).to.be.equal(response.status);
        response.responseBody = buildExpectedResponse(res.body, response.responseBody);
        expect(res.body).to.deep.equal(response.responseBody);
        done();
      });
  });
}

function _put(request, response) {
  it(`${request.description} with status of ${response.status}: ${response.description}`, function (done) {
    agent.put(request.path)
      .set(request.headers)
      .send(response.exampleRequest)
      .end(function (err, res) {
        expect(res.statusCode).to.be.equal(response.status);
        response.responseBody = buildExpectedResponse(res.body, response.responseBody);
        expect(res.body).to.deep.equal(response.responseBody);
        done();
      });
  });
}

function _delete(request, response) {
  it(`${request.description} with status of ${response.status}: ${response.description}`, function (done) {
    agent.delete(request.path)
      .set(request.headers)
      .end(function (err, res) {
        expect(res.statusCode).to.be.equal(response.status);
        expect(res.body).to.deep.equal(response.responseBody);
        done();
      });
  });
}

class ComponentTest {
  constructor(request, response) {
    this.request = request;
    this.response = response;
  }

  runTest() {
    switch (this.request.method) {
      case 'post':
        _post(this.request, this.response);
        break;
      case 'get':
        _get(this.request, this.response);
        break;
      case 'patch':
        _patch(this.request, this.response);
        break;
      case 'put':
        _put(this.request, this.response)
        break;
      case 'delete':
        _delete(this.request, this.response);
        break;
      default:
        console.log(`Invalid REST method: ${this.request.method}`);
    }
  }
}

class Request {
  constructor() {
    this.basePath;
    this.endpoint;
    this.method;
    this.description;
    this.headers;
  }

  get path() {
    return this.basePath + this.endpoint;
  }
}

class Response {
  constructor() {
    this.status;
    this.description;
    this.exampleRequest;
    this.responseBody;
  }
}

function createEndpoint(path, parameters, responseExamples) {
  let endpoint = path;
  if (responseExamples.path) {
    endpoint = responseExamples.path;
  } else if (path.includes('{')) {
    parameters.forEach((param) => {
      if (param.in === 'path') {
        endpoint = endpoint.replace(`{${param.name}}`, param.example);
      }
      if (param.in === 'query' && param.required) {
        endpoint = appendQueryParameterTo(endpoint, param.example);
      }
    });
  }
  if (responseExamples.query) {
    endpoint += responseExamples.query;
  }
  return endpoint;
}

function appendQueryParameterTo(baseEndpoint, queryParam) {
  queryParam.replace('?','');
  if (baseEndpoint.includes('?')) {
    return baseEndpoint + '&' + queryParam;
  } else {
    return baseEndpoint + '?' + queryParam;
  }
}

function parseSpec(swaggerSpec) {
  const tests = [];
  Object.keys(swaggerSpec.paths).forEach(function (p) {
    const path = swaggerSpec.paths[p];
    Object.keys(path).forEach(function (method) {
      const m = path[method];
      Object.keys(m.responses).forEach(function (response) {
        const r = m.responses[response];
        if (response !== '401' && response !== '500') {
          const ctRequest = new Request();
          ctRequest.basePath = swaggerSpec.basePath;
          ctRequest.endpoint = createEndpoint(p, m.parameters, r.examples);
          ctRequest.method = method.toLowerCase();
          ctRequest.description = m.description;
          ctRequest.headers = { 'Content-Type': 'application/json', Authorization: 'none' }; // standard headers
          const ctResponse = new Response();
          ctResponse.status = parseInt(response, 10);
          ctResponse.description = r.description;
          ctResponse.exampleRequest = r.examples.request;
          ctResponse.responseBody = r.examples.response;
          tests.push(new ComponentTest(ctRequest, ctResponse));
          let queryParamsForMethod = extractQueryParametersWithExamplesForMethod(response, m.parameters)
          if (queryParamsForMethod.length > 0 ) {
            setResponsesForQueryParameters(queryParamsForMethod, r.examples);
            queryParamsForMethod = queryParamsForMethod.filter( element => {return (element.response)});
            for (queryParam of queryParamsForMethod) {
              const queryRequest = new Request();
              const queryResponse = new Response();
              Object.assign(queryRequest, ctRequest);
              Object.assign(queryResponse, ctResponse);
              queryRequest.endpoint = appendQueryParameterTo(createEndpoint(p, m.parameters, r.examples), baseEndpoint);
              queryResponse.description = r.description + ` with ${queryParam.name} query parameter`;
              queryResponse.responseBody = queryParam.response;
              tests.push(new ComponentTest(queryRequest, queryResponse));
            }
          }
        }
      });
    });
  });

  return tests;
}

function buildExpectedResponse(actualResponseBody, expectedResponseBody) {
  for (var key in expectedResponseBody) {
    if (typeof expectedResponseBody[key] === 'object' && expectedResponseBody[key] && actualResponseBody[key]) {
      expectedResponseBody[key] = buildExpectedResponse(actualResponseBody[key], expectedResponseBody[key]);
    } else if (Array.isArray(expectedResponseBody[key]) && actualResponseBody[key] && Array.isArray(actualResponseBody[key])) {
      expectedResponseBody[key] = buildExpectedResponse(actualResponseBody[key], expectedResponseBody[key]);
    } else {
      expectedResponseBody[key] = handlePlaceholders(actualResponseBody[key], expectedResponseBody[key]);
    }
  }
  return expectedResponseBody;
}

function  handlePlaceholders( actualValue, expectedValue) {
  if (expectedValue === '${number}') {
    if (typeof  actualValue === 'number') {
      return  actualValue;
    } else {
      throw `${ actualValue} has Invalid type`;
    }
  }
  if (expectedValue === '${string}') {
    if (typeof  actualValue === 'string') {
      return  actualValue;
    } else {
      throw `${ actualValue} has Invalid type`;
    }

  }
  if (expectedValue === '${boolean}') {
    if (typeof  actualValue === 'boolean') {
      return  actualValue;
    } else {
      throw `${ actualValue} has Invalid type`;
    }
  }
  return expectedValue;
}

const  extractQueryParametersWithExamplesForMethod = (method, parameterArray) => {
  const queryParamsWithExamples = parameterArray.filter( (element) => { return ( element.in === 'query' && element.examples )});
  const methodExamples = [];
  for (object of queryParamsWithExamples ) {
    if (object.examples[method]) {
      methodExamples.push({ name: object.name, query: object.examples[method] })
    }
  }
  return methodExamples;
}

const setResponsesForQueryParameters = (queryParams, responses) => {
  for (queryParam of queryParams) {
    if (responses[`response_${queryParam.name}`]) {
      queryParam.response = responses[`response_${queryParam.name}`];
    }
  }
}

exports.ComponentTest = ComponentTest;
exports.parseSpec = parseSpec;
