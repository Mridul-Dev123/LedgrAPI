import assert from 'node:assert/strict';
import test from 'node:test';

import Joi from 'joi';

import validate from '../middleware/validate.js';

const mockSchemaMap = {
  body: Joi.object({
    username: Joi.string().required(),
    age: Joi.number().integer(),
  }),
};

test('validate middleware calls next and converts data types when validation passes', () => {
  const req = {
    body: {
      username: 'testuser',
      age: '25',
    },
  };

  let nextCallCount = 0;
  let nextArg;
  const next = (error) => {
    nextCallCount += 1;
    nextArg = error;
  };

  const middleware = validate(mockSchemaMap);
  middleware(req, {}, next);

  assert.equal(nextCallCount, 1);
  assert.equal(nextArg, undefined);
  assert.equal(req.body.age, 25);
});

test('validate middleware calls next with an ApiError when validation fails', () => {
  const req = {
    body: {
      age: 25,
    },
  };

  let nextCallCount = 0;
  let nextArg;
  const next = (error) => {
    nextCallCount += 1;
    nextArg = error;
  };

  const middleware = validate(mockSchemaMap);
  middleware(req, {}, next);

  assert.equal(nextCallCount, 1);
  assert.equal(nextArg.statusCode, 400);
  assert.equal(nextArg.message, 'Invalid request body');
  assert.equal(nextArg.errors[0].field, 'username');
});
