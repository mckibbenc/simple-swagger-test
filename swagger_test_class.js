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

function createEndpoint(path, parameters, responseExamples, queryParam) {
  let endpoint = path;
  if (responseExamples.path) {
    endpoint = responseExamples.path;
  } else if (path.includes('{')) {
    parameters.forEach((param) => {
      if (param.in === 'path') {
        endpoint = endpoint.replace(`{${param.name}}`, param.example);
      }
    });
  }
  if (responseExamples.query) {
    endpoint += responseExamples.query;
  }
  if (queryParam) {
    endpoint += queryParam.example;
  }
  return endpoint;
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
          const ctRequest = buildCtRequest(swaggerSpec, method, p, m, r, null);
          const ctResponse = buildCtResponse(response, r, null);
          tests.push(new ComponentTest(ctRequest, ctResponse));
          m.parameters.forEach((param) => {
            if (param.example && param.in === 'query' && response === '200') {
              const ctRequest = buildCtRequest(swaggerSpec, method, p, m, r, param);
              const ctResponse = buildCtResponse(response, r, param);
              tests.push(new ComponentTest(ctRequest, ctResponse));
            }
          });
        }
      });
    });
  });

  return tests;
}

function buildCtRequest(swaggerSpec, method, p, m, r, param) {
  const ctRequest = new Request();
  ctRequest.basePath = swaggerSpec.basePath;
  ctRequest.endpoint = createEndpoint(p, m.parameters, r.examples, param);
  ctRequest.method = method.toLowerCase();
  if (param) {
    ctRequest.description = m.description + ` with ${param.name} specified`;
  } else {
    ctRequest.description = m.description;
  }
  ctRequest.headers = { 'Content-Type': 'application/json', Authorization: 'none' }; // standard headers
  return ctRequest;
}

function buildCtResponse(response, r, param) {
  const ctResponse = new Response();
  ctResponse.status = parseInt(response, 10);
  ctResponse.description = r.description;
  ctResponse.exampleRequest = r.examples.request;
  if (param) {
    if (param.response) {
      ctResponse.responseBody = param.response;
    }else {
      ctResponse.responseBody = r.examples.response;
    }
  } else {
    ctResponse.responseBody = r.examples.response;
  }
  return ctResponse;
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

function handlePlaceholders(actualValue, expectedValue) {
  if (expectedValue === '${number}') {
    if (typeof actualValue === 'number') {
      return actualValue;
    } else {
      throw `${actualValue} has Invalid type`;
    }
  }
  if (expectedValue === '${string}') {
    if (typeof actualValue === 'string') {
      return actualValue;
    } else {
      throw `${actualValue} has Invalid type`;
    }

  }
  if (expectedValue === '${boolean}') {
    if (typeof actualValue === 'boolean') {
      return actualValue;
    } else {
      throw `${actualValue} has Invalid type`;
    }
  }
  return expectedValue;
}

exports.ComponentTest = ComponentTest;
exports.parseSpec = parseSpec;
